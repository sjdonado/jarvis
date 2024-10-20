#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <coap2/coap.h>
#include <arpa/inet.h>

#include "DEV_Config.h"
#include "GUI_Paint.h"
#include "GUI_BMPfile.h"
#include "ImageData.h"
#include "Debug.h"
#include "fonts.h"
#include "EPD_2in13_V4.h"

#define MAX_INPUT_SIZE 256

// Global variable for the e-paper display image buffer
UBYTE *BlackImage = NULL;

int check_for_enter_press() {
    fd_set read_fds;
    struct timeval tv;
    FD_ZERO(&read_fds);
    FD_SET(STDIN_FILENO, &read_fds);

    tv.tv_sec = 0;
    tv.tv_usec = 0;

    if (select(STDIN_FILENO + 1, &read_fds, NULL, NULL, &tv) > 0) {
        char buf[1];
        if (read(STDIN_FILENO, buf, 1) > 0 && buf[0] == '\n') {
            return 1;
        }
    }
    return 0;
}

// Function to display text on the e-paper screen
void display_text(const char *text) {
    Paint_ClearWindows(10, 40, 10 + Font16.Width * strlen(text), 40 + Font16.Height, WHITE);
    Paint_DrawString_EN(10, 40, text, &Font16, WHITE, BLACK);
    EPD_2in13_V4_Display_Partial(BlackImage);
}

// CoAP response handler
void handle_coap_response(coap_context_t *ctx, coap_session_t *session,
                          coap_pdu_t *sent, coap_pdu_t *received,
                          const coap_tid_t id) {
    size_t size;
    unsigned char *data;

    if (coap_get_data(received, &size, &data)) {
        char response_text[MAX_INPUT_SIZE];
        snprintf(response_text, sizeof(response_text), "%.*s", (int)size, data);
        printf("Received CoAP response: %s\n", response_text);
        display_text(response_text);
    } else {
        printf("No payload received in CoAP response.\n");
    }
}

// Simplified function to send a CoAP GET request
void send_coap_request(coap_session_t *session) {
    coap_pdu_t *request = coap_new_pdu(session);
    if (!request) {
        fprintf(stderr, "Failed to create CoAP request PDU.\n");
        return;
    }

    request->type = COAP_MESSAGE_CON;
    request->code = COAP_REQUEST_GET;
    request->tid = coap_new_message_id(session);

    coap_send(session, request);
}

void coap_client_loop(coap_context_t *ctx) {
    printf("Press ENTER to exit...\r\n");
    while (1) {
        coap_run_once(ctx, 1000);
        if (check_for_enter_press()) {
            break;
        }
        display_clock();
    }
}

// Function to display the clock
void display_clock() {
    static PAINT_TIME sPaint_time;
    time_t rawtime;
    struct tm *timeinfo;

    time(&rawtime);
    timeinfo = localtime(&rawtime);
    sPaint_time.Hour = timeinfo->tm_hour;
    sPaint_time.Min = timeinfo->tm_min;
    sPaint_time.Sec = timeinfo->tm_sec;

    Paint_ClearWindows(170, 0, 170 + Font16.Width * 7, 80 + Font16.Height, WHITE);
    Paint_DrawTime(170, 0, &sPaint_time, &Font16, WHITE, BLACK);

    EPD_2in13_V4_Display_Partial(BlackImage);
}

int main(void) {
    if (DEV_Module_Init() != 0) {
        return -1;
    }

    EPD_2in13_V4_Init();
    EPD_2in13_V4_Clear();
    DEV_Delay_ms(100);

    UWORD Imagesize = ((EPD_2in13_V4_WIDTH % 8 == 0)
                           ? (EPD_2in13_V4_WIDTH / 8)
                           : (EPD_2in13_V4_WIDTH / 8 + 1)) * EPD_2in13_V4_HEIGHT;
    BlackImage = (UBYTE *)malloc(Imagesize);
    if (!BlackImage) {
        DEV_Module_Exit();
        return -1;
    }

    Paint_NewImage(BlackImage, EPD_2in13_V4_WIDTH, EPD_2in13_V4_HEIGHT, ROTATE_90, WHITE);
    Paint_SelectImage(BlackImage);
    Paint_Clear(WHITE);

    display_text("Connecting...");

    // Get CoAP server URI from environment variable
    const char *server_uri = getenv("COAP_SERVER_URI");
    if (!server_uri) {
        fprintf(stderr, "COAP_SERVER_URI environment variable not set.\n");
        free(BlackImage);
        DEV_Module_Exit();
        return -1;
    }

    printf("Connecting to CoAP server: %s\n", server_uri);

    // Initialize CoAP context
    coap_context_t *ctx = coap_new_context(NULL);
    if (!ctx) {
        fprintf(stderr, "Failed to create CoAP context.\n");
        free(BlackImage);
        DEV_Module_Exit();
        return -1;
    }

    // Parse the CoAP URI
    coap_uri_t uri;
    if (coap_split_uri((const unsigned char *)server_uri, strlen(server_uri), &uri) == -1) {
        fprintf(stderr, "Invalid CoAP URI.\n");
        coap_free_context(ctx);
        free(BlackImage);
        DEV_Module_Exit();
        return -1;
    }

    // Create a CoAP session
    coap_address_t dst_addr;
    coap_address_init(&dst_addr);

    dst_addr.addr.sin.sin_family = AF_INET;
    dst_addr.addr.sin.sin_port = htons(uri.port);

    char host[256];
    snprintf(host, sizeof(host), "%.*s", (int)uri.host.length, uri.host.s);

    if (inet_pton(AF_INET, host, &dst_addr.addr.sin.sin_addr) <= 0) {
        fprintf(stderr, "Invalid server address: %s\n", host);
        coap_free_context(ctx);
        free(BlackImage);
        DEV_Module_Exit();
        return -1;
    }

    coap_session_t *session = coap_new_client_session(ctx, NULL, &dst_addr, COAP_PROTO_UDP);
    if (!session) {
        fprintf(stderr, "Failed to create CoAP client session.\n");
        coap_free_context(ctx);
        free(BlackImage);
        DEV_Module_Exit();
        return -1;
    }

    // Set up response handler
    coap_register_response_handler(ctx, handle_coap_response);

    // Send a CoAP request to the server
    send_coap_request(session);

    // Run the CoAP client loop
    coap_client_loop(ctx);

    printf("Turning off the screen...\n");

    free(BlackImage);
    EPD_2in13_V4_Clear();
    EPD_2in13_V4_Sleep();
    DEV_Module_Exit();

    coap_session_release(session);
    coap_free_context(ctx);
    return 0;
}
