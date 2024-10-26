import type { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { getSession, destroySession } from "../sessions.server";
import { cancelScheduledQuotes } from "../../shared/display.server.mjs";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const isAuthenticated = session.get("authenticated");

  if (!isAuthenticated) {
    return redirect("/login");
  }

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
