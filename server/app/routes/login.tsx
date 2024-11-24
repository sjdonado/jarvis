import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Form, useActionData, redirect } from "@remix-run/react";
import { useState } from "react";

import { ENV } from "~/config/env.server.mjs";
import { getSession, commitSession } from "~/sessions.server";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const isAuthenticated = session.get("authenticated");

  if (isAuthenticated) {
    return redirect("/");
  }

  return null;
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const apiKey = formData.get("apiKey");

  if (apiKey === ENV.server.apiKey) {
    const session = await getSession(request.headers.get("Cookie"));
    session.set("authenticated", true);

    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } else {
    return { error: "Invalid API key." };
  }
};

export default function Login() {
  const actionData = useActionData();
  const [apiKey, setApiKey] = useState("");

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-8">
        <h1 className="text-center text-2xl font-bold">Login</h1>
        <Form method="post" className="mt-8 space-y-6">
          <div className="-space-y-px rounded-md shadow-sm">
            <input
              name="apiKey"
              type="password"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API Key"
              className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          {actionData?.error && <p className="text-sm text-red-500">{actionData.error}</p>}
          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
            >
              Login
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
