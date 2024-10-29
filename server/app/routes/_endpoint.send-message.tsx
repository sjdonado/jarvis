import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";

import { sendMessage } from "../topics/display.server.mjs";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const message = formData.get("message") as string;

  if (!message) {
    return new Response("Invalid message", { status: 400 });
  }

  await sendMessage(message);

  return json({ message });
};
