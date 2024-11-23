import { getCpuUsage, getMemUsage } from "../lib/os.server.mjs";

import { fetchUmamiData } from "../services/umami.server.mjs";
import { screenManager } from "../services/screenManager.server.mjs";

const formatToK = (value) => (value > 1000 ? `${(value / 1000).toFixed(1)}k` : value);

/**
 * Periodically retrieves system usage metrics (CPU, memory, and website data) and publishes them to the status bar topic.
 * @returns {Promise<void>} A promise that resolves when the first status update is sent.
 */
export async function systemUsageListenter() {
  const sendStatusBarUpdate = async () => {
    const cpuUsage = await getCpuUsage();
    const memUsage = getMemUsage();

    const { pageviews, visitors } = await fetchUmamiData();

    const formattedPageviews = formatToK(pageviews);
    const formattedVisitors = formatToK(visitors);

    const statusText = `${formattedVisitors}/${formattedPageviews} | ${memUsage} | ${cpuUsage}`;

    screenManager.send({ type: 'UPDATE_STATUSBAR', value: statusText });
  };

  await sendStatusBarUpdate();
  setInterval(sendStatusBarUpdate, 1500);
}
