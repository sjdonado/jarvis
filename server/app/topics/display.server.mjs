import path from "path";

import { createCanvas, registerFont } from "canvas";

import { WIDTH, HEIGHT } from "../config/constants.mjs";

import { imageDataToBMP, drawCenteredText } from "../lib/canvas.server.mjs";
import { getClient, DISPLAY_TOPIC } from "../lib/mqtt.server.mjs";

import { getRandomQuote } from "../services/zenquotes.server.mjs";

export async function sendMessage(message) {
  const client = await getClient();

  const fontPath = path.join("./fonts/PixelOperator.ttf");
  registerFont(fontPath, { family: "PixelOperator" });

  const canvas = createCanvas(WIDTH, HEIGHT);

  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawCenteredText(ctx, message, WIDTH, HEIGHT);

  try {
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const bmpBuffer = imageDataToBMP(imageData, WIDTH, HEIGHT);

    // fs.writeFileSync("/tmp/jarvis_display.bmp", bmpBuffer);

    client.publish(DISPLAY_TOPIC, bmpBuffer, { qos: 2, retain: false }, (err) => {
      if (err) {
        console.error("Failed to publish welcome BMP image:", err);
      } else {
        // console.log("Welcome BMP image sent to topic", DISPLAY_TOPIC);
      }
    });

    return `data:image/bmp;base64,${bmpBuffer.toString("base64")}`;
  } catch (err) {
    console.error("Failed to publish display message:", err);
  }
}

let scheduleIntervalId = null;

export async function scheduleRandomQuotes(intervalMinutes) {
  if (scheduleIntervalId) {
    clearInterval(scheduleIntervalId);
  }

  const sendQuote = async () => {
    const quote = await getRandomQuote();

    await sendMessage(quote);
    console.log("Scheduled quote sent:", quote);
  };

  const intervalMs = intervalMinutes * 60 * 1000;

  await sendQuote();
  scheduleIntervalId = setInterval(sendQuote, intervalMs);
}

export function cancelScheduledQuotes() {
  if (scheduleIntervalId) {
    clearInterval(scheduleIntervalId);
    scheduleIntervalId = null;
    console.log("Scheduled quotes have been canceled.");
  }
}
