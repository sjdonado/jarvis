#include <arpa/inet.h>
#include <coap2/coap.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "DEV_Config.h"
#include "Debug.h"
#include "EPD_2in13_V4.h"
#include "GUI_BMPfile.h"
#include "GUI_Paint.h"
#include "ImageData.h"
#include "fonts.h"

#define MAX_INPUT_SIZE 256
#define BUFSIZE 128
#define COAP_OPTION_API_KEY 2048

// Global variable for the e-paper display image buffer
UBYTE *BlackImage = NULL;

void cleanup_and_exit(coap_context_t *ctx, coap_session_t *session,
                      int exit_code) {
  printf("Turning off the screen...\n");

  if (BlackImage) {
    free(BlackImage);
    BlackImage = NULL;
  }
  EPD_2in13_V4_Clear();
  EPD_2in13_V4_Sleep();
  DEV_Module_Exit();

  if (session) {
    coap_session_release(session);
  }
  if (ctx) {
    coap_free_context(ctx);
  }

  exit(exit_code);
}

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

void display_text(const char *text) {
  Paint_ClearWindows(10, 40, EPD_2in13_V4_HEIGHT, 40 + Font16.Height, WHITE);
  Paint_DrawString_EN(10, 40, text, &Font16, WHITE, BLACK);
  EPD_2in13_V4_Display_Partial(BlackImage);
}

void handle_coap_response(coap_context_t *ctx, coap_session_t *session,
                          coap_pdu_t *sent, coap_pdu_t *received,
                          const coap_tid_t id) {
  size_t size;
  unsigned char *data;

  if (COAP_RESPONSE_CLASS(received->code) == 2) { // Check for 2.xx codes
    if (coap_get_data(received, &size, &data)) {
      char response_text[MAX_INPUT_SIZE];
      snprintf(response_text, sizeof(response_text), "%.*s", (int)size, data);
      printf("Received CoAP response: %s\n", response_text);
      display_text(response_text);
    } else {
      printf("No payload received in CoAP response.\n");
    }
  } else {
    printf("Received CoAP error code: %d.%02d\n", (received->code >> 5),
           received->code & 0x1F);
  }
}

void send_coap_request(coap_session_t *session, coap_uri_t *uri) {
  coap_pdu_t *request;
  coap_optlist_t *optlist = NULL;
  unsigned char _buf[BUFSIZE];
  size_t _buf_len;
  unsigned char observe = 0;
  unsigned char buf[3];
  size_t len;

  const char *api_key = getenv("COAP_SERVER_API_KEY");
  if (!api_key) {
    fprintf(stderr,
            "COAP_SERVER_API_KEY environment variable not set. Exiting.\n");
    cleanup_and_exit(ctx, session, -1);
  }

  // Add API_KEY as a custom CoAP option (header)
  coap_insert_optlist(&optlist,
                      coap_new_optlist(COAP_OPTION_API_KEY, strlen(api_key),
                                       (const unsigned char *)api_key));

  request = coap_new_pdu(session);
  if (!request) {
    fprintf(stderr, "Failed to create CoAP request PDU.\n");
    return;
  }

  request->type = COAP_MESSAGE_CON;
  request->code = COAP_REQUEST_GET;
  request->tid = coap_new_message_id(session);

  // Build the option list
  if (uri->path.length) {
    const unsigned char *path = uri->path.s;
    size_t path_len = uri->path.length;
    while (path_len > 0) {
      _buf_len = BUFSIZE;
      int segment_len = coap_split_path(path, path_len, _buf, &_buf_len);
      if (segment_len <= 0)
        break;
      coap_insert_optlist(
          &optlist, coap_new_optlist(COAP_OPTION_URI_PATH, _buf_len, _buf));
      path += segment_len;
      path_len -= segment_len;
    }
  }

  // Add Observe option
  len = coap_encode_var_safe(buf, sizeof(buf), observe);
  coap_insert_optlist(&optlist,
                      coap_new_optlist(COAP_OPTION_OBSERVE, len, buf));

  // Add options to request
  if (coap_add_optlist_pdu(request, &optlist) != 1) {
    fprintf(stderr, "Failed to add options to request.\n");
    coap_delete_pdu(request);
    coap_delete_optlist(optlist);
    return;
  }

  if (coap_send(session, request) == COAP_INVALID_TID) {
    fprintf(stderr, "Error sending CoAP request.\n");
  }

  coap_delete_optlist(optlist);
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

void display_clock() {
  static time_t last_time = 0;
  time_t rawtime;
  struct tm *timeinfo;
  PAINT_TIME sPaint_time;

  time(&rawtime);
  if (rawtime != last_time) {
    last_time = rawtime;
    timeinfo = localtime(&rawtime);
    sPaint_time.Hour = timeinfo->tm_hour;
    sPaint_time.Min = timeinfo->tm_min;
    sPaint_time.Sec = timeinfo->tm_sec;

    Paint_ClearWindows(170, 0, 170 + Font16.Width * 7, 80 + Font16.Height,
                       WHITE);
    Paint_DrawTime(170, 0, &sPaint_time, &Font16, WHITE, BLACK);

    EPD_2in13_V4_Display_Partial(BlackImage);
  }
}

int main(void) {
  coap_context_t *ctx = NULL;
  coap_session_t *session = NULL;

  if (DEV_Module_Init() != 0) {
    return -1;
  }

  EPD_2in13_V4_Init();
  EPD_2in13_V4_Clear();
  DEV_Delay_ms(100);

  UWORD Imagesize =
      ((EPD_2in13_V4_WIDTH % 8 == 0) ? (EPD_2in13_V4_WIDTH / 8)
                                     : (EPD_2in13_V4_WIDTH / 8 + 1)) *
      EPD_2in13_V4_HEIGHT;
  BlackImage = (UBYTE *)malloc(Imagesize);
  if (!BlackImage) {
    fprintf(stderr, "Failed to allocate memory for BlackImage.\n");
    cleanup_and_exit(ctx, session, -1);
  }

  Paint_NewImage(BlackImage, EPD_2in13_V4_WIDTH, EPD_2in13_V4_HEIGHT, ROTATE_90,
                 WHITE);
  Paint_SelectImage(BlackImage);
  Paint_Clear(WHITE);

  display_text("Loading...");

  const char *server_uri = getenv("COAP_SERVER_URI");
  if (!server_uri) {
    fprintf(stderr, "COAP_SERVER_URI environment variable not set.\n");
    cleanup_and_exit(ctx, session, -1);
  }

  printf("Connecting to CoAP server: %s\n", server_uri);

  // Initialize CoAP context
  ctx = coap_new_context(NULL);
  if (!ctx) {
    fprintf(stderr, "Failed to create CoAP context.\n");
    cleanup_and_exit(ctx, session, -1);
  }

  // Parse the CoAP URI
  coap_uri_t uri;
  if (coap_split_uri((const unsigned char *)server_uri, strlen(server_uri),
                     &uri) == -1) {
    fprintf(stderr, "Invalid CoAP URI.\n");
    cleanup_and_exit(ctx, session, -1);
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
    cleanup_and_exit(ctx, session, -1);
  }

  session = coap_new_client_session(ctx, NULL, &dst_addr, COAP_PROTO_UDP);
  if (!session) {
    fprintf(stderr, "Failed to create CoAP client session.\n");
    cleanup_and_exit(ctx, session, -1);
  }

  coap_register_response_handler(ctx, handle_coap_response);

  // Send a CoAP request with Observe option to the server
  send_coap_request(session, &uri);

  // Run the CoAP client loop
  coap_client_loop(ctx);

  cleanup_and_exit(ctx, session, 0);

  return 0;
}
