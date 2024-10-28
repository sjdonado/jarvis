import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { sendMessage } from "../topics/display.server.mjs";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const message = formData.get("message") as string;

  let imageData;
  if (message) {
    imageData = await sendMessage(message);
    console.log("Submitted message:", message);
  }

  return json({ message, imageData });
};
