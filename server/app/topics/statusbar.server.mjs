import { getClient, STATUSBAR_TOPIC } from "../lib/mqtt.server.mjs";

import { getCpuUsage, getMemUsage } from "../lib/os.server.mjs";
import { fetchUmamiData } from "../services/umami.server.mjs";

/**
 * Periodically retrieves system usage metrics (CPU, memory, and website data) and publishes them to the status bar topic.
 * @returns {Promise<void>} A promise that resolves when the first status update is sent.
 */
export async function systemUsageListenter() {
  const sendStatusBarUpdate = async () => {
    const client = await getClient();

    const cpuUsage = await getCpuUsage();
    const memUsage = getMemUsage();

    const { pageviews, visitors } = await fetchUmamiData();

    const statusText = `${visitors}/${pageviews} | ${memUsage}MB | ${cpuUsage}%`;

    client.publish(STATUSBAR_TOPIC, statusText, { qos: 0, retain: false }, (err) => {
      if (err) {
        console.error("Failed to publish statusbar message:", err);
      }
    });
  };

  await sendStatusBarUpdate();
  setInterval(sendStatusBarUpdate, 1500);
}
