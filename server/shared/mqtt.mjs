import os from "os";
import mqtt from "mqtt";

export const STATUSBAR_TOPIC = "statusbar";
export const DISPLAY_TOPIC = "display";

const MQTT_SERVER = process.env.MQTT_SERVER_URL || "mqtt://localhost:1883";

let _client;

export const getClient = () => {
  if (_client) return _client;
  _client = mqtt.connect(MQTT_SERVER);

  return _client;
};

export function init() {
  const client = getClient();

  client.on("connect", () => {
    console.log("Connected to MQTT broker at", MQTT_SERVER);
    refreshStatusBar();
    setInterval(refreshStatusBar, 1500);
  });

  client.on("error", (err) => {
    console.error("MQTT error:", err);
  });
}

function refreshStatusBar() {
  const client = getClient();

  const cpuLoad = os.loadavg()[0].toFixed(2); // 1-minute load average
  const totalMem = os.totalmem() / (1024 * 1024); // MB
  const freeMem = os.freemem() / (1024 * 1024); // MB
  const usedMem = totalMem - freeMem;
  const memUsage = ((usedMem / totalMem) * 100).toFixed(2);

  const statusText = `${cpuLoad} | ${memUsage}%`;

  client.publish(STATUSBAR_TOPIC, statusText, { qos: 1, retain: false }, (err) => {
    if (err) {
      console.error("Failed to publish system usage:", err);
    } else {
      console.log("System usage BMP image sent to topic", STATUSBAR_TOPIC);
    }
  });
}