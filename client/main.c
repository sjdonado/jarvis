#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <stdbool.h>  // For bool type

#include "MQTTClient.h"

#include "DEV_Config.h"
#include "Debug.h"

#include "GUI_BMPfile.h"
#include "GUI_Paint.h"
#include "fonts.h"

#include "EPD_2in13_V4.h"

#define CLIENT_ID "pizero"

#define STATUSBAR_TOPIC "statusbar"
#define DISPLAY_TOPIC "display"
#define SYSTEM_TOPIC "system"

#define QOS 1
#define TIMEOUT 10000L

#define SCREEN_WIDTH EPD_2in13_V4_WIDTH   // 122
#define SCREEN_HEIGHT EPD_2in13_V4_HEIGHT // 250
#define STATUSBAR_HEIGHT 20

UBYTE *BlackImage = NULL;
MQTTClient client = NULL;
volatile sig_atomic_t exit_requested = 0; // Flag for exiting the main loop

bool screen_on = true;

// Function to handle SIGINT (Ctrl+C)
void handle_sigint(int sig) { exit_requested = 1; }

void turn_off_screen() {
    if (BlackImage) {
        screen_on = false;

        const int delay_seconds = 2;
        printf("Screen will suspend after %d seconds.\n", delay_seconds);
        sleep(delay_seconds);

        Paint_SelectImage(BlackImage);
        Paint_Clear(WHITE);
        EPD_2in13_V4_Display_Base(BlackImage);

        printf("Screen suspended\n");
    }
}

void cleanup_and_exit(int exit_code) {
    if (client) {
        printf("Disconnecting from MQTT server...\n");
        MQTTClient_disconnect(client, 10000);
        MQTTClient_destroy(&client);
    }

    // shutdown screen
    if (BlackImage) {
        Paint_SelectImage(BlackImage);
        Paint_Clear(WHITE);
        EPD_2in13_V4_Display_Base(BlackImage);

        EPD_2in13_V4_Sleep();
        free(BlackImage);
        BlackImage = NULL;

        printf("Screen turned off\n");
    }

    exit(exit_code);
}

void turn_on_screen() {
    if (!BlackImage) {
        EPD_2in13_V4_Init_Fast();
        EPD_2in13_V4_Clear();

        UWORD Imagesize =
            ((EPD_2in13_V4_WIDTH % 8 == 0) ? (EPD_2in13_V4_WIDTH / 8)
                                           : (EPD_2in13_V4_WIDTH / 8 + 1)) *
            EPD_2in13_V4_HEIGHT;

        if ((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
            Debug("Failed to allocate memory for BlackImage...\r\n");
            cleanup_and_exit(-1);
        }

        Paint_NewImage(BlackImage, SCREEN_WIDTH, SCREEN_HEIGHT, ROTATE_90, WHITE);
        Paint_SelectImage(BlackImage);
        Paint_Clear(WHITE);

        screen_on = true;
        printf("Screen turned on\n");
    }
}

void update_statusbar(const char *status_text) {
    if (screen_on == false || !BlackImage) {
        printf("Screen is suspended, skipping status bar update.\n");
        return;
    }

    const int statusbar_y = 0;
    sFONT *font = &Font12;
    int text_width = strlen(status_text) * font->Width;
    int text_x = SCREEN_HEIGHT - text_width - 5;
    int text_y = statusbar_y + (STATUSBAR_HEIGHT - font->Height) / 2;

    Paint_ClearWindows(0, text_y, SCREEN_HEIGHT - 5, text_y + font->Height, WHITE);
    Paint_DrawString_EN(text_x, text_y, status_text, font, WHITE, BLACK);

    EPD_2in13_V4_Display_Partial(BlackImage);
}

void update_display_area(const char *bmp_file) {
    if (screen_on == false || !BlackImage) {
        printf("Screen is suspended, skipping display area update.\n");
        return;
    }

    int display_start_y = STATUSBAR_HEIGHT;
    Paint_ClearWindows(0, display_start_y, SCREEN_WIDTH - 1, SCREEN_HEIGHT - 1, WHITE);

    if (GUI_ReadBmp(bmp_file, 0, display_start_y) != 0) {
        fprintf(stderr, "Failed to read BMP image.\n");
        return;
    }

    EPD_2in13_V4_Display_Partial(BlackImage);
}

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

int msgarrvd(void *context, char *topicName, int topicLen, MQTTClient_message *message) {
    time_t now = time(NULL);
    struct tm t;
    localtime_r(&now, &t);
    char time_str[20];
    strftime(time_str, sizeof(time_str), "%Y-%m-%d %H:%M:%S", &t);

    printf("[%s] Message arrived: %s\n", time_str, topicName);

    if (message->payloadlen <= 0) {
        printf("Empty message received.\n");
        MQTTClient_freeMessage(&message);
        MQTTClient_free(topicName);
        return 1;
    }

    if (strcmp(topicName, STATUSBAR_TOPIC) == 0) {
        char status_text[256];
        snprintf(status_text, sizeof(status_text), "%.*s", message->payloadlen, (char *)message->payload);
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

        printf("BMP image saved to %s\n", bmp_file);
        if (GUI_BMPfile_CheckDimensions(bmp_file, SCREEN_HEIGHT, SCREEN_WIDTH - STATUSBAR_HEIGHT)) {
            update_display_area(bmp_file);
        } else {
            fprintf(stderr, "Error: BMP dimensions do not match display area\n");
        }
    } else if (strcmp(topicName, SYSTEM_TOPIC) == 0) {
        char system_text[256];
        snprintf(system_text, sizeof(system_text), "%.*s", message->payloadlen, (char *)message->payload);

        if (strstr(system_text, "screen:on")) {
            if (screen_on == false) {
                screen_on = true;
                printf("Screen resumed\n");
            }
        } else if (strstr(system_text, "screen:off")) {
            if (screen_on == true) {
                turn_off_screen();
            }
        }
    }

    MQTTClient_freeMessage(&message);
    MQTTClient_free(topicName);
    return 1;
}

void connlost(void *context, char *cause) {
    printf("\nConnection lost: %s\n", cause);
}

void delivered(void *context, MQTTClient_deliveryToken dt) {
    // Not used in this client since we are only subscribing
}

int parse_mqtt_uri(const char *uri, char *broker_uri, char *username, char *password) {
    if (!uri || !broker_uri || !username || !password) {
        return -1;
    }

    const char *proto_end = strstr(uri, "://");
    if (!proto_end) {
        fprintf(stderr, "Invalid MQTT URI\n");
        return -1;
    }

    // Copy the protocol (e.g., "ssl://") into broker_uri
    int proto_length = proto_end - uri + 3;
    strncpy(broker_uri, uri, proto_length);
    broker_uri[proto_length] = '\0';

    const char *auth_start = proto_end + 3;
    const char *auth_end = strchr(auth_start, '@');
    const char *host_start = auth_end ? auth_end + 1 : auth_start;

    // Capture username and password if present
    if (auth_end) {
        const char *user_end = strchr(auth_start, ':');
        if (user_end && user_end < auth_end) {
            strncpy(username, auth_start, user_end - auth_start);
            username[user_end - auth_start] = '\0';
            strncpy(password, user_end + 1, auth_end - user_end - 1);
            password[auth_end - user_end - 1] = '\0';
        } else {
            fprintf(stderr, "Invalid credentials in MQTT URI\n");
            return -1;
        }
    } else {
        username[0] = '\0';
        password[0] = '\0';
    }

    strcat(broker_uri, host_start);

    return 0;
}

int setup_mqtt_client(const char *mqtt_uri, MQTTClient *client) {
    char broker_uri[256] = {0}, username[256] = {0}, password[256] = {0};
    int use_tls = 0;

    if (parse_mqtt_uri(mqtt_uri, broker_uri, username, password) != 0) {
        fprintf(stderr, "Failed to parse MQTT URI\n");
        return -1;
    }

    if (strncmp(broker_uri, "ssl://", 6) == 0 || strncmp(broker_uri, "tls://", 6) == 0) {
        use_tls = 1;
    }

    MQTTClient_connectOptions conn_opts = MQTTClient_connectOptions_initializer;
    MQTTClient_SSLOptions ssl_opts = MQTTClient_SSLOptions_initializer;

    conn_opts.username = username;
    conn_opts.password = password;
    conn_opts.keepAliveInterval = 10;
    conn_opts.cleansession = 1;

    if (use_tls) {
        ssl_opts.verify = 1;
        ssl_opts.CApath = NULL;
        ssl_opts.keyStore = NULL;
        ssl_opts.trustStore = NULL;
        ssl_opts.privateKey = NULL;
        ssl_opts.privateKeyPassword = NULL;
        ssl_opts.enabledCipherSuites = NULL;

        conn_opts.ssl = &ssl_opts;
    }

    int rc = MQTTClient_create(client, broker_uri, CLIENT_ID, MQTTCLIENT_PERSISTENCE_NONE, NULL);
    if (rc != MQTTCLIENT_SUCCESS) {
        fprintf(stderr, "Failed to create MQTT client, return code %d\n", rc);
        printf("Broker URI: %s\n", broker_uri);
        printf("Username: %s\n", username);
        return rc;
    }

    MQTTClient_setCallbacks(*client, NULL, connlost, msgarrvd, delivered);

    rc = MQTTClient_connect(*client, &conn_opts);
    if (rc != MQTTCLIENT_SUCCESS) {
        fprintf(stderr, "Failed to connect to MQTT server, return code %d\n", rc);
        MQTTClient_destroy(client);
        *client = NULL;
        return rc;
    }

    printf("Connected to MQTT server at %s\n", broker_uri);

    return 0;
}

int main(void) {
    const char *MQTT_ADDRESS = getenv("MQTT_ADDRESS");
    if (MQTT_ADDRESS == NULL) {
        fprintf(stderr, "MQTT_ADDRESS environment variable is not set\n");
        return -1;
    }

    int rc = setup_mqtt_client(MQTT_ADDRESS, &client);
    if (rc != 0) {
        cleanup_and_exit(-1);
    }

    MQTTClient_subscribe(client, STATUSBAR_TOPIC, QOS);
    MQTTClient_subscribe(client, DISPLAY_TOPIC, QOS);
    MQTTClient_subscribe(client, SYSTEM_TOPIC, QOS);

    if (DEV_Module_Init() != 0) {
        cleanup_and_exit(-1);
    }

    turn_on_screen();

    signal(SIGINT, handle_sigint);
    printf("Running... Press Ctrl+C to exit.\n");

    while (!exit_requested) {
        usleep(500000); // Sleep for 500 ms
    }

    cleanup_and_exit(0);
}
