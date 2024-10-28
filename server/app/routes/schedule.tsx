import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { commitSession, isAuthenticated } from "../sessions.server";
import { scheduleRandomQuotes } from "../topics/display.server.mjs";

export const action: ActionFunction = async ({ request }) => {
  const session = await isAuthenticated(request);

  const formData = await request.formData();
  const scheduleInterval = formData.get("scheduleInterval");

  if (scheduleInterval) {
    const interval = parseInt(scheduleInterval as string, 10);

    await scheduleRandomQuotes(interval);
    session.set("scheduledInterval", interval);
    session.set("scheduledIntervalUpdatedAt", Date.now());

    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  return null;
};
