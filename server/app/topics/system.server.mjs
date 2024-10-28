import { getClient, SYSTEM_TOPIC } from "../lib/mqtt.server.mjs";

export async function sendScreenSignal(key, value) {
  const client = await getClient();

  const message = `${key},${value}`;

  client.publish(SYSTEM_TOPIC, message, { qos: 0, retain: false }, (err) => {
    if (err) {
      console.error("Failed to publish system message:", err);
    }
  });
}
