DIR_EPD      = ./lib/epd
DIR_Config   = $(DIR_EPD)/Config
DIR_FONTS    = $(DIR_EPD)/Fonts
DIR_GUI      = $(DIR_EPD)/GUI
DIR_BIN      = ./bin

SCREEN_SRC   = ./lib/screen.c
SCREEN_OBJ   = $(DIR_BIN)/screen.o

# Optional local bcm2835 bundle extracted under lib/libbcm2835
LOCAL_BCM2835_DIR = ./lib/libbcm2835
# External sysroot (when cross-compiling inside a toolchain container)
SYSROOT ?=

# Ensure bin directory exists
$(shell mkdir -p $(DIR_BIN))

TARGET = libscreen.a

EPD_SOURCES = $(wildcard $(DIR_EPD)/*.c)
EPD_OBJECTS = $(patsubst $(DIR_EPD)/%.c, $(DIR_BIN)/epd_%.o, $(EPD_SOURCES))

GUI_SOURCES = $(wildcard $(DIR_GUI)/*.c)
GUI_OBJECTS = $(patsubst $(DIR_GUI)/%.c, $(DIR_BIN)/gui_%.o, $(GUI_SOURCES))

FONTS_SOURCES = $(wildcard $(DIR_FONTS)/*.c)
FONTS_OBJECTS = $(patsubst $(DIR_FONTS)/%.c, $(DIR_BIN)/fonts_%.o, $(FONTS_SOURCES))

CONFIG_SOURCES = $(wildcard $(DIR_Config)/DEV_Config.c $(DIR_Config)/dev_hardware_SPI.c)
CONFIG_OBJECTS = $(patsubst $(DIR_Config)/%.c, $(DIR_BIN)/config_%.o, $(CONFIG_SOURCES))

# All library objects
LIB_OBJECTS = $(EPD_OBJECTS) $(GUI_OBJECTS) $(FONTS_OBJECTS) $(CONFIG_OBJECTS)
ARCHIVE_OBJECTS = $(SCREEN_OBJ) $(LIB_OBJECTS)

# Compiler options
CC ?= gcc
CFLAGS_BASE = -Wall -g -O -ffunction-sections -fdata-sections -D epd2in13V4 -D RPI
# Target Pi Zero/armv6 hard-float by default; override ARCH_FLAGS if needed
ARCH_FLAGS ?= -march=armv6 -mfpu=vfp -mfloat-abi=hard
CFLAGS ?= $(CFLAGS_BASE)
CFLAGS += $(ARCH_FLAGS)
CPPFLAGS ?=
LDFLAGS ?=

# Base library dependencies
LIBS_BASE = -lm -lpthread
LIBS ?= $(LIBS_BASE)

# Use provided SYSROOT if set (preferred for cross-compiling)
ifneq (,$(strip $(SYSROOT)))
CPPFLAGS += --sysroot=$(SYSROOT) -I$(SYSROOT)/usr/include -I$(SYSROOT)/usr/include/arm-linux-gnueabihf
LDFLAGS  += --sysroot=$(SYSROOT) -L$(SYSROOT)/usr/lib/arm-linux-gnueabihf -L$(SYSROOT)/lib/arm-linux-gnueabihf
endif

# Backend defines and libs (BCM2835 only)
CFLAGS += -D USE_BCM2835_LIB
LIBS   += -lbcm2835

# If the bundled bcm2835 exists, use its headers/libs by default
ifneq (,$(wildcard $(LOCAL_BCM2835_DIR)/include/bcm2835.h))
CPPFLAGS += -I$(LOCAL_BCM2835_DIR)/include
LDFLAGS  += -L$(LOCAL_BCM2835_DIR)/lib
endif

# Build target
all: $(TARGET)

$(TARGET): $(ARCHIVE_OBJECTS)
	ar rcs $@ $^

# Compile screen.c
$(SCREEN_OBJ): $(SCREEN_SRC)
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@ -I. -I$(DIR_EPD) -I$(DIR_Config) -I$(DIR_GUI) -I$(DIR_FONTS)

# Compile EPD sources
$(DIR_BIN)/epd_%.o: $(DIR_EPD)/%.c
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@ -I$(DIR_Config)

# Compile GUI sources
$(DIR_BIN)/gui_%.o: $(DIR_GUI)/%.c
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@ -I$(DIR_Config) -I$(DIR_FONTS)

# Compile FONTS sources
$(DIR_BIN)/fonts_%.o: $(DIR_FONTS)/%.c
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@

# Compile CONFIG sources
$(DIR_BIN)/config_%.o: $(DIR_Config)/%.c
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@

# Clean command to remove object files and the binary
clean:
	rm -f $(DIR_BIN)/*.o $(TARGET)
