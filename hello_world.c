#include "DEV_Config.h"
#include "GUI_Paint.h"
#include "Debug.h"
#include "fonts.h"
#include "EPD_2in13_V4.h"

#include <stdlib.h>
#include <time.h>
#include <unistd.h>
#include <stdio.h>
#include <sys/select.h>

// Function to check if Enter key is pressed
int check_for_enter_press() {
    fd_set read_fds;
    struct timeval tv;
    FD_ZERO(&read_fds);
    FD_SET(STDIN_FILENO, &read_fds);

    // Set a timeout of 0 seconds to make select non-blocking
    tv.tv_sec = 0;
    tv.tv_usec = 0;

    // Check if there's input available on stdin (standard input)
    if (select(STDIN_FILENO + 1, &read_fds, NULL, NULL, &tv) > 0) {
        char buf[1];
        if (read(STDIN_FILENO, buf, 1) > 0 && buf[0] == '\n') {
            return 1;  // Enter key was pressed
        }
    }
    return 0;  // No input or other key was pressed
}

int main(void) {
    srand(time(NULL));  // Initialize random seed

    if (DEV_Module_Init() != 0) {
        return -1;
    }

    EPD_2in13_V4_Init();
    EPD_2in13_V4_Clear();
    DEV_Delay_ms(100);

    UWORD Imagesize = ((EPD_2in13_V4_WIDTH % 8 == 0) ?
                       (EPD_2in13_V4_WIDTH / 8) :
                       (EPD_2in13_V4_WIDTH / 8 + 1)) * EPD_2in13_V4_HEIGHT;

    UBYTE *BlackImage = (UBYTE *)malloc(Imagesize);
    if (BlackImage == NULL) {
        Debug("Failed to allocate memory for image...\r\n");
        DEV_Module_Exit();
        return -1;
    }

    // Initialize the image
    Paint_NewImage(BlackImage, EPD_2in13_V4_WIDTH, EPD_2in13_V4_HEIGHT, ROTATE_90, WHITE);
    Paint_SelectImage(BlackImage);

    Paint_Clear(WHITE);

    Paint_DrawString_EN(90, 15, "Hello world!", &Font16, BLACK, WHITE);
    Paint_DrawNum(90, 60, 12345, &Font16, BLACK, WHITE);
    Paint_DrawString_CN(90, 90, "ÄãºÃabc", &Font12CN, WHITE, BLACK);

    EPD_2in13_V4_Display_Base(BlackImage);

    printf("Press ENTER to exit...\r\n");

    while (1) {
        if (check_for_enter_press()) {
            break;  // Exit the loop if Enter is pressed
        }
    }

    // Cleanup before exiting
    free(BlackImage);
    BlackImage = NULL;

    EPD_2in13_V4_Clear();
    EPD_2in13_V4_Sleep();
    DEV_Module_Exit();

    return 0;
}
