import path from "path";

import { createCanvas, registerFont } from "canvas";

import { WIDTH, HEIGHT } from "./constants.mjs";

import { imageDataToBMP, drawCenteredText } from "./canvas.server.mjs";
import { getClient, DISPLAY_TOPIC, STATUSBAR_TOPIC } from "./mqtt.server.mjs";
import { getCpuUsage, getMemUsage } from "./os.server.mjs";

import { getRandomQuote } from "../services/zenquotes.server.mjs";
import { fetchUmamiData } from "../services/umami.server.mjs";

let _canvas;

const getCanvas = () => {
  if (!_canvas) {
    _canvas = createCanvas(WIDTH, HEIGHT);
  }

  const ctx = _canvas.getContext("2d", { alpha: false, desynchronized: true });

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.beginPath();

  return ctx;
};

export async function systemUsageSetup() {
  const refreshStatusBar = async () => {
    const client = await getClient();

    const cpuUsage = await getCpuUsage();
    const memUsage = getMemUsage();

    const { pageviews, visitors } = await fetchUmamiData();

    const statusText = `${visitors}/${pageviews} | ${memUsage}MB | ${cpuUsage}%`;

    client.publish(STATUSBAR_TOPIC, statusText, { qos: 0, retain: false }, (err) => {
      if (err) {
        console.error("Failed to publish system usage:", err);
      }
    });
  };

  await refreshStatusBar();
  setInterval(refreshStatusBar, 1500);
}

export async function sendMessage(message) {
  const client = await getClient();

  const fontPath = path.join("./fonts/PixelOperator.ttf");
  registerFont(fontPath, { family: "PixelOperator" });

  const ctx = getCanvas();
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
    console.error("Failed to create BMP buffer for welcome message:", err);
  }
}

let scheduleIntervalId = null;

export async function scheduleRandomQuotes(intervalMinutes) {
  if (scheduleIntervalId) {
    clearInterval(scheduleIntervalId);
  }

  const sendQuote = async () => {
    const quote = await getRandomQuote();

    if (quote) {
      await sendMessage(quote);
      console.log("Scheduled quote sent:", quote);
    }
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
