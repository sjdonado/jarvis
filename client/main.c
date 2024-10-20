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

// CoAP response handler and message display logic
void handle_coap_request(coap_context_t *ctx, coap_resource_t *resource,
                         coap_session_t *session, coap_pdu_t *request,
                         coap_binary_t *token, coap_string_t *query,
                         coap_pdu_t *response) {
    size_t size;
    unsigned char *data;

    // Extract the payload from the CoAP request
    if (coap_get_data(request, &size, &data)) {
        // Ensure the message is null-terminated
        char input_text[MAX_INPUT_SIZE];
        snprintf(input_text, sizeof(input_text), "%.*s", (int)size, data);
        printf("Received input: %s\n", input_text);

        // Display the message on the e-paper screen
        display_text(BlackImage, input_text);

        // Create a response acknowledging the message
        response->code = COAP_RESPONSE_CODE(205);
        coap_add_data(response, size, data);
    } else {
        printf("No payload received in CoAP request.\n");
        response->code = COAP_RESPONSE_CODE(400);
    }
}

void setup_coap_server(coap_context_t **ctx, coap_resource_t **resource) {
    *ctx = coap_new_context(NULL);
    if (!*ctx) {
        fprintf(stderr, "Failed to create CoAP context\n");
        exit(1);
    }

    *resource = coap_resource_init(coap_make_str_const("epd"), 0);
    coap_register_handler(*resource, COAP_REQUEST_GET | COAP_REQUEST_POST, handle_coap_request);
    coap_add_resource(*ctx, *resource);
}

void coap_server_loop(coap_context_t *ctx) {
    printf("Press ENTER to exit...\r\n");
    while (1) {
        coap_io_process(ctx, COAP_IO_WAIT);
        if (check_for_enter_press()) {
            break;
        }
        DEV_Delay_ms(1000);
    }
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

    coap_context_t *ctx;
    coap_resource_t *resource;
    setup_coap_server(&ctx, &resource);

    coap_server_loop(ctx);

    free(BlackImage);
    EPD_2in13_V4_Clear();
    EPD_2in13_V4_Sleep();
    DEV_Module_Exit();

    coap_free_context(ctx);

    return 0;
}
