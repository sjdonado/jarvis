DIR_Config   = ./lib/Config
DIR_EPD      = ./lib/e-Paper
DIR_FONTS    = ./lib/Fonts
DIR_GUI      = ./lib/GUI
DIR_BIN      = ./bin

# Ensure bin directory exists
$(shell mkdir -p $(DIR_BIN))

# Target executable
TARGET = jarvis

# Source files
SRC_MAIN = main.c

EPD_SOURCES = $(wildcard $(DIR_EPD)/*.c)
EPD_OBJECTS = $(patsubst $(DIR_EPD)/%.c, $(DIR_BIN)/epd_%.o, $(EPD_SOURCES))

GUI_SOURCES = $(wildcard $(DIR_GUI)/*.c)
GUI_OBJECTS = $(patsubst $(DIR_GUI)/%.c, $(DIR_BIN)/gui_%.o, $(GUI_SOURCES))

FONTS_SOURCES = $(wildcard $(DIR_FONTS)/*.c)
FONTS_OBJECTS = $(patsubst $(DIR_FONTS)/%.c, $(DIR_BIN)/fonts_%.o, $(FONTS_SOURCES))

CONFIG_SOURCES = $(wildcard $(DIR_Config)/DEV_Config.c $(DIR_Config)/dev_hardware_SPI.c $(DIR_Config)/RPI_gpiod.c)
CONFIG_OBJECTS = $(patsubst $(DIR_Config)/%.c, $(DIR_BIN)/config_%.o, $(CONFIG_SOURCES))

# All library objects
LIB_OBJECTS = $(EPD_OBJECTS) $(GUI_OBJECTS) $(FONTS_OBJECTS) $(CONFIG_OBJECTS)

# Main object
MAIN_OBJECT = $(DIR_BIN)/main.o

# Compiler options
CC = gcc
CFLAGS = -Wall -g -O -ffunction-sections -fdata-sections -D epd2in13V4 -D USE_DEV_LIB -D RPI

# Library dependencies
LIBS = -lm -lgpiod -lpaho-mqtt3c -lpthread -lwiringPi

# Build target
all: $(TARGET)

$(TARGET): $(MAIN_OBJECT) $(LIB_OBJECTS)
	$(CC) $(CFLAGS) -o $@ $^ $(LIBS)
	chmod +x $(TARGET)

# Compile main.c
$(DIR_BIN)/main.o: main.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_GUI) -I $(DIR_FONTS) -I $(DIR_EPD)

# Compile EPD sources
$(DIR_BIN)/epd_%.o: $(DIR_EPD)/%.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config)

# Compile GUI sources
$(DIR_BIN)/gui_%.o: $(DIR_GUI)/%.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_FONTS)

# Compile FONTS sources
$(DIR_BIN)/fonts_%.o: $(DIR_FONTS)/%.c
	$(CC) $(CFLAGS) -c $< -o $@ 

# Compile CONFIG sources
$(DIR_BIN)/config_%.o: $(DIR_Config)/%.c
	$(CC) $(CFLAGS) -c $< -o $@ 

# Clean command to remove object files and the binary
clean:
	rm -f $(DIR_BIN)/*.o $(TARGET)
