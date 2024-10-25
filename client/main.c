#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>

#include "MQTTClient.h"

#include "DEV_Config.h"
#include "Debug.h"

#include "GUI_Paint.h"
#include "GUI_BMPfile.h"
#include "fonts.h"

#include "EPD_2in13_V4.h"

#define MQTT_TOPIC     "display"
#define QOS            1
#define TIMEOUT        10000L

// Global variables
UBYTE *BlackImage = NULL;
MQTTClient client;
volatile sig_atomic_t exit_requested = 0; // Flag for exiting the main loop

// Function to handle SIGINT (Ctrl+C)
void handle_sigint(int sig) {
    exit_requested = 1;
}

// Function to check BMP dimensions
int GUI_BMPfile_CheckDimensions(const char *bmp_file, int expected_width, int expected_height) {
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

// Function to clean up and turn off the screen
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

// MQTT message arrived callback
int msgarrvd(void *context, char *topicName, int topicLen, MQTTClient_message *message) {
    printf("Message arrived\n");
    printf("     topic: %s\n", topicName);

    if (message->payloadlen <= 0) {
        printf("Empty message received.\n");
        MQTTClient_freeMessage(&message);
        MQTTClient_free(topicName);
        return 1;
    }

    // Save the received BMP image to a temporary file
    const char *bmp_file = "./received_image.bmp";
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

    // Initialize the image buffer for the new image
    Paint_NewImage(BlackImage, EPD_2in13_V4_WIDTH, EPD_2in13_V4_HEIGHT, ROTATE_90, WHITE);
    Paint_SelectImage(BlackImage);
    Paint_Clear(WHITE);

    // Check BMP dimensions before displaying
    int expected_width = EPD_2in13_V4_WIDTH;
    int expected_height = EPD_2in13_V4_HEIGHT;

    if (GUI_BMPfile_CheckDimensions(bmp_file, expected_width, expected_height)) {
        GUI_ReadBmp(bmp_file, 0, 0);
    EPD_2in13_V4_Display(BlackImage);
    printf("Image displayed on e-paper.\n");
    } else {
        fprintf(stderr, "Error: BMP dimensions do not match display. Expected %dx%d.\n", expected_width, expected_height);
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

    // Use default values if environment variables are not set
    if (!MQTT_ADDRESS) {
        MQTT_ADDRESS = "tcp://localhost:1883";  // Default MQTT broker address
    }
    if (!MQTT_CLIENTID) {
        MQTT_CLIENTID = "EPaperDisplayClient";  // Default client ID
    }

    printf("Using MQTT_ADDRESS: %s\n", MQTT_ADDRESS);
    printf("Using MQTT_CLIENTID: %s\n", MQTT_CLIENTID);

    // Initialize the e-paper display
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
        cleanup_and_exit(-1);
    }

    Paint_NewImage(BlackImage, EPD_2in13_V4_WIDTH, EPD_2in13_V4_HEIGHT, ROTATE_90, WHITE);
    Paint_SelectImage(BlackImage);
    Paint_Clear(WHITE);

    // Initial message
    Paint_DrawString_EN(0, 0, "Waiting for image...", &Font16, WHITE, BLACK);
    EPD_2in13_V4_Display(BlackImage);

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

    MQTTClient_subscribe(client, MQTT_TOPIC, QOS);

    printf("Subscribed to topic %s\n", MQTT_TOPIC);

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
