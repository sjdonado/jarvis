import { type ActionFunction } from "@remix-run/node";
import { screenManager } from "~/services/screenManager.server.mjs";

import { isAuthenticated } from "~/sessions.server";
import { scheduleRandomQuotes } from "~/topics/display.server.mjs";

export const action: ActionFunction = async ({ request }) => {
  await isAuthenticated(request);

  const formData = await request.formData();
  const scheduledInterval = formData.get("scheduledInterval");

  if (scheduledInterval) {
    const interval = parseInt(scheduledInterval as string, 10);
    screenManager.send({ type: "UPDATE_RANDOM_QUOTES_INTERVAL", value: interval });
    scheduleRandomQuotes();
  }

  return true;
};
