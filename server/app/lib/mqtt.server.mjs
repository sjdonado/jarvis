import mqtt from "mqtt";

import { ENV } from "../config/env.server.mjs";

export const STATUSBAR_TOPIC = "statusbar";
export const DISPLAY_TOPIC = "display";

let _client;

export const getClient = async () => {
  if (_client) return _client;

  _client = await mqtt.connectAsync(ENV.mqtt.address);
  console.log("Connected to MQTT broker", ENV.mqtt.address);

  return _client;
};

