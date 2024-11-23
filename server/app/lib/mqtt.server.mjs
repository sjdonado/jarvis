import mqtt from "mqtt";

import { ENV } from "../config/env.server.mjs";

export const STATUSBAR_TOPIC = "statusbar";
export const DISPLAY_TOPIC = "display";
export const SYSTEM_TOPIC = "system";

let _client = null;
let connectingPromise = null;

/**
 * Retrieves the MQTT client instance, initializing a new connection if it doesn't exist.
 * @returns {Promise<mqtt.AsyncMqttClient>} A promise that resolves to the connected MQTT client instance.
 */
export const getMQTTClient = async () => {
  if (_client) return _client;

  if (connectingPromise) {
    // Return the existing promise if a connection is already in progress
    return connectingPromise;
  }

  try {
    connectingPromise = mqtt.connectAsync(ENV.mqtt.address);
    _client = await connectingPromise;
    console.log("Connected to MQTT broker", ENV.mqtt.address);
    connectingPromise = null;
    return _client;
  } catch (err) {
    connectingPromise = null;
    throw err;
  }
};
