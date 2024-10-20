#include "EPD_2in13_V4.h"
#include "GUI_Paint.h"
#include "fonts.h"
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define SOCKET_PATH "/tmp/epd_socket"  // Path to the Unix socket
#define MAX_INPUT_SIZE 256  // Maximum UTF-8 input size

int fd_socket;  // File descriptor for the Unix socket

// Function to create and listen on a Unix socket
int create_unix_socket() {
    struct sockaddr_un addr;
    if ((fd_socket = socket(AF_UNIX, SOCK_STREAM, 0)) == -1) {
        perror("socket error");
        return -1;
    }

    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, SOCKET_PATH, sizeof(addr.sun_path) - 1);

    unlink(SOCKET_PATH);
    if (bind(fd_socket, (struct sockaddr*)&addr, sizeof(addr)) == -1) {
        perror("bind error");
        return -1;
    }

    if (listen(fd_socket, 5) == -1) {
        perror("listen error");
        return -1;
    }

    return 0;
}

// Function to handle incoming UTF-8 text from the socket
int handle_socket_input(char *input_text) {
    struct sockaddr_un client_addr;
    socklen_t client_len = sizeof(client_addr);
    int client_fd = accept(fd_socket, (struct sockaddr*)&client_addr, &client_len);

    if (client_fd == -1) {
        perror("accept error");
        return -1;
    }

    ssize_t num_bytes = read(client_fd, input_text, MAX_INPUT_SIZE);
    if (num_bytes > 0) {
        input_text[num_bytes] = '\0';  // Null-terminate the input
        printf("Received input: %s\n", input_text);
        close(client_fd);
        return 0;
    }

    close(client_fd);
    return -1;
}

// Function to display text on the e-paper display
void display_text(UBYTE *BlackImage, const char *text) {
    Paint_Clear(WHITE);  // Clear the display
    Paint_DrawString_EN(5, 100, text, &Font16, BLACK, WHITE);  // Draw text at (5, 100)
    EPD_2in13_V4_Display(BlackImage);  // Full refresh after drawing text
}

int main(void) {
    printf("EPD Test Program Started\n");

    // Initialize the e-paper display
    if (DEV_Module_Init() != 0) {
        printf("Display initialization failed.\n");
        return -1;
    }

    EPD_2in13_V4_Init();
    EPD_2in13_V4_Clear();

    // Initialize display buffer
    UWORD Imagesize = ((EPD_2in13_V4_WIDTH % 8 == 0) ? (EPD_2in13_V4_WIDTH / 8) : (EPD_2in13_V4_WIDTH / 8 + 1)) * EPD_2in13_V4_HEIGHT;
    UBYTE *BlackImage;
    if ((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
        printf("Failed to allocate memory for display buffer.\n");
        return -1;
    }

    // Initialize painting functions
    Paint_NewImage(BlackImage, EPD_2in13_V4_WIDTH, EPD_2in13_V4_HEIGHT, 90, WHITE);
    Paint_SelectImage(BlackImage);
    Paint_Clear(WHITE);

    // Show a welcome message
    Paint_DrawString_EN(10, 50, "Welcome!", &Font16, BLACK, WHITE);
    EPD_2in13_V4_Display(BlackImage);  // Full refresh to show the welcome message
    printf("Welcome message displayed.\n");

    // Initialize Unix socket
    if (create_unix_socket() == -1) {
        printf("Socket creation failed.\n");
        free(BlackImage);
        return -1;
    }

    printf("Listening for Unix socket input at /tmp/epd_socket...\n");

    char input_text[MAX_INPUT_SIZE] = {0};
    while (1) {
        // Check for incoming UTF-8 input from Unix socket
        if (handle_socket_input(input_text) == 0) {
            display_text(BlackImage, input_text);  // Display input text on the e-paper
        }
        usleep(100000);  // Sleep for 100ms
    }

    free(BlackImage);
    return 0;
}
