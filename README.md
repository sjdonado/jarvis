# Client

## Setup

```bash
sudo apt update
sudo apt-get update

sudo apt-get install python3-pip gpiod libgpiod-dev libcoap2 libcoap2-dev

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

```bash
sudo make clean && sudo make
export COAP_SERVER_URI="coap://localhost:5683"
```

## Send a message
```bash
echo "Connected!" | sudo nc -U /tmp/epd_socket
```

1. Basic information:
This routine has been verified using the e-paper Driver HAT module. 
You can view the corresponding test routines in the \lib\Examples\ 
of the project.

2. Pin connection:
Pin connection You can view it in DEV_Config.h in the \lib\Config\ directory, and repeat it here:
EPD    =>    Jetson Nano/RPI(BCM)
VCC    ->    3.3
GND    ->    GND
DIN    ->    10(SPI0_MOSI)
CLK    ->    11(SPI0_SCK)
CS     ->    8(SPI0_CS0)
DC     ->    25
RST    ->    17
BUSY   ->    24

3. Basic use:
Since this project is a comprehensive project, you may need to read the following for use:
You can see many test functions and macro definition Settings in main.c.
Specifying the macro definition for the EPD at compile time can directly compile the corresponding test program.
Please pay attention to which type of ink screen you buy. For detailed correspondence, see our Wiki and list.txt file.
Example 1:
     If you buy 3.7inch e-paper (V1) then you should add EPD=epd3in7 at compile time
        sudo make clean
        sudo make EPD=epd3in7
Example 2:
    If you buy a 2.9-inch e-paper (B) (V1), you should add EPD=epd2IN9bc at compile time since the 2.9-inch type B and Type C are common driver code
        sudo make clean
        sudo make EPD=epd2in9bc
Example 3:
    If you buy a 7.5-inch e-paper (V2), you should add EPD=epd7in5V2 at compile time
        sudo make clean
        sudo make EPD=epd7in5V2

An executable file is then generated: epd
Run: sudo ./epd
If you modify the program, you need to run: make clear, and then make again.

4. Directory structure (selection):
If you use our products frequently, we will be very familiar with our program directory structure. We have a copy of the specific function.
The API manual for the function, you can download it on our WIKI or request it as an after-sales customer service. Here is a brief introduction:
Config\: This directory is a hardware interface layer file. You can see many definitions in DEV_Config.c(.h), including:
   type of data;
    GPIO;
    Read and write GPIO;
    Delay: Note: This delay function does not use an oscilloscope to measure specific values.
    Module Init and exit processing:
        void DEV_Module_Init(void);
        void DEV_Module_Exit(void);
        Note: 1. Here is the processing of some GPIOs before and after using the ink screen.
              2. For the PCB with Rev2.1, the entire module will enter low power consumption after DEV_Module_Exit(). After testing, the power consumption is basically 0;
             
\lib\GUI\: This directory is some basic image processing functions, in GUI_Paint.c(.h):
    Common image processing: creating graphics, flipping graphics, mirroring graphics, setting pixels, clearing screens, etc.
    Common drawing processing: drawing points, lines, boxes, circles, Chinese characters, English characters, numbers, etc.;
    Common time display: Provide a common display time function;
    Commonly used display pictures: provide a function to display bitmaps;
    
\lib\Fonts\: for some commonly used fonts:
    Ascii:
        Font8: 5*8
        Font12: 7*12
        Font16: 11*16
        Font20: 14*20
        Font24: 17*24
    Chinese:
        font12CN: 16*21
        font24CN: 32*41
        
\lib\E-paper\: This screen is the ink screen driver function;
Examples\: This is the test program for the ink screen. You can see the specific usage method in it.
