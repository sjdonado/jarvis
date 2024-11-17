import { getMQTTClient, STATUSBAR_TOPIC } from "../lib/mqtt.server.mjs";
import { getCpuUsage, getMemUsage } from "../lib/os.server.mjs";
import { getStore } from "../lib/store.server.mjs";

import { fetchUmamiData } from "../services/umami.server.mjs";

const formatToK = (value) => (value > 1000 ? `${(value / 1000).toFixed(1)}k` : value);

/**
 * Periodically retrieves system usage metrics (CPU, memory, and website data) and publishes them to the status bar topic.
 * @returns {Promise<void>} A promise that resolves when the first status update is sent.
 */
export async function systemUsageListenter() {
  const sendStatusBarUpdate = async () => {
    const client = await getMQTTClient();
    const store = await getStore();

    const isScreenOn = store.get("screen");
    if (!isScreenOn) {
      console.log("Screen is off, skipped: statusbar update");
      return;
    }

    const cpuUsage = await getCpuUsage();
    const memUsage = getMemUsage();

    const { pageviews, visitors } = await fetchUmamiData();

    const formattedPageviews = formatToK(pageviews);
    const formattedVisitors = formatToK(visitors);

    const statusText = `${formattedVisitors}/${formattedPageviews} | ${memUsage} | ${cpuUsage}`;

    client.publish(STATUSBAR_TOPIC, statusText, { qos: 0, retain: false }, (err) => {
      if (err) {
        console.error("Failed to publish statusbar message:", err);
      }
    });
  };

  await sendStatusBarUpdate();
  setInterval(sendStatusBarUpdate, 1500);
}
