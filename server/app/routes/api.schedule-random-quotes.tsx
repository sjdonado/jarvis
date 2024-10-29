import { type ActionFunction } from "@remix-run/node";

import { isAuthenticated } from "~/sessions.server";

import { scheduleRandomQuotes } from "~/topics/display.server.mjs";

export const action: ActionFunction = async ({ request }) => {
  await isAuthenticated(request);

  const formData = await request.formData();
  const scheduleInterval = formData.get("scheduleInterval");

  if (scheduleInterval) {
    const interval = parseInt(scheduleInterval as string, 10);

    await scheduleRandomQuotes(interval);
  }

  return true;
};
