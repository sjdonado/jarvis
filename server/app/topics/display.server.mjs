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

let scheduledIntervalId = null;

/**
 * Continuously checks and sends random quotes if the scheduled interval has passed.
 * @param {number} intervalMinutes - The interval in minutes at which to send quotes.
 * @returns {void}
 */
export function scheduleRandomQuotes() {
  if (scheduledIntervalId) {
    clearInterval(scheduledIntervalId);
  }

  const checkAndSendQuote = async () => {
    const state = screenManager.getSnapshot();
    const { value, updatedAt } = state.context.randomQuotesInterval;

    if (!state.matches("active") || !value) {
      return;
    }

    if (!updatedAt || Date.now() - updatedAt >= value * 60 * 1000) {
      const quote = await getRandomQuote();

      await sendMessage(quote);
      screenManager.send({ type: "UPDATE_RANDOM_QUOTES_INTERVAL_TIMESTAMP" });
    }
  };

  const checkIntervalMs = 60 * 1000; // Check every minute
  scheduledIntervalId = setInterval(checkAndSendQuote, checkIntervalMs);

  checkAndSendQuote();
}

/**
 * Cancels the scheduled checking and sending of random quotes.
 */
export function cancelScheduledRandomQuotes() {
  if (scheduledIntervalId) {
    clearInterval(scheduledIntervalId);
    scheduledIntervalId = null;
    console.log("Scheduled quotes have been canceled.");
  }
}
