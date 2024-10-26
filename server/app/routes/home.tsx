import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData, redirect } from "@remix-run/react";
import { useState, useEffect } from "react";

import { sendMessage, scheduleRandomQuotes } from "../../shared/display.server.mjs";
import { WIDTH, HEIGHT } from "../../shared/constants.mjs";

import { getSession, commitSession } from "../sessions.server";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));

  const scheduledInterval = session.get("scheduledInterval") || null;

  return { scheduledInterval };
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const message = formData.get("message") as string;
  const scheduleInterval = formData.get("scheduleInterval");

  const session = await getSession(request.headers.get("Cookie"));

  if (scheduleInterval) {
    const interval = parseInt(scheduleInterval as string, 10);

    session.set("scheduledInterval", interval);
    scheduleRandomQuotes(interval);

    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  if (message) {
    sendMessage(message);
    console.log("Submitted message:", message);
  }

  return { message };
};

export default function Index() {
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  const [message, setMessage] = useState("");
  const [scheduleInterval, setScheduleInterval] = useState("");

  useEffect(() => {
    if (actionData?.message) {
      setMessage(actionData.message as string);
    }
  }, [actionData]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex w-1/4 flex-col max-w-5xl gap-10">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Jarvis Control Center</h1>
        </header>
        <div className="flex justify-center">
          {actionData?.imageData && (
            <img
              src={actionData.imageData}
              alt="Message Preview"
              className="border rounded shadow-md"
              width={WIDTH}
              height={HEIGHT}
            />
          )}
        </div>
        <Form method="post" className="flex flex-col gap-4 w-full">
          <textarea
            name="message"
            placeholder="Type your message or fetch a random quote"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded border border-gray-300 p-2 text-gray-700 h-32 resize-none"
          />
          <button type="submit" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            Submit
          </button>
        </Form>
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Schedule Random Quotes</h2>
          <Form method="post" className="flex items-center gap-2 mt-2">
            <input
              type="number"
              name="scheduleInterval"
              placeholder="Interval in minutes"
              value={scheduleInterval}
              onChange={(e) => setScheduleInterval(e.target.value)}
              className="rounded border border-gray-300 p-2 text-gray-700 w-full"
            />
            <button type="submit" className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600">
              Schedule
            </button>
          </Form>
          {loaderData?.scheduledInterval && (
            <p className="text-green-500 mt-2">
              Random quotes are being sent every {loaderData.scheduledInterval} minutes.
            </p>
          )}
        </div>
        {actionData?.message && <p className="text-green-500">Message sent!</p>}
      </div>
    </div>
  );
}
