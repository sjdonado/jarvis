import fetch from "node-fetch";

function parseUnamiUri(uri) {
  const urlPattern = /^(https?:\/\/)?([^:/\s]+):([^@]+)@([^/]+)(\/.*)?$/;
  const match = uri.match(urlPattern);

  if (!match) {
    throw new Error("Invalid UNAMI_URI format. Expected format: http://username:password@host");
  }

  const [, , username, password, host] = match;

  return {
    username,
    password,
    apiUrl: `https://${host}/api`,
  };
}

const { username, password, apiUrl } = parseUnamiUri(process.env.UNAMI_URI);

let _token, _tokenLastFetch, _websites, _websitesLastFetch, _stats, _statsLastFetch;

async function getBearerToken() {
  const now = Date.now();

  // Refresh token every 24 hours
  if (_token && _tokenLastFetch && now - _tokenLastFetch < 24 * 60 * 60 * 1000) {
    return _token;
  }

  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    console.error(await response.text());
    throw new Error("Failed to authenticate");
  }

  const data = await response.json();
  _token = data.token;
  _tokenLastFetch = now;

  console.log("[umami] token updated:", _token);

  return _token;
}

async function listWebsites(token) {
  const now = Date.now();

  // Refresh website list every 1 week
  if (_websites && _websitesLastFetch && now - _websitesLastFetch < 7 * 24 * 60 * 60 * 1000) {
    return _websites;
  }

  const response = await fetch(`${apiUrl}/websites`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error(await response.text());
    throw new Error("Failed to list websites");
  }

  const { data } = await response.json();
  _websites = data;
  _websitesLastFetch = now;

  console.log("[umami] website list updated:", _websites);

  return _websites;
}

async function getVisitorStats(token, websiteId) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const startAt = startOfYear.getTime();
  const endAt = now.getTime();

  const response = await fetch(`${apiUrl}/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`Failed to get visitor stats for website ID: ${websiteId}`);
  }

  return await response.json();
}

export async function fetchUmamiData() {
  const now = Date.now();

  // Check if data is cached and within 60 minutes
  if (_stats && _statsLastFetch && now - _statsLastFetch < 60 * 60 * 1000) {
    return _stats;
  }

  const aggregateStats = {
    pageviews: 0,
    visitors: 0,
    visits: 0,
    bounces: 0,
    totaltime: 0,
  };

  try {
    const token = await getBearerToken();
    const websites = await listWebsites(token);

    if (websites.length === 0) {
      throw new Error("No websites found.");
    }

    await Promise.all(
      websites.map(async (website) => {
        const stats = await getVisitorStats(token, website.id);

        aggregateStats.pageviews += stats.pageviews.value || 0;
        aggregateStats.visitors += stats.visitors.value || 0;
        aggregateStats.visits += stats.visits.value || 0;
        aggregateStats.bounces += stats.bounces.value || 0;
        aggregateStats.totaltime += stats.totaltime.value || 0;
      })
    );

    _stats = aggregateStats;
    _statsLastFetch = now;

    console.log("[umami] cache updated:", _stats);

    return _stats;
  } catch (error) {
    console.error("Error:", error);
  }
}
