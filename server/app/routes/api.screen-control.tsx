import { type ActionFunction } from "@remix-run/node";

import { isAuthenticated } from "~/sessions.server";
import { sendScreenSignal } from "~/topics/system.server.mjs";

export const action: ActionFunction = async ({ request }) => {
  await isAuthenticated(request);

  const formData = await request.formData();
  const screenSignal = formData.get("screenSignal");

  if (screenSignal !== "on" && screenSignal !== "off") {
    return new Response("Invalid screen signal", { status: 400 });
  }

  await sendScreenSignal("screen", screenSignal);

  return true;
};
