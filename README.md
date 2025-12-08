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

sudo usermod -aG spi,gpio $USER
reboot
# ls -l /dev/spidev0.0   # should be group spi

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

## Automation

Run at Startup

To run Jarvis automatically at system startup, you can use `crontab`. Add the following entry to your crontab:

```
@reboot /home/sjdonado/jarvis > /home/sjdonado/jarvis.log 2>&1 &
```

This will execute the `/home/sjdonado/jarvis` script once every time the system boots up, running it in the background and redirecting its output (both standard output and standard error) to `/home/sjdonado/jarvis.log`.


---

## Technical Docs
- [Font Reference](https://github.com/waveshareteam/e-Paper/blob/master/Arduino/epd1in02d/fonts.h#L85)
- [Display Specifications](https://files.waveshare.com/upload/5/59/2.13inch_e-Paper_V3_Specificition.pdf)
