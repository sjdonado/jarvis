import fs from "fs";
import path from "path";

import { createCanvas, registerFont } from "canvas";

import { getClient, DISPLAY_TOPIC } from "./mqtt";
import { imageDataToBMP } from "../lib";

const EPD_2in13_V4_WIDTH = 122;
const EPD_2in13_V4_HEIGHT = 250;
const STATUSBAR_HEIGHT = 20;

function drawCenteredText(ctx, message, width, height, fontSize = 20, lineSpacing = 1.2) {
  ctx.font = `${fontSize}px Jersey15`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Split the message into lines
  const lines = message.split("\n");

  // Calculate the height of the entire text block
  const lineHeight = fontSize * lineSpacing;
  const textBlockHeight = lines.length * lineHeight;

  // Calculate the starting y position to center the text block vertically
  const startY = (height - textBlockHeight) / 2 + lineHeight / 2;

  // Draw each line of text centered horizontally
  lines.forEach((line, index) => {
    const yPosition = startY + index * lineHeight;
    ctx.fillText(line, width / 2, yPosition);
  });
}

export function sendMessage(message) {
  const client = getClient();

  const HEIGHT = EPD_2in13_V4_WIDTH - STATUSBAR_HEIGHT;
  const WIDTH = EPD_2in13_V4_HEIGHT;

  const fontPath = path.join("./fonts/Jersey15-Regular.ttf");
  registerFont(fontPath, { family: "Jersey15" });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawCenteredText(ctx, message, WIDTH, HEIGHT);

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
