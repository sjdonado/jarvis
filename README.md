# Jarvis E-Paper Display CLI

> Jarvis It's alive! Here to inspire and keep a watchful eye on things 👀

<img width="1200" alt="Screenshot 2024-10-29 at 07 44 21" src="https://github.com/user-attachments/assets/20e35afc-239d-4d34-8cd2-2744ec79401b">

<div align="center">
  <img width="300" alt="IMG_3603" src="https://github.com/user-attachments/assets/5b98a666-aa89-49d5-80e6-4c8cc2b04bcf">
  <img width="300" alt="IMG_3602" src="https://github.com/user-attachments/assets/90aabb81-2482-47b3-92b3-75cb0453bb5c">
</div>

A CLI-based e-paper display controller for Raspberry Pi with 2.13" e-Paper display. Control your display directly via SSH with simple commands.

## Features

- **Screen Control**: Turn the display on/off
- **Display Modes**: Light and dark mode support
- **Message Layouts**: Display messages in top, center, or bottom positions
- **Persistence**: Latest message is saved to disk when screen is off
- **Direct CLI Access**: Perfect for SSH connections and automation

## Setup

```bash
sudo apt update
sudo apt-get update

sudo apt-get install python3-pip gpiod libgpiod-dev

sudo locale-gen en_US.UTF-8
sudo dpkg-reconfigure locales

wget https://github.com/joan2937/lg/archive/master.zip
unzip master.zip
cd lg-master
make
sudo make install

wget http://www.airspayce.com/mikem/bcm2835/bcm2835-1.71.tar.gz
tar zxvf bcm2835-1.71.tar.gz
cd bcm2835-1.71/
sudo ./configure && sudo make && sudo make check && sudo make install

wget https://github.com/WiringPi/WiringPi/releases/download/3.10/wiringpi_3.10_armhf.deb
sudo apt install ./wiringpi_3.10_armhf.deb
```

Make sure `sudo nvim /boot/firmware/config.txt` looks like this:
```
dtparam=spi=on

[all]
enable_uart=1
dtoverlay=disable-bt
```
otherwise, run `sudo raspi-config` and enable Interface Options > I4 and Interface Options > I6

## Build

```sh
sudo make clean && sudo make
```

## Usage

### Basic Commands

```sh
# Turn screen on
sudo ./jarvis --on

# Turn screen off
sudo ./jarvis --off

# Switch to light mode
sudo ./jarvis --light

# Switch to dark mode
sudo ./jarvis --dark

# Display help
sudo ./jarvis --help
```

### Display Messages

```sh
# Display message in center (default)
sudo ./jarvis --message "Hello World"

# Display message at the top
sudo ./jarvis --message "Status Update" --layout top

# Display message at the bottom
sudo ./jarvis --message "System Ready" --layout bottom

# Display message in dark mode
sudo ./jarvis --dark --message "Dark mode message"
```

### Combined Commands

```sh
# Turn on screen and display message
sudo ./jarvis --on --message "System Started" --layout top

# Switch to dark mode and display centered message
sudo ./jarvis --dark --message "Welcome to Jarvis"
```

## Persistence

When the screen is off, the latest message is automatically saved to `/tmp/jarvis_state.txt`. When you turn the screen back on, the stored message will be displayed automatically.

```sh
# This message will be saved when screen is off
sudo ./jarvis --message "Latest message" --layout top

# Turn screen on - will display the stored message
sudo ./jarvis --on
```

## State Management

The application maintains its state (screen on/off, display mode, latest message) in `/tmp/jarvis_state.txt`.

---

## Technical Docs
- [Font Reference](https://github.com/waveshareteam/e-Paper/blob/master/Arduino/epd1in02d/fonts.h#L85)
- [Display Specifications](https://files.waveshare.com/upload/5/59/2.13inch_e-Paper_V3_Specificition.pdf)
