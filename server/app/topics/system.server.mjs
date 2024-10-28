import { getClient, STATUSBAR_TOPIC } from "../lib/mqtt.server.mjs";

import { getCpuUsage, getMemUsage } from "../lib/os.server.mjs";
import { fetchUmamiData } from "../services/umami.server.mjs";

export async function systemUsageSetup() {
  const refreshStatusBar = async () => {
    const client = await getClient();

    const cpuUsage = await getCpuUsage();
    const memUsage = getMemUsage();

    const { pageviews, visitors } = await fetchUmamiData();

    const statusText = `${visitors}/${pageviews} | ${memUsage}MB | ${cpuUsage}%`;

    client.publish(STATUSBAR_TOPIC, statusText, { qos: 0, retain: false }, (err) => {
      if (err) {
        console.error("Failed to publish system usage:", err);
      }
    });
  };

  await refreshStatusBar();
  setInterval(refreshStatusBar, 1500);
}
