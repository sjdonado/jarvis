const mqtt = require("mqtt");
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

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

  // Fill the canvas background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Rotate content within the canvas without altering dimensions
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate((90 * Math.PI) / 180);
  ctx.translate(-HEIGHT / 2, -WIDTH / 2); // Adjust translation to center rotated content

  ctx.fillStyle = "black";
  ctx.font = "bold 20px Arial";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("Hello World", HEIGHT / 2, WIDTH / 2);
  ctx.restore();

  try {
    // Get raw image data from the canvas
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    
    // Prepare BMP file header and DIB header
    const headerSize = 54; // BMP header is always 54 bytes
    const pixelArraySize = WIDTH * HEIGHT * 4; // 4 bytes per pixel (BGRA)
    const bmpSize = headerSize + pixelArraySize;
    const bmpBuffer = Buffer.alloc(bmpSize);
    
    // BMP Header
    bmpBuffer.write('BM', 0); // Signature (2 bytes)
    bmpBuffer.writeUInt32LE(bmpSize, 2); // File size (4 bytes)
    bmpBuffer.writeUInt16LE(0, 6); // Reserved1 (2 bytes)
    bmpBuffer.writeUInt16LE(0, 8); // Reserved2 (2 bytes)
    bmpBuffer.writeUInt32LE(headerSize, 10); // Offset to pixel data (4 bytes)

    // DIB Header (BITMAPINFOHEADER)
    bmpBuffer.writeUInt32LE(40, 14); // DIB header size (4 bytes)
    bmpBuffer.writeInt32LE(WIDTH, 18); // Width (4 bytes)
    bmpBuffer.writeInt32LE(HEIGHT, 22); // Height (4 bytes)
    bmpBuffer.writeUInt16LE(1, 26); // Number of color planes (2 bytes)
    bmpBuffer.writeUInt16LE(32, 28); // Bits per pixel (2 bytes)
    bmpBuffer.writeUInt32LE(0, 30); // Compression (4 bytes)
    bmpBuffer.writeUInt32LE(pixelArraySize, 34); // Size of raw bitmap data (4 bytes)
    bmpBuffer.writeInt32LE(2835, 38); // Horizontal resolution (pixels per meter) (4 bytes)
    bmpBuffer.writeInt32LE(2835, 42); // Vertical resolution (pixels per meter) (4 bytes)
    bmpBuffer.writeUInt32LE(0, 46); // Number of colors in the palette (4 bytes)
    bmpBuffer.writeUInt32LE(0, 50); // Important colors (4 bytes)

    // Write pixel data (BGRA format)
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const srcIndex = (y * WIDTH + x) * 4; // RGBA index in imageData
        const b = imageData.data[srcIndex + 2]; // Blue
        const g = imageData.data[srcIndex + 1]; // Green
        const r = imageData.data[srcIndex];     // Red
        const a = imageData.data[srcIndex + 3]; // Alpha

        const destIndex = headerSize + ((HEIGHT - y - 1) * WIDTH + x) * 4; // Flipped vertically
        bmpBuffer[destIndex] = b;       // Blue
        bmpBuffer[destIndex + 1] = g;   // Green
        bmpBuffer[destIndex + 2] = r;   // Red
        bmpBuffer[destIndex + 3] = a;   // Alpha
      }
    }

    // Save the BMP file for debugging
    const filePath = path.join(__dirname, "hello_world.bmp");
    fs.writeFileSync(filePath, bmpBuffer);
    console.log(`BMP image saved to disk at ${filePath}`);

    // Publish the BMP image to MQTT
    client.publish(MQTT_TOPIC, bmpBuffer, { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error("Failed to publish BMP image:", err);
      } else {
        console.log('BMP image with "Hello World" sent to topic', MQTT_TOPIC);
      }
    });
  } catch (err) {
    console.error("Failed to create BMP buffer:", err);
  }
}

sendBmpImage();
setInterval(sendBmpImage, 60000);
