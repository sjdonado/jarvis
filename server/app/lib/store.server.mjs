import { DISPLAY_TOPIC, getMQTTClient, SYSTEM_TOPIC } from "./mqtt.server.mjs";

class KeyValueStore {
  constructor() {
    /** @type {Map<string, any>} */
    this.store = new Map();
  }

  /**
   * Sets a key-value pair in the store.
   * @param {string} key - The key to set.
   * @param {any} value - The value to associate with the key.
   */
  set(key, value) {
    this.store.set(key, value);
  }

  /**
   * Retrieves the value associated with a given key.
   * @param {string} key - The key to retrieve.
   * @returns {any | null} The value associated with the key, or undefined if the key does not exist.
   */
  get(key) {
    return this.store.get(key);
  }

  /**
   * Deletes a key-value pair from the store.
   * @param {string} key - The key to delete.
   * @returns {boolean} True if the key was deleted, false if the key does not exist.
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Checks if a key exists in the store.
   * @param {string} key - The key to check.
   * @returns {boolean} True if the key exists, false otherwise.
   */
  has(key) {
    return this.store.has(key);
  }

  /**
   * Clears all key-value pairs from the store.
   */
  clear() {
    this.store.clear();
  }
}

let _store;

export const getStore = async () => {
  if (_store) return _store;

  _store = new KeyValueStore();

  const client = await getMQTTClient();

  client.subscribe(DISPLAY_TOPIC, (err) => {
    if (err) {
      console.log(`failed to subscribe ${DISPLAY_TOPIC}`, err);
    }
  });

  client.subscribe(SYSTEM_TOPIC, (err) => {
    if (err) {
      console.log(`failed to subscribe ${SYSTEM_TOPIC}`, err);
    }
  });

  client.on("message", (topic, message) => {
    if (topic === DISPLAY_TOPIC) {
      _store.set("display", `data:image/bmp;base64,${message.toString("base64")}`);
    }

    if (topic === SYSTEM_TOPIC && message.toString("utf8").startsWith("screen")) {
      const isScreenOn = message.toString("utf8").split(":")[1] === "on";

      _store.set("screen", isScreenOn);
      if (!isScreenOn) {
        _store.delete("display");
      }
    }
  });

  return _store;
};
