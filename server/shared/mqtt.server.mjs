import os from "os";

import mqtt from "mqtt";

export const MQTT_ADDRESS = process.env.MQTT_ADDRESS || "mqtt://localhost:1883";
export const STATUSBAR_TOPIC = "statusbar";
export const DISPLAY_TOPIC = "display";

let _client;

export const getClient = () => {
  if (_client) return _client;
  _client = mqtt.connect(MQTT_ADDRESS);

  _client.on("connect", () => {
    console.log("Connected to MQTT broker", MQTT_ADDRESS);
    refreshStatusBar();
    setInterval(refreshStatusBar, 1500);
  });

  _client.on("error", (err) => {
    console.error("MQTT error:", err);
  });

  return _client;
};

export function init() {
  getClient();
}

function refreshStatusBar() {
  const client = getClient();

  const cpuLoad = os.loadavg()[0]; // 1-minute load average
  const cpuCores = os.cpus().length; // Number of CPU cores
  const cpuUsagePercentage = ((cpuLoad / cpuCores) * 100).toFixed(2);

  const totalMem = os.totalmem() / (1024 * 1024);
  const freeMem = os.freemem() / (1024 * 1024);
  const usedMem = (totalMem - freeMem).toFixed(2);

  const statusText = `${usedMem} MB | CPU ${cpuUsagePercentage}%`;

  client.publish(STATUSBAR_TOPIC, statusText, { qos: 1, retain: false }, (err) => {
    if (err) {
      console.error("Failed to publish system usage:", err);
    }
  });
}
