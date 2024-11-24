import { type ActionFunction } from "@remix-run/node";
import { screenManager } from "~/services/screenManager.server.mjs";

import { isAuthenticated } from "~/sessions.server";

export const action: ActionFunction = async ({ request }) => {
  await isAuthenticated(request);

  const formData = await request.formData();
  const scheduleInterval = formData.get("scheduleInterval");

  if (scheduleInterval) {
    const interval = parseInt(scheduleInterval as string, 10);

    screenManager.send({ type: "UPDATE_RANDOM_QUOTES_INTERVAL", value: interval });
  }

  return true;
};
