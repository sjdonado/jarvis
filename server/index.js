const os = require("os");
const fs = require("fs");
const path = require("path");

const mqtt = require("mqtt");
const { createCanvas } = require("canvas");

const { imageDataToBMP } = require("./lib");

const MQTT_TOPIC = "display";
const MQTT_SERVER = process.env.MQTT_SERVER_URL || "mqtt://localhost:1883";
const client = mqtt.connect(MQTT_SERVER);

client.on("connect", () => {
  console.log("Connected to MQTT broker at", MQTT_SERVER);
  sendBmpImage();
});

client.on("error", (err) => {
  console.error("MQTT error:", err);
});

async function sendBmpImage() {
  const WIDTH = 122;
  const HEIGHT = 250;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Fill background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Get CPU and memory usage
  const cpuLoad = os.loadavg()[0].toFixed(2); // 1-minute load average
  const totalMem = os.totalmem() / (1024 * 1024); // MB
  const freeMem = os.freemem() / (1024 * 1024); // MB
  const usedMem = totalMem - freeMem;
  const memUsage = ((usedMem / totalMem) * 100).toFixed(2);

  const cpuText = `CPU Load: ${cpuLoad}`;
  const memText = `Memory Usage: ${memUsage}%`;

  // Rotate content
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate((90 * Math.PI) / 180);
  ctx.translate(-HEIGHT / 2, -WIDTH / 2);

  ctx.fillStyle = "black";
  ctx.font = "bold 20px Arial";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(cpuText, HEIGHT / 2, WIDTH / 2 - 20);
  ctx.fillText(memText, HEIGHT / 2, WIDTH / 2 + 20);
  ctx.restore();

  try {
    // Get image data and convert to BMP
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const bmpBuffer = imageDataToBMP(imageData, WIDTH, HEIGHT);

    // Save BMP for debugging
    fs.writeFileSync("/tmp/system_usage.bmp", bmpBuffer);
    console.log(`BMP image saved to disk at ${filePath}`);

    // Publish BMP via MQTT
    client.publish(MQTT_TOPIC, bmpBuffer, { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error("Failed to publish BMP image:", err);
      } else {
        console.log("BMP image with system usage sent to topic", MQTT_TOPIC);
      }
    });
  } catch (err) {
    console.error("Failed to create BMP buffer:", err);
  }
}

setInterval(sendBmpImage, 1500); // every 1,5 seconds
