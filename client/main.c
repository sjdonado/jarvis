#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <coap2/coap.h>

#include "DEV_Config.h"
#include "GUI_Paint.h"
#include "GUI_BMPfile.h"
#include "ImageData.h"
#include "Debug.h"
#include "fonts.h"

#include "EPD_2in13_V4.h"

#define MAX_INPUT_SIZE 256

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

// Function to display the CoAP message on the screen
void display_text(UBYTE *BlackImage, const char *text) {
    Paint_ClearWindows(10, 40, 10 + Font16.Width * 120, 40 + Font16.Height, WHITE);
    Paint_DrawString_EN(10, 40, text, &Font16, WHITE, BLACK);
    EPD_2in13_V4_Display_Partial(BlackImage);
}

// CoAP response handler
void handle_coap_response(coap_context_t *ctx, coap_session_t *session,
                          coap_pdu_t *sent, coap_pdu_t *received,
                          const coap_tid_t id) {
    size_t size;
    unsigned char *data;

    // Extract the payload from the CoAP response
    if (coap_get_data(received, &size, &data)) {
        char response_text[MAX_INPUT_SIZE];
        snprintf(response_text, sizeof(response_text), "%.*s", (int)size, data);
        printf("Received CoAP response: %s\n", response_text);

        // Display the response on the e-paper screen
        display_text(NULL, response_text); // Passing NULL as BlackImage temporarily
    } else {
        printf("No payload received in CoAP response.\n");
    }
}

void send_coap_request(coap_context_t *ctx, coap_session_t *session) {
    coap_pdu_t *request;
    request = coap_new_pdu(session);
    if (!request) {
        fprintf(stderr, "Failed to create CoAP request PDU.\n");
        return;
    }

    // Create a CoAP GET request
    coap_pdu_set_type(request, COAP_MESSAGE_CON);
    coap_pdu_set_code(request, COAP_REQUEST_GET);
    coap_add_option(request, COAP_OPTION_URI_PATH, 3, (const unsigned char *)"epd");

    // Send the request
    coap_send(session, request);
}

void coap_client_loop(coap_context_t *ctx) {
    printf("Press ENTER to exit...\r\n");
    while (1) {
        coap_io_process(ctx, COAP_IO_WAIT);
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

    // Initialize e-paper display buffer
    UWORD Imagesize = ((EPD_2in13_V4_WIDTH % 8 == 0) ? (EPD_2in13_V4_WIDTH / 8) : (EPD_2in13_V4_WIDTH / 8 + 1)) * EPD_2in13_V4_HEIGHT;
    UBYTE *BlackImage;
    if ((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
        DEV_Module_Exit();
        return -1;
    }

    Paint_NewImage(BlackImage, EPD_2in13_V4_WIDTH, EPD_2in13_V4_HEIGHT, ROTATE_90, WHITE);
    Paint_SelectImage(BlackImage);
    Paint_Clear(WHITE);

    display_text(BlackImage, "Connecting...");

    // Get CoAP server URI from environment variable
    const char *server_uri = getenv("COAP_SERVER_URI");
    if (!server_uri) {
        fprintf(stderr, "COAP_SERVER_URI environment variable not set.\n");
        free(BlackImage);
        DEV_Module_Exit();
        return -1;
    }

    printf("Connecting to CoAP server: %s\n", server_uri);

    // Initialize CoAP context and session
    coap_context_t *ctx = coap_new_context(NULL);
    coap_session_t *session = coap_new_client_session(ctx, NULL, coap_address_init(), COAP_PROTO_UDP);

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
    send_coap_request(ctx, session);

    // Run the CoAP client loop
    coap_client_loop(ctx);

    printf("Turning off the screen...", server_uri);

    free(BlackImage);
    EPD_2in13_V4_Clear();
    EPD_2in13_V4_Sleep();
    DEV_Module_Exit();

    coap_free_context(ctx);
    return 0;
}
