const mqtt = require("mqtt");
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");
const bmp = require("bmp-js");

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
 z

function sendBmpImage() {
  const WIDTH = 100;
  const HEIGHT = 100;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "black";
  ctx.font = "bold 15px Arial";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("Hello World", WIDTH / 2, HEIGHT / 2);

  try {
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);

    const bmpBuffer = bmp.encode({
      data: imageData.data,
      width: WIDTH,
      height: HEIGHT,
    }).data;

    // debugging
    const filePath = path.join(__dirname, "hello_world.bmp");
    fs.writeFileSync(filePath, bmpBuffer);
    console.log(`BMP image saved to disk at ${filePath}`);

    client.publish(MQTT_TOPIC, bmpBuffer, { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error("Failed to publish BMP image:", err);
      } else {
        console.log('BMP image with "Hello World" sent to topic', MQTT_TOPIC);
      }
    });
  } catch (err) {
    console.error("Failed to create BMP buffer:", err);
    return;
  }
}

setInterval(sendBmpImage, 60000);
