import type { ActionFunction } from "@remix-run/node";

import { sendScreenSignal } from "../topics/system.server.mjs";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const screenSignal = formData.get("screenSignal");

  if (screenSignal === "on" || screenSignal === "off") {
    await sendScreenSignal("screen", screenSignal);
    return null;
  }

  return new Response("Invalid screen signal", { status: 400 });
};
