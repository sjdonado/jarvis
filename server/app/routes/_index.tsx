import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData, redirect, Link } from "@remix-run/react";
import { useState, useEffect } from "react";

import { sendMessage } from "../topics/display.server.mjs";
import { WIDTH, HEIGHT } from "../config/constants.mjs";

import { getSession } from "../sessions.server";

import ScheduleRamdonQuotes from "~/components/ScheduleRamdonQuotes";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const message = formData.get("message") as string;

  let imageData;
  if (message) {
    imageData = await sendMessage(message);
    console.log("Submitted message:", message);
  }

  return { message, imageData };
};

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const isAuthenticated = session.get("authenticated");

  if (!isAuthenticated) {
    return redirect("/login");
  }

  return {
    scheduledInterval: {
      value: session.get("scheduledInterval") || null,
      updatedAt: session.get("scheduledIntervalUpdatedAt") || null,
    },
  };
};

export default function Index() {
  const actionData = useActionData<typeof action>();
  const { scheduledInterval } = useLoaderData<typeof loader>();

  const [imageData, setImageData] = useState();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (actionData) {
      setMessage(actionData.message as string);
      setImageData(actionData.imageData);
    }
  }, [actionData]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex w-1/4 flex-col max-w-5xl gap-10">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Jarvis Control Center</h1>
        </header>
        <div className="flex justify-center">
          <img
            src={imageData}
            alt="Message Preview"
            className="border rounded shadow-md"
            width={WIDTH}
            height={HEIGHT}
          />
        </div>
        <Form method="post" className="flex flex-col gap-4 w-full">
          <textarea
            name="message"
            placeholder="Type your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded border border-gray-300 p-2 text-gray-700 h-32 resize-none"
          />
          <button type="submit" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            Submit
          </button>
          {actionData?.message && <p className="text-green-500 text-xs">Message sent!</p>}
        </Form>
        <ScheduleRamdonQuotes scheduledInterval={scheduledInterval} />
        <Link to="/logout" className="text-sm text-red-500 underline">
          Logout
        </Link>
      </div>
    </div>
  );
}
