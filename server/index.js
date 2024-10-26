const os = require("os");
const fs = require("fs");
const path = require("path");

const mqtt = require("mqtt");
const { createCanvas, registerFont } = require("canvas");

const { imageDataToBMP } = require("./lib");

const EPD_2in13_V4_WIDTH = 122;
const EPD_2in13_V4_HEIGHT = 250;
const STATUSBAR_HEIGHT = 20;

const STATUSBAR_TOPIC = "statusbar";
const DISPLAY_TOPIC = "display";

const MQTT_SERVER = process.env.MQTT_SERVER_URL || "mqtt://localhost:1883";
const client = mqtt.connect(MQTT_SERVER);

client.on("connect", () => {
  console.log("Connected to MQTT broker at", MQTT_SERVER);
  sendWelcomeMessage(); // Send welcome message once
  sendSystemUsage(); // Send initial system usage
  setInterval(sendSystemUsage, 1500); // Send system usage every 1.5 seconds
});

client.on("error", (err) => {
  console.error("MQTT error:", err);
});

function sendWelcomeMessage() {
  const HEIGHT = EPD_2in13_V4_WIDTH - STATUSBAR_HEIGHT;
  const WIDTH = EPD_2in13_V4_HEIGHT;

  const fontPath = path.join(__dirname, "fonts", "Jersey15-Regular.ttf");
  registerFont(fontPath, { family: "Jersey15" });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "black";
  ctx.font = "20px Jersey15";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("Welcome!", WIDTH / 2, HEIGHT / 2);

  try {
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const bmpBuffer = imageDataToBMP(imageData, WIDTH, HEIGHT);

    const filePath = "/tmp/jarvis_display.bmp";
    fs.writeFileSync(filePath, bmpBuffer);
    console.log(`Welcome BMP image saved to disk at ${filePath}`);

    client.publish(DISPLAY_TOPIC, bmpBuffer, { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error("Failed to publish welcome BMP image:", err);
      } else {
        console.log("Welcome BMP image sent to topic", DISPLAY_TOPIC);
      }
    });
  } catch (err) {
    console.error("Failed to create BMP buffer for welcome message:", err);
  }
}

function sendSystemUsage() {
  const cpuLoad = os.loadavg()[0].toFixed(2); // 1-minute load average
  const totalMem = os.totalmem() / (1024 * 1024); // MB
  const freeMem = os.freemem() / (1024 * 1024); // MB
  const usedMem = totalMem - freeMem;
  const memUsage = ((usedMem / totalMem) * 100).toFixed(2);

  const statusText = `CPU: ${cpuLoad} | Mem: ${memUsage}%`;

  client.publish(STATUSBAR_TOPIC, statusText, { qos: 1, retain: false }, (err) => {
    if (err) {
      console.error("Failed to publish system usage:", err);
    } else {
      console.log("System usage BMP image sent to topic", STATUSBAR_TOPIC);
    }
  });
}
