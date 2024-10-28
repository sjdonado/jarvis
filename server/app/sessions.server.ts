import { createCookieSessionStorage, redirect } from "@remix-run/node";

import { ENV } from "./config/env.server.mjs";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    secrets: [ENV.server.secret],
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

export const isAuthenticated = async (request: Request) => {
  const session = await getSession(request.headers.get("Cookie"));
  const authenticated = session.get("authenticated");

  if (!authenticated) {
    throw redirect("/login");
  }

  return session;
};
