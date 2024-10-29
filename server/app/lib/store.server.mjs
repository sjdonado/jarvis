import { DISPLAY_TOPIC, getMQTTClient, SYSTEM_TOPIC } from "../lib/mqtt.server.mjs";

class KeyValueStore {
  constructor() {
    /** @type {Map<string, any>} */
    this.store = new Map();
    /** @type {Set<function>} */
    this.subscribers = new Set();
  }

  /**
   * Sets a key-value pair in the store and notifies subscribers of the change.
   * @param {string} key - The key to set.
   * @param {any} value - The value to associate with the key.
   */
  set(key, value) {
    this.store.set(key, value);
    this.notifySubscribers(key, value);
  }

  /**
   * Retrieves the value associated with a given key.
   * @param {string} key - The key to retrieve.
   * @returns {any | undefined} The value associated with the key, or undefined if the key does not exist.
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
    this.store.delete(key);
    this.notifySubscribers(key, undefined);
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
   * Clears all key-value pairs from the store and notifies subscribers.
   */
  clear() {
    this.store.clear();
    this.notifySubscribers(null, null);
  }

  /**
   * Subscribes to changes in the store.
   * @param {function(string, any): void} callback - The function to call when a key-value pair is changed.
   * @returns {function} An unsubscribe function to stop receiving updates.
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  /**
   * Unsubscribes from changes in the store.
   * @param {function(string, any): void} callback - The function to remove from subscribers.
   */
  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  /**
   * Notifies all subscribers of a change to a key-value pair.
   * @param {string | null} key - The key that was changed, or null if the entire store was cleared.
   * @param {any} value - The new value for the key, or null if the store was cleared.
   */
  notifySubscribers(key, value) {
    this.subscribers.forEach((callback) => callback(key, value));
  }
}

let _store;

/**
 * Initializes and retrieves the shared KeyValueStore instance, subscribing to MQTT topics
 * for updating store values based on incoming messages.
 * @returns {Promise<KeyValueStore>} A promise that resolves to the initialized KeyValueStore instance.
 */
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
