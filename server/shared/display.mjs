import path from "path";

import { createCanvas, registerFont } from "canvas";

import { getClient, DISPLAY_TOPIC } from "./mqtt";
import { imageDataToBMP, drawCenteredText } from "../lib";

const EPD_2in13_V4_WIDTH = 122;
const EPD_2in13_V4_HEIGHT = 250;
const STATUSBAR_HEIGHT = 20;

const HEIGHT = EPD_2in13_V4_WIDTH - STATUSBAR_HEIGHT;
const WIDTH = EPD_2in13_V4_HEIGHT;

export const PLACEHOLDER_IMAGE = `data:image/png;base64,${Buffer.from(
  createCanvas(WIDTH, HEIGHT).toBuffer("image/png")
).toString("base64")}`;

export function sendMessage(message) {
  const client = getClient();

  const fontPath = path.join("./fonts/PixelOperator.ttf");
  registerFont(fontPath, { family: "PixelOperator" });

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawCenteredText(ctx, message, WIDTH, HEIGHT);

  try {
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const bmpBuffer = imageDataToBMP(imageData, WIDTH, HEIGHT);

    // fs.writeFileSync("/tmp/jarvis_display.bmp", bmpBuffer);

    client.publish(DISPLAY_TOPIC, bmpBuffer, { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error("Failed to publish welcome BMP image:", err);
      } else {
        console.log("Welcome BMP image sent to topic", DISPLAY_TOPIC);
      }
    });

    return `data:image/bmp;base64,${bmpBuffer.toString("base64")}`;
  } catch (err) {
    console.error("Failed to create BMP buffer for welcome message:", err);
  }
}
