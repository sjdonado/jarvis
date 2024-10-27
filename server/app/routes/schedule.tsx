import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { getSession, commitSession } from "../sessions.server";
import { scheduleRandomQuotes } from "../../shared/display.server.mjs";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const scheduleInterval = formData.get("scheduleInterval");
  const session = await getSession(request.headers.get("Cookie"));

  if (scheduleInterval) {
    const interval = parseInt(scheduleInterval as string, 10);
    session.set("scheduledInterval", interval);
    scheduleRandomQuotes(interval);

    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  return null;
};
