import mqtt from "mqtt";

export const MQTT_ADDRESS = process.env.MQTT_ADDRESS || "mqtt://localhost:1883";

export const STATUSBAR_TOPIC = "statusbar";
export const DISPLAY_TOPIC = "display";

let _client;

export const getClient = async () => {
  if (_client) return _client;

  _client = await mqtt.connectAsync(MQTT_ADDRESS);
  console.log("Connected to MQTT broker", MQTT_ADDRESS);

  return _client;
};

