import fs from "fs";
import path from "path";

import { createCanvas, registerFont } from "canvas";

import { client, DISPLAY_TOPIC } from "./mqtt";
import { imageDataToBMP } from "../lib";

const EPD_2in13_V4_WIDTH = 122;
const EPD_2in13_V4_HEIGHT = 250;
const STATUSBAR_HEIGHT = 20;

export function displayMessage(message) {
  const HEIGHT = EPD_2in13_V4_WIDTH - STATUSBAR_HEIGHT;
  const WIDTH = EPD_2in13_V4_HEIGHT;

  const fontPath = path.join(__dirname, "fonts", "Jersey15-Regular.ttf");
  registerFont(fontPath, { family: "Jersey15" });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "black";
  ctx.font = "16px Jersey15";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(message, WIDTH / 2, HEIGHT / 2);

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
