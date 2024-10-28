function getEnvVar(varName) {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`Environment variable ${varName} is missing`);
  }
  return value;
}

export const ENV = {
  mqtt: {
    address: getEnvVar("MQTT_ADDRESS"),
  },
  server: {
    apiKey: getEnvVar("SERVER_API_KEY"),
    secret: getEnvVar("SECRET"),
  },
  services: {
    umami: {
      apiUrl: getEnvVar("UNAMI_URI"),
    },
    zenquotes: {
      apiUrl: getEnvVar("ZENQUOTES_URI"),
    },
  },
};
