#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <stdbool.h>
#include <getopt.h>
#include <time.h>

#include "DEV_Config.h"
#include "Debug.h"
#include "GUI_Paint.h"
#include "fonts.h"
#include "EPD_2in13_V4.h"

#define SCREEN_WIDTH EPD_2in13_V4_WIDTH   // 122
#define SCREEN_HEIGHT EPD_2in13_V4_HEIGHT // 250
#define STATE_FILE "/tmp/jarvis_state.txt"
#define MAX_MESSAGE_LENGTH 256

typedef enum {
    LAYOUT_TOP,
    LAYOUT_CENTER,
    LAYOUT_BOTTOM
} layout_t;

typedef enum {
    MODE_LIGHT,
    MODE_DARK
} display_mode_t;

typedef struct {
    bool screen_on;
    display_mode_t mode;
    char last_message[MAX_MESSAGE_LENGTH];
    layout_t last_layout;
    bool has_message;
} device_state_t;

UBYTE *BlackImage = NULL;
device_state_t device_state = {false, MODE_LIGHT, "", LAYOUT_CENTER, false};

void print_usage(const char *program_name) {
    printf("Usage: %s [OPTIONS]\n", program_name);
    printf("Options:\n");
    printf("  --on                    Turn screen on\n");
    printf("  --off                   Turn screen off\n");
    printf("  --light                 Switch to light mode\n");
    printf("  --dark                  Switch to dark mode\n");
    printf("  --message <text>        Send message to screen\n");
    printf("  --layout <top|center|bottom>  Message layout (default: center)\n");
    printf("  --help                  Show this help message\n");
    printf("\nExamples:\n");
    printf("  %s --on\n", program_name);
    printf("  %s --message \"Hello World\"\n", program_name);
    printf("  %s --message \"Status Update\" --layout top\n", program_name);
    printf("  %s --dark --message \"Dark mode message\"\n", program_name);
}

void save_state() {
    FILE *fp = fopen(STATE_FILE, "w");
    if (fp) {
        fprintf(fp, "screen_on=%d\n", device_state.screen_on);
        fprintf(fp, "mode=%d\n", device_state.mode);
        fprintf(fp, "has_message=%d\n", device_state.has_message);
        fprintf(fp, "last_layout=%d\n", device_state.last_layout);
        fprintf(fp, "last_message=%s\n", device_state.last_message);
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
            } else if (strncmp(line, "has_message=", 12) == 0) {
                device_state.has_message = atoi(line + 12);
            } else if (strncmp(line, "last_layout=", 12) == 0) {
                device_state.last_layout = atoi(line + 12);
            } else if (strncmp(line, "last_message=", 13) == 0) {
                // Remove newline and copy message
                char *newline = strchr(line + 13, '\n');
                if (newline) *newline = '\0';
                strncpy(device_state.last_message, line + 13, MAX_MESSAGE_LENGTH - 1);
                device_state.last_message[MAX_MESSAGE_LENGTH - 1] = '\0';
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

void init_screen() {
    if (BlackImage) return; // Already initialized
    
    EPD_2in13_V4_Init_Fast();
    EPD_2in13_V4_Clear();

    UWORD Imagesize = ((EPD_2in13_V4_WIDTH % 8 == 0) ? (EPD_2in13_V4_WIDTH / 8) : (EPD_2in13_V4_WIDTH / 8 + 1)) * EPD_2in13_V4_HEIGHT;

    if ((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
        Debug("Failed to allocate memory for BlackImage...\r\n");
        exit(-1);
    }

    Paint_NewImage(BlackImage, SCREEN_WIDTH, SCREEN_HEIGHT, ROTATE_90, 
                   device_state.mode == MODE_LIGHT ? WHITE : BLACK);
    Paint_SelectImage(BlackImage);
    Paint_Clear(device_state.mode == MODE_LIGHT ? WHITE : BLACK);
}

void display_stored_message() {
    if (!device_state.has_message || strlen(device_state.last_message) == 0) {
        return;
    }
    
    if (!BlackImage) {
        fprintf(stderr, "Screen not properly initialized\n");
        return;
    }
    
    printf("Displaying stored message: \"%s\" (layout: %s)\n", 
           device_state.last_message, 
           (device_state.last_layout == LAYOUT_TOP) ? "top" : 
           (device_state.last_layout == LAYOUT_BOTTOM) ? "bottom" : "center");
    
    // Clear screen
    Paint_Clear(device_state.mode == MODE_LIGHT ? WHITE : BLACK);
    
    // Select appropriate font
    sFONT *font = &Font16;
    
    // Calculate text dimensions
    int char_width = font->Width;
    int char_height = font->Height;
    int text_width = strlen(device_state.last_message) * char_width;
    
    // Calculate position based on layout
    int x, y;
    
    switch (device_state.last_layout) {
        case LAYOUT_TOP:
            x = (SCREEN_HEIGHT - text_width) / 2;
            y = 10;
            break;
        case LAYOUT_BOTTOM:
            x = (SCREEN_HEIGHT - text_width) / 2;
            y = SCREEN_WIDTH - char_height - 10;
            break;
        case LAYOUT_CENTER:
        default:
            x = (SCREEN_HEIGHT - text_width) / 2;
            y = (SCREEN_WIDTH - char_height) / 2;
            break;
    }
    
    // Ensure text fits on screen
    if (x < 0) x = 0;
    if (x + text_width > SCREEN_HEIGHT) x = SCREEN_HEIGHT - text_width;
    if (y < 0) y = 0;
    if (y + char_height > SCREEN_WIDTH) y = SCREEN_WIDTH - char_height;
    
    // Draw text with appropriate colors for the mode
    UWORD bg_color = device_state.mode == MODE_LIGHT ? WHITE : BLACK;
    UWORD text_color = device_state.mode == MODE_LIGHT ? BLACK : WHITE;
    
    Paint_DrawString_EN(x, y, device_state.last_message, font, bg_color, text_color);
    
    // Update display
    EPD_2in13_V4_Display_Base(BlackImage);
}

void turn_screen_on() {
    if (device_state.screen_on) {
        printf("Screen is already on\n");
        return;
    }
    
    if (DEV_Module_Init() != 0) {
        fprintf(stderr, "Failed to initialize device module\n");
        exit(-1);
    }
    
    init_screen();
    device_state.screen_on = true;
    save_state();
    printf("Screen turned on\n");
    
    // Display stored message if available
    display_stored_message();
}

void turn_screen_off() {
    if (!device_state.screen_on) {
        printf("Screen is already off\n");
        return;
    }
    
    cleanup_screen();
    device_state.screen_on = false;
    save_state();
    printf("Screen turned off\n");
}

void set_display_mode(display_mode_t mode) {
    device_state.mode = mode;
    save_state();
    printf("Display mode set to %s\n", mode == MODE_LIGHT ? "light" : "dark");
    
    if (device_state.screen_on && BlackImage) {
        // Refresh screen with new mode and redisplay message if available
        Paint_Clear(mode == MODE_LIGHT ? WHITE : BLACK);
        if (device_state.has_message) {
            display_stored_message();
        } else {
            EPD_2in13_V4_Display_Base(BlackImage);
        }
    }
}

void display_message(const char *message, layout_t layout) {
    // Store the message in state
    strncpy(device_state.last_message, message, MAX_MESSAGE_LENGTH - 1);
    device_state.last_message[MAX_MESSAGE_LENGTH - 1] = '\0';
    device_state.last_layout = layout;
    device_state.has_message = true;
    save_state();
    
    if (!device_state.screen_on) {
        printf("Message saved (screen is off): \"%s\"\n", message);
        return;
    }
    
    if (!BlackImage) {
        fprintf(stderr, "Screen not properly initialized\n");
        return;
    }
    
    // Display the message immediately
    display_stored_message();
    
    const char *layout_str = (layout == LAYOUT_TOP) ? "top" : 
                            (layout == LAYOUT_BOTTOM) ? "bottom" : "center";
    printf("Message displayed: \"%s\" (layout: %s, mode: %s)\n", 
           message, layout_str, device_state.mode == MODE_LIGHT ? "light" : "dark");
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        print_usage(argv[0]);
        return 1;
    }
    
    // Load previous state
    load_state();
    
    static struct option long_options[] = {
        {"on", no_argument, 0, 0},
        {"off", no_argument, 0, 1},
        {"light", no_argument, 0, 2},
        {"dark", no_argument, 0, 3},
        {"message", required_argument, 0, 4},
        {"layout", required_argument, 0, 5},
        {"help", no_argument, 0, 6},
        {0, 0, 0, 0}
    };
    
    char *message = NULL;
    layout_t layout = LAYOUT_CENTER;
    bool message_set = false;
    
    int opt;
    int option_index = 0;
    
    while ((opt = getopt_long(argc, argv, "", long_options, &option_index)) != -1) {
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
                if (strcmp(optarg, "top") == 0) {
                    layout = LAYOUT_TOP;
                } else if (strcmp(optarg, "center") == 0) {
                    layout = LAYOUT_CENTER;
                } else if (strcmp(optarg, "bottom") == 0) {
                    layout = LAYOUT_BOTTOM;
                } else {
                    fprintf(stderr, "Invalid layout: %s. Use top, center, or bottom.\n", optarg);
                    return 1;
                }
                break;
            case 6: // --help
                print_usage(argv[0]);
                return 0;
            default:
                print_usage(argv[0]);
                return 1;
        }
    }
    
    // If message was provided, display it
    if (message_set && message) {
        display_message(message, layout);
    }
    
    return 0;
}
