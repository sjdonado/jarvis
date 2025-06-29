# Jarvis E-Paper Display CLI

A CLI-based e-paper display controller for Raspberry Pi with 2.13" e-Paper display:

- **Screen Control**: Turn the display on/off
- **Display Modes**: Light and dark mode support
- **Message Layouts**: Display messages in top or center positions
- **Persistence**: Latest message is saved to disk when screen is off
- **Direct CLI Access**: Perfect for SSH connections and automation
- **System Monitoring**: Scripts for sending system stats from remote machines

<div align="center">
  <img width="300" alt="IMG_5162" src="https://github.com/user-attachments/assets/7272d1fc-6dac-4a97-915f-5b6814bc9c49">
  <img width="300" alt="IMG_3603" src="https://github.com/user-attachments/assets/5b98a666-aa89-49d5-80e6-4c8cc2b04bcf">
</div>

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
jarvis --on
jarvis --off

jarvis --light
jarvis --dark

jarvis --help
```

### Display Messages

```
y=0-2:    Top margin (2px)
y=2-22:   Navbar area (20px)
y=22-119: Main content (97px)
y=119-122: Bottom margin (3px)
```

```sh
# Display message at the top
jarvis --message "Status Update" --layout topbar

# Display message in center (default)
jarvis --message "Main message here" --layout main

# Display message in dark mode
jarvis --dark --message "Dark mode message"
```

## Persistence

When the screen is off, the latest message is automatically saved to `/tmp/jarvis_state.txt`. When you turn the screen back on, the stored message will be displayed automatically.

```sh
# This message will be saved when screen is off
jarvis --message "Latest message" --layout topbar

# Turn screen on - will display the stored message
jarvis --on
```

## Automation

New script `init` in the home folder

```bash
#!/usr/bin/env bash

/home/sjdonado/jarvis/scripts/countdown_topbar.sh && /home/sjdonado/jarvis/scripts/quote_of_the_day.sh && jarvis --on
```

```
0 4 * * * /home/sjdonado/jarvis/init
```

Edit `/etc/rc.local`
```
/home/sjdonado/jarvis/init
```

## State Management

The application maintains its state (screen on/off, display mode, latest message) in `/tmp/jarvis_state.txt`.

---

## Technical Docs
- [Font Reference](https://github.com/waveshareteam/e-Paper/blob/master/Arduino/epd1in02d/fonts.h#L85)
- [Display Specifications](https://files.waveshare.com/upload/5/59/2.13inch_e-Paper_V3_Specificition.pdf)
