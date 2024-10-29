import { getClient, SYSTEM_TOPIC } from "../lib/mqtt.server.mjs";

/**
 * @typedef {("screen" | "sleep")} CommandKey
 * The command key for controlling the screen or setting sleep state.
 */

/**
 * @typedef {("on" | "off")} CommandValue
 * The value associated with the command key, indicating the desired state.
 */

/**
 * Sends a signal to control the screen over MQTT by publishing a message to the system topic.
 * @param {CommandKey} key - The command key, either "screen" or "sleep".
 * @param {CommandValue} value - The value associated with the command key, either "on" or "off".
 * @returns {Promise<void>} Resolves when the message is published.
 */
export async function sendScreenSignal(key, value) {
  const client = await getClient();

  const message = `${key}:${value}`;

  client.publish(SYSTEM_TOPIC, message, { qos: 2, retain: false }, (err) => {
    if (err) {
      console.error("Failed to publish system message:", err);
    }
  });
}
