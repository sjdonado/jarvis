import { redirect, type ActionFunction } from "@remix-run/node";

import { isAuthenticated } from "../sessions.server";
import { getStore } from "../lib/store.server.mjs";

import { scheduleRandomQuotes } from "../topics/display.server.mjs";

export const action: ActionFunction = async ({ request }) => {
  await isAuthenticated(request);

  const formData = await request.formData();
  const scheduleInterval = formData.get("scheduleInterval");

  if (scheduleInterval) {
    const interval = parseInt(scheduleInterval as string, 10);
    const updatedAt = Date.now();

    await scheduleRandomQuotes(interval);

    const store = await getStore();

    store.set("scheduledInterval", interval);
    store.set("scheduledIntervalUpdatedAt", updatedAt);
  }

  return redirect("/");
};
