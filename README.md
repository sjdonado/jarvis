# Jarvis E-Paper Display System

Display system for Raspberry Pi with a 2.13" e-Paper display, designed for continuous operation and customizable information display. Jarvis functions as a background service, delivering dynamic updates and system insights:

<div align="center">
  <img width="300" alt="IMG_5162" src="https://github.com/user-attachments/assets/7272d1fc-6dac-4a97-915f-5b6814bc9c49">
  <img width="300" alt="IMG_3603" src="https://github.com/user-attachments/assets/5b98a666-aa89-49d5-80e6-4c8cc2b04bcf">
</div>

## Setup

Build

```bash
docker run --privileged --rm --platform=linux/arm64/v8 tonistiigi/binfmt --install arm

docker buildx build --platform linux/arm/v6 -t jarvis .; and set cid (docker create jarvis /out/jarvis); and docker cp "$cid:/out/jarvis" ./jarvis; and docker rm "$cid"
```

Deploy
```
scp ./jarvis sjdonado@pizero.local:~/jarvis
```

Raspberry Pi Setup

```bash
sudo apt update
sudo apt-get update

sudo locale-gen en_US.UTF-8
sudo dpkg-reconfigure locales

~/jarvis > ~/jarvis.log 2>&1 &
```

Make sure `sudo nvim /boot/firmware/config.txt` looks like this:
```
dtparam=spi=on

[all]
enable_uart=1
dtoverlay=disable-bt
```
otherwise, run `sudo raspi-config` and enable Interface Options > I4 and Interface Options > I6

## Automation (systemd service)

Run Jarvis automatically at startup via systemd (preferred over cron):

1) Create `/etc/systemd/system/jarvis.service`:
```
[Unit]
Description=Jarvis Service

[Service]
ExecStart=/bin/sh -c '/home/sjdonado/jarvis > /home/sjdonado/jarvis.log 2>&1'
Restart=always
User=root
WorkingDirectory=/home/sjdonado

[Install]
WantedBy=multi-user.target
```

2) Enable SPI (`sudo raspi-config` > Interface > SPI) and add the user to `spi,gpio` if not running as root:
```
sudo usermod -aG spi,gpio pi
```

3) Start and enable:
```
sudo systemctl daemon-reload
sudo systemctl enable --now jarvis.service
```
The service runs continuously, rotating between quotes and countdowns.

Turn off screen:
```
sudo systemctl stop jarvis.service
```
## Technical Docs
- [Font Reference](https://github.com/waveshareteam/e-Paper/blob/master/Arduino/epd1in02d/fonts.h#L85)
- [Display Specifications](https://files.waveshare.com/upload/5/59/2.13inch_e-Paper_V3_Specificition.pdf)
