import fs from "fs";
import path from "path";

import { createCanvas, registerFont } from "canvas";

import { WIDTH, HEIGHT } from "../config/constants.mjs";

import { imageDataToBMP, drawCenteredText } from "../lib/canvas.server.mjs";

import { screenManager } from "../services/screenManager.server.mjs";
import { getRandomQuote } from "../services/zenquotes.server.mjs";

/**
 * Publishes a message as a BMP image to an MQTT topic.
 * @param {string} message - The text message to display on the BMP image.
 */
export async function sendMessage(message) {
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

    fs.writeFileSync("/tmp/jarvis_display.bmp", bmpBuffer);
    screenManager.send({ type: "UPDATE_DISPLAY", value: bmpBuffer });

    console.log("Submitted message:", message);
  } catch (err) {
    console.error("Failed to publish display message:", err);
  }
}

let scheduleIntervalId = null;

/**
 * Schedules the automatic sending of random quotes at a specified interval.
 * @param {number} intervalMinutes - The interval in minutes at which to send quotes.
 * @returns {Promise<void>}
 */
export async function scheduleRandomQuotes(intervalMinutes) {
  if (scheduleIntervalId) {
    clearInterval(scheduleIntervalId);
  }

  const sendQuote = async () => {
    const quote = await getRandomQuote();

    await sendMessage(quote);
    screenManager.send({ type: "UPDATE_SCHEDULED_INTERVAL", value: intervalMinutes });
  };

  const intervalMs = intervalMinutes * 60 * 1000;

  await sendQuote();
  scheduleIntervalId = setInterval(sendQuote, intervalMs);
}

/**
 * Cancels the scheduled sending of random quotes.
 */
export function cancelScheduledQuotes() {
  if (scheduleIntervalId) {
    clearInterval(scheduleIntervalId);
    scheduleIntervalId = null;
    console.log("Scheduled quotes have been canceled.");
  }
}
