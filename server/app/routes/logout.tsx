import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { destroySession, isAuthenticated } from "../sessions.server";
import { cancelScheduledQuotes } from "../topics/display.server.mjs";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await isAuthenticated(request);

  cancelScheduledQuotes();

  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
};

export default function Logout() {
  return null;
}
