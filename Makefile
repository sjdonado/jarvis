DIR_Config   = ./lib/Config
DIR_EPD      = ./lib/e-Paper
DIR_FONTS    = ./lib/Fonts
DIR_GUI      = ./lib/GUI
DIR_BIN      = ./bin
DIR_Examples = ./examples

# Choose the correct e-Paper version (for example, epd2in13V4)
EPD = epd2in13V4

ifeq ($(EPD), epd2in13V4)
    OBJ_C_EPD = ${DIR_EPD}/EPD_2in13_V4.c
    OBJ_C_Examples = EPD_2in13_V4_clock_socket_test.c
endif

# Define the source files required for the project
OBJ_C = $(wildcard ${OBJ_C_EPD} ${DIR_GUI}/*.c ${OBJ_C_Examples} ${DIR_Config}/*.c ${DIR_Examples}/ImageData2.c ${DIR_Examples}/ImageData.c ${DIR_FONTS}/*.c)

# Define object files by replacing .c with .o in their respective directories under bin/
OBJ_O = $(patsubst %.c,${DIR_BIN}/%.o,$(notdir ${OBJ_C}))

# Compiler options
CC = gcc
CFLAGS = -Wall -g

# Library dependencies (add libgpiod for GPIO)
LIBS = -lm -lwiringPi -lgpiod

# Target executable
TARGET = epd

# Compile the program
all: $(TARGET)

# Create the executable and apply chmod +x
$(TARGET): $(OBJ_O)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJ_O) $(LIBS)
	chmod +x $(TARGET)

# Rule to compile each .c file into its corresponding .o file in the bin directory
${DIR_BIN}/%.o: ${DIR_EPD}/%.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_GUI) -I $(DIR_EPD) -I $(DIR_FONTS)

${DIR_BIN}/%.o: ${DIR_Config}/%.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_GUI) -I $(DIR_EPD) -I $(DIR_FONTS)

${DIR_BIN}/%.o: ${DIR_GUI}/%.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_GUI) -I $(DIR_EPD) -I $(DIR_FONTS)

${DIR_BIN}/%.o: ${DIR_FONTS}/%.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_GUI) -I $(DIR_EPD) -I $(DIR_FONTS)

${DIR_BIN}/%.o: ${DIR_Examples}/%.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_GUI) -I $(DIR_EPD) -I $(DIR_FONTS)

${DIR_BIN}/%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@ -I $(DIR_Config) -I $(DIR_GUI) -I $(DIR_EPD) -I $(DIR_FONTS)

# Clean command to remove object files and the binary
clean:
	rm -f $(DIR_BIN)/*.o $(TARGET)
