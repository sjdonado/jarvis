import fs from 'fs';

export function getMemUsage() {
  try {
    const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
    const lines = meminfo.split("\n");

    let totalMemory, freeMemory;

    lines.forEach((line) => {
      if (line.startsWith("MemTotal:")) {
        totalMemory = parseInt(line.replace(/\D/g, ""), 10);
      }
      if (line.startsWith("MemAvailable:")) {
        freeMemory = parseInt(line.replace(/\D/g, ""), 10);
      }
    });

    if (totalMemory && freeMemory) {
      const usedMemory = totalMemory - freeMemory;
      return (usedMemory / 1024).toFixed(2); // Returns in MB
    } else {
      throw new Error("Failed to retrieve memory information");
    }
  } catch (error) {
    console.error("Error reading /proc/meminfo:", error);
    return 0;
  }
}

export function getCpuUsage() {
  const parseCpuInfo = () => {
    try {
      const cpuInfo = fs.readFileSync("/proc/stat", "utf8");
      const lines = cpuInfo.split("\n");

      const cpuLines = lines.filter((line) => line.startsWith("cpu"));
      const cpuStats = cpuLines.map((line) => {
        const times = line
          .replace(/cpu\d*\s+/, "")
          .split(/\s+/)
          .map(Number);

        const [user, nice, system, idle, iowait, irq, softirq, steal] = times;
        const total = user + nice + system + idle + iowait + irq + softirq + steal;
        const idleTime = idle + iowait;

        return { total, idleTime };
      });

      return cpuStats;
    } catch (error) {
      console.error("Error reading /proc/stat:", error);
      return 0;
    }
  };

  return new Promise((resolve) => {
    const startStats = parseCpuInfo();

    if (!startStats) {
      return resolve(0);
    }

    setTimeout(() => {
      const endStats = parseCpuInfo();

      if (!endStats) {
        return resolve(0);
      }

      const coreUsages = startStats.map((start, index) => {
        const end = endStats[index];
        const idleDelta = end.idleTime - start.idleTime;
        const totalDelta = end.total - start.total;

        return 100 * (1 - idleDelta / totalDelta);
      });

      const avgCpuUsage = (
        coreUsages.reduce((sum, usage) => sum + usage, 0) / coreUsages.length
      ).toFixed(2);

      resolve(avgCpuUsage);
    }, 1000);
  });
}
