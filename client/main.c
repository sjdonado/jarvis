#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <coap2/coap.h>
#include <arpa/inet.h>  // For inet_pton

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
void handle_coap_response(struct coap_context_t *ctx,
                          const coap_endpoint_t *local_interface,
                          const coap_address_t *remote,
                          coap_pdu_t *sent,
                          coap_pdu_t *received,
                          const coap_tid_t id) {
    size_t size;
    unsigned char *data;

    if (coap_get_data(received, &size, &data)) {
        char response_text[MAX_INPUT_SIZE];
        snprintf(response_text, sizeof(response_text), "%.*s", (int)size, data);
        printf("Received CoAP response: %s\n", response_text);
        // Replace NULL with BlackImage if available
        display_text(NULL, response_text);
    } else {
        printf("No payload received in CoAP response.\n");
    }
}

void send_coap_request(coap_context_t *ctx, coap_address_t *dst_addr, coap_uri_t *uri) {
    coap_pdu_t *request;
    coap_tid_t tid;
    unsigned char opt_buf[40];
    size_t opt_buf_len;
    coap_list_t *options = NULL;

    // Create a CoAP GET request PDU
    request = coap_pdu_init(COAP_MESSAGE_CON,
                            COAP_REQUEST_GET,
                            coap_new_message_id(ctx),
                            coap_session_max_pdu_size(coap_session_get_default(ctx)));

    if (!request) {
        fprintf(stderr, "Failed to create CoAP request PDU.\n");
        return;
    }

    // Build the URI options
    coap_split_uri(uri->path.s, uri->path.length, &options);

    // Add URI options to the request
    coap_add_optlist_pdu(request, options);

    // Send the request
    tid = coap_send_confirmed(ctx, coap_session_get_default(ctx), request);
    if (tid == COAP_INVALID_TID) {
        fprintf(stderr, "Error sending CoAP request.\n");
    }

    // Free the options
    coap_delete_optlist(options);
}

void coap_client_loop(coap_context_t *ctx) {
    printf("Press ENTER to exit...\r\n");
    while (1) {
        coap_run_once(ctx, 1000); // Wait for up to 1000ms
        if (check_for_enter_press()) {
            break;
        }
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
    UBYTE *BlackImage = (UBYTE *)malloc(Imagesize);
    if (!BlackImage) {
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

    // Set up the destination address
    coap_address_t dst_addr;
    coap_address_init(&dst_addr);

    dst_addr.addr.sin.sin_family = AF_INET;
    dst_addr.addr.sin.sin_port = htons(uri.port);

    // Convert the host string to network address
    char host[256];
    snprintf(host, sizeof(host), "%.*s", (int)uri.host.length, uri.host.s);

    if (inet_pton(AF_INET, host, &dst_addr.addr.sin.sin_addr) <= 0) {
        fprintf(stderr, "Invalid server address: %s\n", host);
        coap_free_context(ctx);
        free(BlackImage);
        DEV_Module_Exit();
        return -1;
    }

    // Create CoAP endpoint
    if (!coap_new_client_session(ctx, NULL, &dst_addr, COAP_PROTO_UDP)) {
        fprintf(stderr, "Failed to create CoAP client session.\n");
        coap_free_context(ctx);
        free(BlackImage);
        DEV_Module_Exit();
        return -1;
    }

    // Set up response handler
    coap_register_response_handler(ctx, handle_coap_response);

    // Send a CoAP request to the server
    send_coap_request(ctx, &dst_addr, &uri);

    // Run the CoAP client loop
    coap_client_loop(ctx);

    printf("Turning off the screen...\n");

    free(BlackImage);
    EPD_2in13_V4_Clear();
    EPD_2in13_V4_Sleep();
    DEV_Module_Exit();

    coap_free_context(ctx);
    return 0;
}
