> Jarvis It’s alive! Here to inspire and keep a watchful eye on things 👀

<img width="1710" alt="Screenshot 2024-10-26 at 18 05 29" src="https://github.com/user-attachments/assets/d4b7b140-abf6-49e9-a393-36c624b63031">

![IMG_3595](https://github.com/user-attachments/assets/0dbffe79-0256-4a4a-a1b6-f48be7b730f1)


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
