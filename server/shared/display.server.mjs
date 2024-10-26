import path from "path";

import { createCanvas, registerFont } from "canvas";

import { imageDataToBMP, drawCenteredText } from "../lib";

import { getClient, DISPLAY_TOPIC } from "./mqtt.server";
import { zenquotesGetRandom } from "./services.server";

import { WIDTH, HEIGHT } from "./constants";

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
        // console.log("Welcome BMP image sent to topic", DISPLAY_TOPIC);
      }
    });

    return `data:image/bmp;base64,${bmpBuffer.toString("base64")}`;
  } catch (err) {
    console.error("Failed to create BMP buffer for welcome message:", err);
  }
}

let scheduleIntervalId = null;

export function scheduleRandomQuotes(intervalMinutes) {
  if (scheduleIntervalId) {
    clearInterval(scheduleIntervalId);
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  scheduleIntervalId = setInterval(async () => {
    const quote = await zenquotesGetRandom();

    if (quote) {
      sendMessage(quote);
      console.log("Scheduled quote sent:", quote);
    }
  }, intervalMs);
}
