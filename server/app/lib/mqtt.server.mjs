import mqtt from "mqtt";

import { ENV } from "../config/env.server.mjs";

export const STATUSBAR_TOPIC = "statusbar";
export const DISPLAY_TOPIC = "display";
export const SYSTEM_TOPIC = "system";

let _client;

/**
 * Retrieves the MQTT client instance, initializing a new connection if it doesn't exist.
 * @returns {Promise<mqtt.MqttClient>} A promise that resolves to the connected MQTT client instance.
 */
export const getMQTTClient = async () => {
  if (_client) return _client;

  _client = await mqtt.connectAsync(ENV.mqtt.address);
  console.log("Connected to MQTT broker", ENV.mqtt.address);

  return _client;
};
