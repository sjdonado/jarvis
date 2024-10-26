> Jarvis It’s alive! Here to inspire and keep a watchful eye on things 👀

<div align="center">
  <img width="600" alt="Screenshot 2024-10-26 at 21 04 26" src="https://github.com/user-attachments/assets/e5359978-0764-4b8f-af0d-92fee8d34514">
  <img width="300" alt="IMG_3599" src="https://github.com/user-attachments/assets/3f196904-bfba-4b0c-bb10-2b99a08a3b22">
</div>

<div align="center">
  <img width="600" alt="Screenshot 2024-10-26 at 21 50 01" src="https://github.com/user-attachments/assets/093683cd-09ef-46ac-855e-ff9eb8c49273">
  <img width="300" alt="IMG_3599" src="https://github.com/user-attachments/assets/017956e5-9368-4efc-bd0f-fa1b8a50aa8c">
</div>

## Setup

```bash
sudo apt update
sudo apt-get update

sudo apt-get install python3-pip gpiod libgpiod-dev libpaho-mqtt-dev libssl-dev

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
otherwise, run `sudo raspi-config` and enable Inerface Options > I4 and Interface Options > I6

## Run

- Server
```bash
export MQTT_ADDRESS="ssl://<username>:<password>@<host>:<port>"
export SERVER_API_KEY=
export SESSION_SECRET=
export UNAMI_URI=
npm start
```

- Client
```bash
sudo make clean && sudo make
export MQTT_ADDRESS="ssl://<username>:<password>@<host>:<port>" && ./jarvis
```

---

## Docs
- https://github.com/waveshareteam/e-Paper/blob/master/Arduino/epd1in02d/fonts.h#L85
- https://files.waveshare.com/upload/5/59/2.13inch_e-Paper_V3_Specificition.pdf
