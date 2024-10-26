import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Form, useActionData, redirect } from "@remix-run/react";
import { useState } from "react";
import { getSession, commitSession } from "../sessions.server";
import { SERVER_API_KEY } from "~/constants.server";

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

  if (apiKey === SERVER_API_KEY) {
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
      <div className="w-full max-w-md p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">Login</h1>
        <Form method="post" className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <input
              name="apiKey"
              type="password"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API Key"
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
            />
          </div>
          {actionData?.error && (
            <p className="text-red-500 text-sm">{actionData.error}</p>
          )}
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              Login
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
