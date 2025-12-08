#include <getopt.h>
#include <signal.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#include "Config/DEV_Config.h"
#include "Debug.h"
#include "EPD_2in13_V4.h"
#include "GUI/GUI_Paint.h"
#include "Fonts/fonts.h"

#define SCREEN_WIDTH EPD_2in13_V4_WIDTH   // 122
#define SCREEN_HEIGHT EPD_2in13_V4_HEIGHT // 250
#define STATE_FILE "/tmp/jarvis_state.txt"
#define MAX_MESSAGE_LENGTH 256
#define MAX_MESSAGES 2 // topbar and main only

typedef enum { LAYOUT_TOPBAR, LAYOUT_MAIN } layout_t;

typedef enum { MODE_LIGHT, MODE_DARK } display_mode_t;

typedef struct {
  char text[MAX_MESSAGE_LENGTH];
  bool active;
} message_slot_t;

typedef struct {
  bool screen_on;
  display_mode_t mode;
  message_slot_t messages[MAX_MESSAGES]; // topbar, main
} device_state_t;

UBYTE *BlackImage = NULL;
device_state_t device_state = {false, MODE_LIGHT, {{"", false}, {"", false}}};

// Static variable to track previous display mode for partial refresh
// optimization
static display_mode_t previous_mode = MODE_LIGHT;
static bool screen_initialized = false;

// Function declarations
void display_all_messages_with_refresh_type(bool force_full_refresh);

void print_usage(const char *program_name) {
  printf("Usage: %s [OPTIONS]\n", program_name);
  printf("Options:\n");
  printf("  --on                    Turn screen on\n");
  printf("  --off                   Turn screen off\n");
  printf("  --light                 Switch to light mode\n");
  printf("  --dark                  Switch to dark mode\n");
  printf("  --message <text>        Send message to screen\n");
  printf("  --layout <topbar|main>  Message layout (default: main)\n");
  printf("  --clear <topbar|main|all>  Clear message(s)\n");
  printf("  --stdin                 Read message from stdin/pipe\n");
  printf("  --help                  Show this help message\n");
  printf("\nExamples:\n");
  printf("  %s --on\n", program_name);
  printf("  %s --message \"Hello World\"\n", program_name);
  printf("  %s --message \"Status Update\" --layout topbar\n", program_name);
  printf("  %s --dark --message \"Dark mode message\"\n", program_name);
  printf("  %s --clear all\n", program_name);
  printf("  echo \"Counter: 42\" | %s --stdin --layout topbar\n", program_name);
  printf("  date | %s --stdin --layout topbar\n", program_name);
}

void save_state() {
  FILE *fp = fopen(STATE_FILE, "w");
  if (fp) {
    fprintf(fp, "screen_on=%d\n", device_state.screen_on);
    fprintf(fp, "mode=%d\n", device_state.mode);
    for (int i = 0; i < MAX_MESSAGES; i++) {
      fprintf(fp, "message_%d_active=%d\n", i, device_state.messages[i].active);
      fprintf(fp, "message_%d_text=%s\n", i, device_state.messages[i].text);
    }
    fclose(fp);
  }
}

void load_state() {
  FILE *fp = fopen(STATE_FILE, "r");
  if (fp) {
    char line[512];
    while (fgets(line, sizeof(line), fp)) {
      if (strncmp(line, "screen_on=", 10) == 0) {
        device_state.screen_on = atoi(line + 10);
      } else if (strncmp(line, "mode=", 5) == 0) {
        device_state.mode = atoi(line + 5);
      } else if (strncmp(line, "message_", 8) == 0) {
        int slot = line[8] - '0';
        // Only load slots that exist in our current layout system (topbar,
        // main)
        if (slot >= 0 && slot < MAX_MESSAGES) {
          if (strstr(line, "_active=") != NULL) {
            device_state.messages[slot].active = atoi(strchr(line, '=') + 1);
          } else if (strstr(line, "_text=") != NULL) {
            char *text_start = strchr(line, '=') + 1;
            char *newline = strchr(text_start, '\n');
            if (newline)
              *newline = '\0';
            strncpy(device_state.messages[slot].text, text_start,
                    MAX_MESSAGE_LENGTH - 1);
            device_state.messages[slot].text[MAX_MESSAGE_LENGTH - 1] = '\0';
          }
        }
        // Ignore any old layout data (slot >= MAX_MESSAGES)
      }
    }
    fclose(fp);
  }
}

void cleanup_screen() {
  if (BlackImage) {
    Paint_SelectImage(BlackImage);
    Paint_Clear(device_state.mode == MODE_LIGHT ? WHITE : BLACK);
    EPD_2in13_V4_Display_Base(BlackImage);
    EPD_2in13_V4_Sleep();
    free(BlackImage);
    BlackImage = NULL;
  }
}

bool ensure_screen_initialized() {
  if (BlackImage)
    return true; // Already initialized

  if (!device_state.screen_on)
    return false;

  // Try to initialize the device if screen should be on
  if (DEV_Module_Init() != 0) {
    fprintf(stderr, "Failed to initialize device module\n");
    return false;
  }

  EPD_2in13_V4_Init_Fast();
  EPD_2in13_V4_Clear();

  UWORD Imagesize =
      ((EPD_2in13_V4_WIDTH % 8 == 0) ? (EPD_2in13_V4_WIDTH / 8)
                                     : (EPD_2in13_V4_WIDTH / 8 + 1)) *
      EPD_2in13_V4_HEIGHT;

  if ((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
    Debug("Failed to allocate memory for BlackImage...\r\n");
    return false;
  }

  Paint_NewImage(BlackImage, SCREEN_WIDTH, SCREEN_HEIGHT, ROTATE_90,
                 device_state.mode == MODE_LIGHT ? WHITE : BLACK);
  Paint_SelectImage(BlackImage);
  Paint_Clear(device_state.mode == MODE_LIGHT ? WHITE : BLACK);

  // Reset screen initialization state since we just created a new screen buffer
  screen_initialized = false;
  previous_mode = device_state.mode;

  return true;
}

void display_all_messages() {
  display_all_messages_with_refresh_type(false); // Default to partial refresh
}

void display_all_messages_with_refresh_type(bool force_full_refresh) {
  if (!ensure_screen_initialized()) {
    return;
  }

  // Determine if we need full refresh or can use partial
  bool use_partial_refresh = false;
  bool mode_changed = (previous_mode != device_state.mode);

  if (!force_full_refresh && screen_initialized && !mode_changed) {
    use_partial_refresh = true;
    printf("Using partial refresh for text update\n");
  } else {
    printf(
        "Using full refresh (force: %s, mode_changed: %s, screen_init: %s)\n",
        force_full_refresh ? "yes" : "no", mode_changed ? "yes" : "no",
        screen_initialized ? "yes" : "no");
  }

  // Update previous mode
  previous_mode = device_state.mode;
  screen_initialized = true;

  // Clear screen
  Paint_Clear(device_state.mode == MODE_LIGHT ? WHITE : BLACK);

  // Available fonts in order of preference:
  // {&Font24, &Font20, &Font16, &Font12, &Font8};
  sFONT *fonts[] = {&Font20, &Font16, &Font12, &Font8};
  int num_fonts = sizeof(fonts) / sizeof(fonts[0]);

  // Draw each active message
  for (int i = 0; i < MAX_MESSAGES; i++) {
    if (!device_state.messages[i].active ||
        strlen(device_state.messages[i].text) == 0) {
      continue;
    }

    layout_t layout = (layout_t)i;
    const char *message = device_state.messages[i].text;
    int msg_len = strlen(message);

    // Find the best font that fits without truncation
    sFONT *selected_font = NULL;
    char display_lines[10][MAX_MESSAGE_LENGTH]; // Allow up to 10 lines
    int num_lines = 0;

    // Initialize display_lines
    for (int line = 0; line < 10; line++) {
      display_lines[line][0] = '\0';
    }

    // Calculate available height based on layout
    int available_height;
    switch (layout) {
    case LAYOUT_TOPBAR:
      // Minimal space for topbar - just one line with small margin
      available_height = 20;
      break;
    case LAYOUT_MAIN:
    default:
      // Main content gets almost all remaining space
      // SCREEN_WIDTH is 122, topbar needs ~22px, so main gets ~97px
      available_height =
          SCREEN_WIDTH - 25; // Minimal margins, maximum content space
      break;
    }

    // Try each font from largest to smallest
    for (int f = 0; f < num_fonts; f++) {
      sFONT *font = fonts[f];
      int char_width = font->Width;
      int char_height = font->Height;
      int available_width = SCREEN_HEIGHT; // Use full screen width without margin
      int chars_per_line = available_width / char_width;

      if (chars_per_line < 5)
        continue; // Font too large, need at least 5 chars

      // Calculate max lines that fit with this font
      int max_lines = available_height / char_height;
      if (max_lines > 10)
        max_lines = 10; // Limit to our array size
      if (max_lines < 1)
        max_lines = 1;

      // Try to word-wrap the message with this font
      num_lines = 0;
      int pos = 0;
      bool fits = true;

      // Be more aggressive about using multiple lines
      while (pos < msg_len && num_lines < max_lines && fits) {
        int line_start = pos;
        int line_end = pos + chars_per_line;

        // If this would go past the end of the message, just take the rest
        if (line_end >= msg_len) {
          line_end = msg_len;
        } else {
          // Look for a good break point (space, comma, period)
          int best_break = line_end;

          // Look backwards for a good break point
          for (int j = line_end - 1; j >= line_start; j--) {
            if (j < msg_len &&
                (message[j] == ' ' || message[j] == ',' || message[j] == '.' ||
                 message[j] == ';' || message[j] == '!' || message[j] == '?')) {
              best_break = j;
              break;
            }
          }

          // If we found a good break point, use it
          // But don't break too early (at least 60% of line should be used)
          if (best_break > line_start &&
              (best_break - line_start) >= (chars_per_line * 0.6)) {
            line_end = best_break;
          }
          // Otherwise, just break at character limit (hard break)
        }

        // Copy the line (safely)
        int line_len = line_end - line_start;
        if (line_len >= MAX_MESSAGE_LENGTH)
          line_len = MAX_MESSAGE_LENGTH - 1;
        if (line_len > 0) {
          strncpy(display_lines[num_lines], message + line_start, line_len);
          display_lines[num_lines][line_len] = '\0';

          // Trim leading spaces
          char *src = display_lines[num_lines];
          while (*src == ' ')
            src++;
          if (src != display_lines[num_lines]) {
            strcpy(display_lines[num_lines], src);
          }

          num_lines++;
        } else {
          fits = false; // Something went wrong
          break;
        }

        pos = line_end;
        // Skip spaces and punctuation at line break
        while (pos < msg_len && (message[pos] == ' ' || message[pos] == ',' ||
                                 message[pos] == '.')) {
          pos++;
        }
      }

      // Check if we fit the entire message
      if (pos >= msg_len && fits) {
        selected_font = font;
        printf("Selected font %d for %d lines (layout: %s)\n", font->Height,
               num_lines, (layout == LAYOUT_TOPBAR) ? "topbar" : "main");
        break; // Found a font that works!
      }
    }

    // If no font worked, use the smallest font and truncate to available lines
    if (!selected_font) {
      selected_font = &Font8;
      int char_width = selected_font->Width;
      int char_height = selected_font->Height;
      int chars_per_line = SCREEN_HEIGHT / char_width; // Use full screen width
      int max_lines = available_height / char_height;

      if (max_lines > 10)
        max_lines = 10;
      if (max_lines < 1)
        max_lines = 1;

      // Try to fit as much as possible with smallest font
      num_lines = 0;
      int pos = 0;

      while (pos < msg_len && num_lines < max_lines) {
        int remaining = msg_len - pos;
        int line_len =
            (remaining > chars_per_line) ? chars_per_line : remaining;

        if (num_lines == max_lines - 1 && remaining > chars_per_line) {
          // Last line and there's more text - add ellipsis
          line_len = chars_per_line - 3;
          strncpy(display_lines[num_lines], message + pos, line_len);
          display_lines[num_lines][line_len] = '\0';
          strcat(display_lines[num_lines], "...");
        } else {
          strncpy(display_lines[num_lines], message + pos, line_len);
          display_lines[num_lines][line_len] = '\0';
        }

        num_lines++;
        pos += line_len;
      }

      printf("Warning: Using smallest font with %d lines for layout %s\n",
             num_lines, (layout == LAYOUT_TOPBAR) ? "topbar" : "main");
    }

    // Now draw the lines
    int char_height = selected_font->Height;
    int total_text_height = num_lines * char_height;

    // Calculate starting Y position based on layout
    int start_y;
    switch (layout) {
    case LAYOUT_TOPBAR:
      // Start at very top with minimal margin
      start_y = 2;
      break;
    case LAYOUT_MAIN:
    default:
      // Start right after topbar area with minimal gap
      int topbar_area = 22; // topbar space + tiny margin
      int remaining_height =
          SCREEN_WIDTH - topbar_area - 3; // Leave just 3px at bottom
      if (total_text_height < remaining_height) {
        // Center in the remaining space below topbar
        start_y = topbar_area + (remaining_height - total_text_height) / 2;
      } else {
        // Start right after topbar area
        start_y = topbar_area;
      }
      break;
    }

    // Ensure we don't go off screen
    if (start_y < 0)
      start_y = 0;
    if (start_y + total_text_height > SCREEN_WIDTH) {
      start_y = SCREEN_WIDTH - total_text_height;
    }

    // Draw each line
    UWORD bg_color = device_state.mode == MODE_LIGHT ? WHITE : BLACK;
    UWORD text_color = device_state.mode == MODE_LIGHT ? BLACK : WHITE;

    for (int line = 0; line < num_lines; line++) {
      if (strlen(display_lines[line]) == 0)
        continue;

      int char_width = selected_font->Width;
      int text_width = strlen(display_lines[line]) * char_width;

      // Calculate X position based on layout
      int x;
      if (layout == LAYOUT_TOPBAR) {
        // Right-aligned for topbar layout
        x = SCREEN_HEIGHT - text_width; // Remove horizontal margin
      } else {
        // Center-aligned for main layout
        x = (SCREEN_HEIGHT - text_width) / 2;
      }

      // Ensure text fits horizontally
      if (x < 0)
        x = 0;
      if (x + text_width > SCREEN_HEIGHT)
        x = SCREEN_HEIGHT - text_width;

      int y = start_y + (line * char_height);
      if (y >= 0 && y < SCREEN_WIDTH) {
        // Draw the text
        Paint_DrawString_EN(x, y, display_lines[line], selected_font, bg_color,
                            text_color);
      }
    }

    const char *layout_str = (layout == LAYOUT_TOPBAR) ? "topbar" : "main";
    printf("Displayed message: %d lines (layout: %s, font: %d, mode: %s)\n",
           num_lines, layout_str, selected_font->Height,
           device_state.mode == MODE_LIGHT ? "light" : "dark");

    // Print each line for debugging
    for (int line = 0; line < num_lines; line++) {
      printf("  Line %d: \"%s\"\n", line + 1, display_lines[line]);
    }
  }

  // Update display with appropriate refresh method
  if (use_partial_refresh) {
    EPD_2in13_V4_Display_Partial(BlackImage);
  } else {
    EPD_2in13_V4_Display_Base(BlackImage);
  }
}

void turn_screen_on() {
  if (device_state.screen_on) {
    printf("Screen is already on\n");
    return;
  }

  device_state.screen_on = true;
  save_state();

  if (ensure_screen_initialized()) {
    printf("Screen turned on\n");
    // Display any stored messages with full refresh for initial display
    display_all_messages_with_refresh_type(true);
  } else {
    printf("Failed to initialize screen\n");
    device_state.screen_on = false;
    save_state();
  }
}

void turn_screen_off() {
  if (!device_state.screen_on) {
    printf("Screen is already off\n");
    return;
  }

  cleanup_screen();
  device_state.screen_on = false;
  screen_initialized = false; // Reset screen state
  save_state();
  printf("Screen turned off\n");
}

void set_display_mode(display_mode_t mode) {
  display_mode_t old_mode = device_state.mode;
  device_state.mode = mode;
  save_state();
  printf("Display mode set to %s\n", mode == MODE_LIGHT ? "light" : "dark");

  if (device_state.screen_on) {
    // Force full refresh when mode changes
    display_all_messages_with_refresh_type(true);
  }
}

void clear_messages(const char *target) {
  if (strcmp(target, "all") == 0) {
    for (int i = 0; i < MAX_MESSAGES; i++) {
      device_state.messages[i].active = false;
      device_state.messages[i].text[0] = '\0';
    }
    printf("Cleared all messages\n");
  } else {
    layout_t layout;
    if (strcmp(target, "topbar") == 0) {
      layout = LAYOUT_TOPBAR;
    } else if (strcmp(target, "main") == 0) {
      layout = LAYOUT_MAIN;
    } else {
      fprintf(stderr, "Invalid clear target: %s. Use topbar, main, or all.\n",
              target);
      return;
    }

    // Bounds check
    if (layout >= 0 && layout < MAX_MESSAGES) {
      device_state.messages[layout].active = false;
      device_state.messages[layout].text[0] = '\0';
      printf("Cleared %s message\n", target);
    }
  }

  save_state();

  if (device_state.screen_on) {
    // Use partial refresh for clearing messages (just text update)
    display_all_messages();
  }
}

void display_message(const char *message, layout_t layout) {
  // Bounds check for layout
  if (layout < 0 || layout >= MAX_MESSAGES) {
    fprintf(stderr, "Invalid layout value: %d\n", layout);
    return;
  }

  // Store the message in the appropriate slot
  strncpy(device_state.messages[layout].text, message, MAX_MESSAGE_LENGTH - 1);
  device_state.messages[layout].text[MAX_MESSAGE_LENGTH - 1] = '\0';
  device_state.messages[layout].active = true;
  save_state();

  if (!device_state.screen_on) {
    const char *layout_str = (layout == LAYOUT_TOPBAR) ? "topbar" : "main";
    printf("Message saved (screen is off): \"%s\" (layout: %s)\n", message,
           layout_str);
    return;
  }

  // Display all messages on screen
  display_all_messages();
}

int main(int argc, char *argv[]) {
  if (argc < 2) {
    print_usage(argv[0]);
    return 1;
  }

  // Load previous state
  load_state();

  static struct option long_options[] = {{"on", no_argument, 0, 0},
                                         {"off", no_argument, 0, 1},
                                         {"light", no_argument, 0, 2},
                                         {"dark", no_argument, 0, 3},
                                         {"message", required_argument, 0, 4},
                                         {"layout", required_argument, 0, 5},
                                         {"clear", required_argument, 0, 6},
                                         {"help", no_argument, 0, 7},
                                         {"stdin", no_argument, 0, 8},
                                         {0, 0, 0, 0}};

  char *message = NULL;
  layout_t layout = LAYOUT_MAIN;
  bool message_set = false;
  bool read_stdin = false;

  int opt;
  int option_index = 0;

  while ((opt = getopt_long(argc, argv, "", long_options, &option_index)) !=
         -1) {
    switch (opt) {
    case 0: // --on
      turn_screen_on();
      break;
    case 1: // --off
      turn_screen_off();
      break;
    case 2: // --light
      set_display_mode(MODE_LIGHT);
      break;
    case 3: // --dark
      set_display_mode(MODE_DARK);
      break;
    case 4: // --message
      message = optarg;
      message_set = true;
      break;
    case 5: // --layout
      if (strcmp(optarg, "topbar") == 0) {
        layout = LAYOUT_TOPBAR;
      } else if (strcmp(optarg, "main") == 0) {
        layout = LAYOUT_MAIN;
      } else {
        fprintf(stderr, "Invalid layout: %s. Use topbar or main.\n", optarg);
        return 1;
      }
      break;
    case 6: // --clear
      clear_messages(optarg);
      break;
    case 7: // --help
      print_usage(argv[0]);
      return 0;
    case 8: // --stdin
      read_stdin = true;
      break;
    default:
      print_usage(argv[0]);
      return 1;
    }
  }

  // Handle stdin input
  if (read_stdin) {
    char input_buffer[MAX_MESSAGE_LENGTH];
    if (fgets(input_buffer, sizeof(input_buffer), stdin) != NULL) {
      // Remove trailing newline if present
      size_t len = strlen(input_buffer);
      if (len > 0 && input_buffer[len - 1] == '\n') {
        input_buffer[len - 1] = '\0';
      }

      if (strlen(input_buffer) > 0) {
        display_message(input_buffer, layout);
        message_set = true; // Prevent duplicate processing
      }
    }
  }

  // If message was provided via --message, display it
  if (message_set && message) {
    display_message(message, layout);
  }

  return 0;
}
