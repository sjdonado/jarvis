#include <arpa/inet.h>
#include <curl/curl.h>
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

#define MAX_INPUT_SIZE 1024

// Global variable for the e-paper display image buffer
UBYTE *BlackImage = NULL;

// Function to clean up and turn off the screen
void cleanup_and_exit(int exit_code) {
  printf("Turning off the screen...\n");

  if (BlackImage) {
    free(BlackImage);
    BlackImage = NULL;
  }
  EPD_2in13_V4_Clear();
  EPD_2in13_V4_Sleep();
  DEV_Module_Exit();

  exit(exit_code);
}

// Function to check for ENTER key press to exit the program
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
  Paint_ClearWindows(10, 40, EPD_2in13_V4_WIDTH, 40 + Font16.Height, WHITE);
  Paint_DrawString_EN(10, 40, text, &Font16, WHITE, BLACK);
  EPD_2in13_V4_Display_Partial(BlackImage);
}

// Function to update the clock display
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

struct ApiReqponse {
  char *memory;
  size_t size;
};

// Callback function for libcurl to write data into a memory buffer
static size_t WriteMemoryCallback(void *contents, size_t size, size_t nmemb,
                                  void *userp) {
  size_t realsize = size * nmemb;
  struct ApiReqponse *mem = (struct ApiReqponse *)userp;

  char *ptr = realloc(mem->memory, mem->size + realsize + 1);
  if (ptr == NULL) {
    printf("Not enough memory to allocate buffer for HTTP response.\n");
    return 0;
  }

  mem->memory = ptr;
  memcpy(&(mem->memory[mem->size]), contents, realsize);
  mem->size += realsize;
  mem->memory[mem->size] = 0; // Null-terminate the string

  return realsize;
}

char *fetch_daily_quote(const char *url) {
  CURL *curl_handle;
  CURLcode res;

  struct ApiReqponse chunk;
  chunk.memory = malloc(1); // Initial allocation
  chunk.size = 0;           // No data yet

  curl_global_init(CURL_GLOBAL_DEFAULT);
  curl_handle = curl_easy_init();

  if (!curl_handle) {
    fprintf(stderr, "Failed to initialize libcurl.\n");
    free(chunk.memory);
    return NULL;
  }

  curl_easy_setopt(curl_handle, CURLOPT_URL, url);
  // Set up the callback function to receive data
  curl_easy_setopt(curl_handle, CURLOPT_WRITEFUNCTION, WriteMemoryCallback);
  // Pass the chunk struct to the callback function
  curl_easy_setopt(curl_handle, CURLOPT_WRITEDATA, (void *)&chunk);
  // Set a user agent
  curl_easy_setopt(curl_handle, CURLOPT_USERAGENT, "E-Paper-Display-Agent/1.0");

  res = curl_easy_perform(curl_handle);

  if (res != CURLE_OK) {
    fprintf(stderr, "curl_easy_perform() failed: %s\n",
            curl_easy_strerror(res));
    free(chunk.memory);
    curl_easy_cleanup(curl_handle);
    return NULL;
  }

  curl_easy_cleanup(curl_handle);
  curl_global_cleanup();

  fprintf(chunk.memory, "response: %s\n",

  return chunk.memory;
}

int main(void) {
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

  Paint_NewImage(BlackImage, EPD_2in13_V4_WIDTH, EPD_2in13_V4_HEIGHT, ROTATE_90,
                 WHITE);
  Paint_SelectImage(BlackImage);
  Paint_Clear(WHITE);

  display_text("Loading...");

  // Get the quote server URL from environment variable
  const char *api_server_url = getenv("API_SERVER_URL");
  if (!api_server_url) {
    fprintf(stderr, "API_SERVER_URL environment variable not set.\n");
    cleanup_and_exit(-1);
  }

  printf("Fetching quotes from: %s\n", api_server_url);

  const char *update_freq_env = getenv("UPDATE_FREQUENCY");
  int update_frequency_hours = 12; // Default to 12 hours if not set
  if (update_freq_env) {
    update_frequency_hours = atoi(update_freq_env);
    if (update_frequency_hours <= 0) {
      fprintf(stderr,
              "Invalid UPDATE_FREQUENCY value. Using default of 12 hours.\n");
      update_frequency_hours = 12;
    }
  } else {
    printf("UPDATE_FREQUENCY not set. Using default of 12 hours.\n");
  }

  printf("Update frequency set to every %d hours.\n", update_frequency_hours);

  time_t last_update_time = 0;
  int update_interval_seconds = update_frequency_hours * 3600;

  char *quote = fetch_daily_quote(api_server_url);
  if (quote) {
    display_text(quote);
    free(quote);
    last_update_time = time(NULL);
  } else {
    display_text("Failed to load quote.");
  }

  printf("Press ENTER to exit...\n");
  while (1) {
    if (check_for_enter_press()) {
      break;
    }

    display_clock();

    // Check if it's time to update the quote
    time_t current_time = time(NULL);
    if (difftime(current_time, last_update_time) >= update_interval_seconds) {
      printf("Updating quote...\n");
      char *new_quote = fetch_daily_quote(api_server_url);
      if (new_quote) {
        display_text(new_quote);
        free(new_quote);
        last_update_time = current_time;
      } else {
        printf("Failed to update quote.\n");
      }
    }

    // Sleep for a short while to reduce CPU usage
    usleep(500000); // Sleep for 500 milliseconds
  }

  cleanup_and_exit(0);

  return 0;
}
