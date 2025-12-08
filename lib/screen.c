#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Config/DEV_Config.h"
#include "Debug.h"
#include "EPD_2in13_V4.h"
#include "Fonts/fonts.h"
#include "GUI/GUI_Paint.h"
#include "screen.h"

#define SCREEN_WIDTH EPD_2in13_V4_WIDTH   // 122
#define SCREEN_HEIGHT EPD_2in13_V4_HEIGHT // 250
#define MAX_MESSAGE_LENGTH 256

#define TOP_MARGIN 2
#define BOTTOM_MARGIN 3

static UBYTE *BlackImage = NULL;
static bool screen_on = false;

static const sFONT *choose_font(int requested_height) {
  const sFONT *fonts[] = {&Font20, &Font16, &Font12, &Font8};
  if (requested_height <= 0) {
    return &Font16;
  }
  const sFONT *best = fonts[0];
  int best_diff = abs(fonts[0]->Height - requested_height);
  for (size_t i = 1; i < sizeof(fonts) / sizeof(fonts[0]); ++i) {
    int diff = abs(fonts[i]->Height - requested_height);
    if (diff < best_diff) {
      best_diff = diff;
      best = fonts[i];
    }
  }
  return best;
}

static bool init_framebuffer(void) {
  if (BlackImage) {
    return true;
  }

  UWORD image_size =
      ((SCREEN_WIDTH % 8 == 0) ? (SCREEN_WIDTH / 8)
                               : (SCREEN_WIDTH / 8 + 1)) *
      SCREEN_HEIGHT;

  BlackImage = (UBYTE *)malloc(image_size);
  if (!BlackImage) {
    Debug("Failed to allocate framebuffer\n");
    return false;
  }

  Paint_NewImage(BlackImage, SCREEN_WIDTH, SCREEN_HEIGHT, ROTATE_90, WHITE);
  Paint_SelectImage(BlackImage);
  Paint_Clear(WHITE);
  return true;
}

bool screen_turn_on(void) {
  if (screen_on) {
    return true;
  }

  if (DEV_Module_Init() != 0) {
    fprintf(stderr, "Failed to initialize device module\n");
    return false;
  }

  EPD_2in13_V4_Init_Fast();
  EPD_2in13_V4_Clear();

  if (!init_framebuffer()) {
    DEV_Module_Exit();
    return false;
  }

  screen_on = true;
  return true;
}

void screen_turn_off(void) {
  if (!screen_on) {
    return;
  }

  if (BlackImage) {
    Paint_SelectImage(BlackImage);
    Paint_Clear(WHITE);
    EPD_2in13_V4_Display_Base(BlackImage);
    EPD_2in13_V4_Sleep();
    free(BlackImage);
    BlackImage = NULL;
  }

  DEV_Module_Exit();
  screen_on = false;
}

static void truncate_to_width(char *dest, size_t dest_size, const char *src,
                              const sFONT *font) {
  size_t len = strlen(src);
  int char_width = font->Width;
  int max_chars = SCREEN_HEIGHT / char_width;

  if ((int)len <= max_chars) {
    strncpy(dest, src, dest_size - 1);
    dest[dest_size - 1] = '\0';
    return;
  }

  int copy_chars = max_chars - 3; // leave room for "..."
  if (copy_chars < 0)
    copy_chars = 0;
  if ((size_t)copy_chars >= dest_size)
    copy_chars = (int)dest_size - 1;
  strncpy(dest, src, copy_chars);
  dest[copy_chars] = '\0';
  strncat(dest, "...", dest_size - strlen(dest) - 1);
}

bool screen_paint(const char **lines, int line_count, int font_height) {
  const sFONT *font = choose_font(font_height);
  if (line_count <= 0) {
    fprintf(stderr, "paint: no lines provided\n");
    return false;
  }

  if (!screen_on && !screen_turn_on()) {
    return false;
  }
  if (!init_framebuffer()) {
    return false;
  }

  Paint_SelectImage(BlackImage);
  Paint_Clear(WHITE);

  int content_height = SCREEN_WIDTH - TOP_MARGIN - BOTTOM_MARGIN;
  int slot_height = content_height / line_count;
  if (slot_height <= 0) {
    fprintf(stderr, "paint: too many lines to fit on screen\n");
    return false;
  }

  UWORD bg = WHITE;
  UWORD fg = BLACK;

  for (int i = 0; i < line_count; ++i) {
    char rendered[MAX_MESSAGE_LENGTH] = {0};
    truncate_to_width(rendered, sizeof(rendered), lines[i], font);

    int text_width = (int)strlen(rendered) * font->Width;
    int y_slot_start = TOP_MARGIN + i * slot_height;
    int y = y_slot_start + (slot_height - font->Height) / 2;
    if (y < TOP_MARGIN)
      y = TOP_MARGIN;
    if (y + font->Height > SCREEN_WIDTH - BOTTOM_MARGIN) {
      y = SCREEN_WIDTH - BOTTOM_MARGIN - font->Height;
    }

    int x = (SCREEN_HEIGHT - text_width) / 2;
    if (x < 0)
      x = 0;

    Paint_DrawString_EN(x, y, rendered, font, bg, fg);
  }

  EPD_2in13_V4_Display_Partial(BlackImage);
  return true;
}
