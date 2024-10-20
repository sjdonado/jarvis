DIR_Config   = ./lib/Config
DIR_EPD      = ./lib/e-Paper
DIR_FONTS    = ./lib/Fonts
DIR_GUI      = ./lib/GUI
DIR_BIN      = ./bin

# Ensure bin directory exists
$(shell mkdir -p $(DIR_BIN))

# Choose the correct e-Paper version (for example, epd2in13V4)
EPD = epd2in13V4

ifeq ($(EPD), epd2in13V4)
    OBJ_C_EPD = ${DIR_EPD}/EPD_2in13_V4.c
endif

# Target executable
TARGET = epd
SRC_FILE ?= test.c  # or main.c

# Define the source files required for the project
OBJ_C = $(wildcard ${OBJ_C_EPD} ${DIR_GUI}/*.c ${SRC_FILE} ${DIR_FONTS}/*.c)

# Define object files by replacing .c with .o in their respective directories under bin/
OBJ_O = $(patsubst %.c,${DIR_BIN}/%.o,$(notdir ${OBJ_C}))

# Device-specific object files
DEV_OBJ = $(DIR_BIN)/DEV_Config.o $(DIR_BIN)/dev_hardware_SPI.o $(DIR_BIN)/RPI_gpiod.o

# Compiler options
CC = gcc
CFLAGS = -Wall -g -O -ffunction-sections -fdata-sections -D $(EPD) -D USE_DEV_LIB -D RPI

# Library dependencies (use libgpiod for GPIO)
LIBS = -lm -lgpiod

# Compile the program
all: $(TARGET)

# Create the executable and apply chmod +x
$(TARGET): $(OBJ_O) $(DEV_OBJ)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJ_O) $(DEV_OBJ) $(LIBS)
	chmod +x $(TARGET)

# Rule to compile each .c file into its corresponding .o file in the bin directory
${DIR_BIN}/%.o: ${DIR_EPD}/%.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_GUI) -I $(DIR_FONTS)

${DIR_BIN}/%.o: ${DIR_GUI}/%.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_FONTS)

${DIR_BIN}/%.o: ${DIR_FONTS}/%.c
	$(CC) $(CFLAGS) -c $< -o $@

${DIR_BIN}/%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_GUI) -I $(DIR_FONTS) -I $(DIR_EPD)

# Compile device-specific source files
$(DIR_BIN)/DEV_Config.o: $(DIR_Config)/DEV_Config.c
	$(CC) $(CFLAGS) -c $< -o $@

$(DIR_BIN)/dev_hardware_SPI.o: $(DIR_Config)/dev_hardware_SPI.c
	$(CC) $(CFLAGS) -c $< -o $@

$(DIR_BIN)/RPI_gpiod.o: $(DIR_Config)/RPI_gpiod.c
	$(CC) $(CFLAGS) -c $< -o $@

# Clean command to remove object files and the binary
clean:
	rm -f $(DIR_BIN)/*.o $(TARGET)
