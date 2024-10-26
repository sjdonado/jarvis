import { LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/react";

import { getSession } from "~/sessions.server";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const isAuthenticated = session.get("authenticated");

  if (!isAuthenticated) {
    return redirect("/login");
  }

  return redirect("/home");
};

export default function Index() {
  return null;
}
