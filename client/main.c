#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "MQTTClient.h"

#include "DEV_Config.h"
#include "Debug.h"

#include "GUI_BMPfile.h"
#include "GUI_Paint.h"
#include "fonts.h"

#include "EPD_2in13_V4.h"

#define STATUSBAR_TOPIC "statusbar"
#define DISPLAY_TOPIC "display"
#define QOS 1
#define TIMEOUT 10000L

#define SCREEN_WIDTH EPD_2in13_V4_WIDTH   // 122
#define SCREEN_HEIGHT EPD_2in13_V4_HEIGHT // 250
#define STATUSBAR_HEIGHT 20

// Global variables
UBYTE *BlackImage = NULL;
MQTTClient client;
volatile sig_atomic_t exit_requested = 0; // Flag for exiting the main loop

// Function to handle SIGINT (Ctrl+C)
void handle_sigint(int sig) { exit_requested = 1; }

// Function to check BMP dimensions
int GUI_BMPfile_CheckDimensions(const char *bmp_file, int expected_width,
                                int expected_height) {
  FILE *fp = fopen(bmp_file, "rb");
  if (!fp) {
    fprintf(stderr, "Failed to open BMP file for dimension check.\n");
    return 0;
  }

  // Skip to BMP width/height in the header (offsets 18 and 22 in BMP header)
  fseek(fp, 18, SEEK_SET);

  int32_t width, height;
  fread(&width, sizeof(int32_t), 1, fp);
  fread(&height, sizeof(int32_t), 1, fp);

  fclose(fp);

  printf("Received BMP dimensions: %dx%d\n", width, height);
  return (width == expected_width && height == expected_height);
}

void cleanup_and_exit(int exit_code) {
  printf("Turning off the screen...\n");

  // Disconnect MQTT client if connected
  MQTTClient_disconnect(client, 10000);
  MQTTClient_destroy(&client);

  if (BlackImage) {
    free(BlackImage);
    BlackImage = NULL;
  }
  EPD_2in13_V4_Clear();
  EPD_2in13_V4_Sleep();
  DEV_Module_Exit();

  exit(exit_code);
}

void update_statusbar(const char *status_text) {
  printf("Updating status bar with text: %s\n", status_text);

  const int statusbar_y = 0;
  const int statusbar_x = 0;
  sFONT *font = &Font8;

  // Calculate text width for right alignment
  int text_width = strlen(status_text) * font->Width;
  int text_x = SCREEN_HEIGHT - text_width - 5;
  int text_y = statusbar_y + (STATUSBAR_HEIGHT - font->Height) / 2;

  Paint_ClearWindows(text_x, text_y, text_x + text_width, text_y + font->Height, WHITE);
  Paint_DrawString_EN(text_x, text_y, status_text, font, WHITE, BLACK);

  EPD_2in13_V4_Display_Partial(BlackImage);
}

void update_display_area(const char *bmp_file) {
  printf("Updating display area\n");

  const int display_area_x = SCREEN_WIDTH - STATUSBAR_HEIGHT;
  const int display_area_y = SCREEN_HEIGHT;

  Paint_ClearWindows(0, 0, display_area_x, display_area_y, WHITE);

  if (GUI_ReadBmp(bmp_file, 0, 0) != 0) {
    fprintf(stderr, "Failed to read BMP image.\n");
    return;
  }

  EPD_2in13_V4_Display_Partial(BlackImage);
}

// MQTT message arrived callback
int msgarrvd(void *context, char *topicName, int topicLen,
             MQTTClient_message *message) {
  printf("Message arrived\n");
  printf("     topic: %s\n", topicName);

  if (message->payloadlen <= 0) {
    printf("Empty message received.\n");
    MQTTClient_freeMessage(&message);
    MQTTClient_free(topicName);
    return 1;
  }

  if (strcmp(topicName, STATUSBAR_TOPIC) == 0) {
    // Handle status bar update
    char status_text[256];
    snprintf(status_text, sizeof(status_text), "%.*s", message->payloadlen,
             (char *)message->payload);

    update_statusbar(status_text);
  } else if (strcmp(topicName, DISPLAY_TOPIC) == 0) {
    const char *bmp_file = "/tmp/jarvis_display.bmp";

    FILE *fp = fopen(bmp_file, "wb");
    if (!fp) {
      fprintf(stderr, "Failed to open file for writing.\n");
      MQTTClient_freeMessage(&message);
      MQTTClient_free(topicName);
      return 1;
    }

    fwrite(message->payload, 1, message->payloadlen, fp);
    fclose(fp);

    // Debug log to verify file save success
    printf("BMP image saved to %s\n", bmp_file);

    int expected_width = SCREEN_HEIGHT;
    int expected_height = SCREEN_WIDTH - STATUSBAR_HEIGHT;

    if (GUI_BMPfile_CheckDimensions(bmp_file, expected_width,
                                    expected_height)) {
      update_display_area(bmp_file);
      printf("Image displayed on e-paper.\n");
    } else {
      fprintf(
          stderr,
          "Error: BMP dimensions do not match display area. Expected %dx%d.\n",
          expected_width, expected_height);
    }
  } else {
    printf("Unknown topic received: %s\n", topicName);
  }

  MQTTClient_freeMessage(&message);
  MQTTClient_free(topicName);
  return 1;
}

// MQTT connection lost callback
void connlost(void *context, char *cause) {
  printf("\nConnection lost\n");
  printf("     cause: %s\n", cause);
}

// MQTT delivery complete callback
void delivered(void *context, MQTTClient_deliveryToken dt) {
  // Not used in this client since we are only subscribing
}

int main(void) {
  // Get MQTT_ADDRESS and MQTT_CLIENTID from environment variables
  const char *MQTT_ADDRESS = getenv("MQTT_ADDRESS");
  const char *MQTT_CLIENTID = getenv("MQTT_CLIENTID");

  printf("Using MQTT_ADDRESS: %s\n", MQTT_ADDRESS);
  printf("Using MQTT_CLIENTID: %s\n", MQTT_CLIENTID);

  // Initialize the e-paper display
  if (DEV_Module_Init() != 0) {
    return -1;
  }

  EPD_2in13_V4_Init();
  EPD_2in13_V4_Clear();

  // Create a new image cache
  UWORD Imagesize =
      ((EPD_2in13_V4_WIDTH % 8 == 0) ? (EPD_2in13_V4_WIDTH / 8)
                                     : (EPD_2in13_V4_WIDTH / 8 + 1)) *
      EPD_2in13_V4_HEIGHT;
  if ((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
    Debug("Failed to apply for black memory...\r\n");
    return -1;
  }

  // Initialize the image buffer for the full display
  Paint_NewImage(BlackImage, SCREEN_WIDTH, SCREEN_HEIGHT, ROTATE_90, WHITE);
  Paint_SelectImage(BlackImage);
  Paint_Clear(WHITE);

  EPD_2in13_V4_Display_Base(BlackImage);

  // MQTT setup
  MQTTClient_connectOptions conn_opts = MQTTClient_connectOptions_initializer;
  int rc;

  MQTTClient_create(&client, MQTT_ADDRESS, MQTT_CLIENTID,
                    MQTTCLIENT_PERSISTENCE_NONE, NULL);
  conn_opts.keepAliveInterval = 20;
  conn_opts.cleansession = 1;

  MQTTClient_setCallbacks(client, NULL, connlost, msgarrvd, delivered);

  if ((rc = MQTTClient_connect(client, &conn_opts)) != MQTTCLIENT_SUCCESS) {
    printf("Failed to connect to MQTT server, return code %d\n", rc);
    cleanup_and_exit(-1);
  }

  printf("Connected to MQTT server at %s\n", MQTT_ADDRESS);

  // Subscribe to both topics
  MQTTClient_subscribe(client, STATUSBAR_TOPIC, QOS);
  MQTTClient_subscribe(client, DISPLAY_TOPIC, QOS);

  printf("Subscribed to topics %s and %s\n", STATUSBAR_TOPIC, DISPLAY_TOPIC);

  // Register the signal handler for Ctrl+C
  signal(SIGINT, handle_sigint);

  printf("Running... Press Ctrl+C to exit.\n");
  while (!exit_requested) {
    // Sleep for a short while to reduce CPU usage
    usleep(500000); // Sleep for 500 milliseconds
  }

  // Disconnect MQTT client
  MQTTClient_disconnect(client, 10000);
  MQTTClient_destroy(&client);

  cleanup_and_exit(0);

  return 0;
}
