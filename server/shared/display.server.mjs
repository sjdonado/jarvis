import os from "os";
import path from "path";

import { createCanvas, registerFont } from "canvas";

import { imageDataToBMP, drawCenteredText } from "./canvas.server.mjs";
import { getClient, DISPLAY_TOPIC, STATUSBAR_TOPIC } from "./mqtt.server.mjs";
import { zenquotesGetRandom } from "./services.server.mjs";

import { WIDTH, HEIGHT } from "./constants.mjs";

export async function systemUsageSetup() {
  const refreshStatusBar = async () => {
    const client = await getClient();

    const cpuLoad = os.loadavg()[0]; // 1-minute load average
    const cpuCores = os.cpus().length; // Number of CPU cores
    const cpuUsagePercentage = ((cpuLoad / cpuCores) * 100).toFixed(2);

    const totalMem = os.totalmem() / (1024 * 1024);
    const freeMem = os.freemem() / (1024 * 1024);
    const usedMem = (totalMem - freeMem).toFixed(2);

    const statusText = `${usedMem} MB | ${cpuUsagePercentage}%`;

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

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

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
    console.error("Failed to create BMP buffer for welcome message:", err);
  }
}

let scheduleIntervalId = null;

export async function scheduleRandomQuotes(intervalMinutes) {
  if (scheduleIntervalId) {
    clearInterval(scheduleIntervalId);
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  scheduleIntervalId = setInterval(async () => {
    const quote = await zenquotesGetRandom();

    if (quote) {
      await sendMessage(quote);
      console.log("Scheduled quote sent:", quote);
    }
  }, intervalMs);
}

export function cancelScheduledQuotes() {
  if (scheduleIntervalId) {
    clearInterval(scheduleIntervalId);
    scheduleIntervalId = null;
    console.log("Scheduled quotes have been canceled.");
  }
}
