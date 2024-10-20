#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "DEV_Config.h"
#include "GUI_Paint.h"
#include "GUI_BMPfile.h"
#include "ImageData.h"
#include "Debug.h"
#include "fonts.h"

#include "EPD_2in13_V4.h"

#define SOCKET_PATH "/tmp/epd_socket"
#define MAX_INPUT_SIZE 256

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

int fd_socket;

int create_unix_socket() {
    struct sockaddr_un addr;
    if ((fd_socket = socket(AF_UNIX, SOCK_STREAM, 0)) == -1) {
        return -1;
    }

    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, SOCKET_PATH, sizeof(addr.sun_path) - 1);

    unlink(SOCKET_PATH);
    if (bind(fd_socket, (struct sockaddr*)&addr, sizeof(addr)) == -1) {
        close(fd_socket);
        return -1;
    }

    if (listen(fd_socket, 5) == -1) {
        close(fd_socket);
        return -1;
    }

    return 0;
}

int handle_socket_input(char *input_text) {
    struct sockaddr_un client_addr;
    socklen_t client_len = sizeof(client_addr);
    int client_fd = accept(fd_socket, (struct sockaddr*)&client_addr, &client_len);

    if (client_fd == -1) {
        return -1;
    }

    ssize_t num_bytes = read(client_fd, input_text, MAX_INPUT_SIZE - 1);
    if (num_bytes > 0) {
        input_text[num_bytes] = '\0';
	 printf("Received input: %s\r\n", input_text);
        close(client_fd);
        return 0;
    }

    close(client_fd);
    return -1;
}

void display_text(UBYTE *BlackImage, const char *text) {
    Paint_ClearWindows(10, 40, 10 + Font16.Width * 120, 40 + Font16.Height, WHITE);
    Paint_DrawString_EN(10, 40, text, &Font16, WHITE, BLACK);
    EPD_2in13_V4_Display_Partial(BlackImage);
}

void display_clock(UBYTE *BlackImage) {
    PAINT_TIME sPaint_time;
    time_t rawtime;
    struct tm *timeinfo;

    time(&rawtime);
    timeinfo = localtime(&rawtime);
    sPaint_time.Hour = timeinfo->tm_hour;
    sPaint_time.Min = timeinfo->tm_min;
    sPaint_time.Sec = timeinfo->tm_sec;

    while (1) {
        sPaint_time.Sec = sPaint_time.Sec + 1;
        if (sPaint_time.Sec == 60) {
            sPaint_time.Min = sPaint_time.Min + 1;
            sPaint_time.Sec = 0;
            if (sPaint_time.Min == 60) {
                sPaint_time.Hour = sPaint_time.Hour + 1;
                sPaint_time.Min = 0;
                if (sPaint_time.Hour == 24) {
                    sPaint_time.Hour = 0;
                }
            }
        }

        Paint_ClearWindows(170, 0, 170 + Font16.Width * 7, 80 + Font16.Height, WHITE);
        Paint_DrawTime(170, 0, &sPaint_time, &Font16, WHITE, BLACK);

        EPD_2in13_V4_Display_Partial(BlackImage);

        char input_text[MAX_INPUT_SIZE] = {0};
        fd_set readfds;
        struct timeval tv;
        int retval;

        FD_ZERO(&readfds);
        FD_SET(fd_socket, &readfds);

        tv.tv_sec = 0;
        tv.tv_usec = 0;

        retval = select(fd_socket + 1, &readfds, NULL, NULL, &tv);
        if (retval > 0) {
            if (handle_socket_input(input_text) == 0) {
                display_text(BlackImage, input_text);
            }
        }

        if (check_for_enter_press()) {
            break;
        }

        DEV_Delay_ms(1000);
    }
}

int main(void) {
    if (DEV_Module_Init() != 0) {
        return -1;
    }

    EPD_2in13_V4_Init();
    EPD_2in13_V4_Clear();
    DEV_Delay_ms(100);

    UWORD Imagesize = ((EPD_2in13_V4_WIDTH % 8 == 0) ? (EPD_2in13_V4_WIDTH / 8) : (EPD_2in13_V4_WIDTH / 8 + 1)) * EPD_2in13_V4_HEIGHT;
    UBYTE *BlackImage;
    if ((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
        DEV_Module_Exit();
        return -1;
    }

    Paint_NewImage(BlackImage, EPD_2in13_V4_WIDTH, EPD_2in13_V4_HEIGHT, ROTATE_90, WHITE);
    Paint_SelectImage(BlackImage);
    Paint_Clear(WHITE);

    display_text(BlackImage, "Listening...");

    if (create_unix_socket() == -1) {
        free(BlackImage);
        DEV_Module_Exit();
        return -1;
    }

    printf("Press ENTER to exit...\r\n");
    display_clock(BlackImage);

    free(BlackImage);
    EPD_2in13_V4_Clear();
    EPD_2in13_V4_Sleep();
    DEV_Module_Exit();

    close(fd_socket);
    unlink(SOCKET_PATH);

    return 0;
}
