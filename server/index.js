const os = require("os");
const fs = require("fs");

const mqtt = require("mqtt");
const { createCanvas } = require("canvas");

const { imageDataToBMP } = require("./lib");

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

// Function to send the welcome message to the 'display' topic
function sendWelcomeMessage() {
  const WIDTH = 122;
  const HEIGHT = 250;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Fill background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw welcome message
  ctx.fillStyle = "black";
  ctx.font = "bold 20px Arial";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("Welcome!", WIDTH / 2, HEIGHT / 2);

  try {
    // Get image data and convert to BMP
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const bmpBuffer = imageDataToBMP(imageData, WIDTH, HEIGHT);

    // Save BMP for debugging (optional)
    const filePath = "/tmp/jarvis_display.bmp";
    fs.writeFileSync(filePath, bmpBuffer);
    console.log(`Welcome BMP image saved to disk at ${filePath}`);

    // Publish BMP via MQTT to 'display' topic
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

// Function to send system usage to the 'statusbar' topic
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
