import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";

import { sendMessage } from "../../shared/display.mjs";

export const meta: MetaFunction = () => {
  return [{ title: "Jarvis" }, { name: "description", content: "Welcome to Jarvis!" }];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const message = formData.get("message");

  sendMessage(message);
  console.log("Submitted message:", message);

  return { message };
};

export default function Index() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Jarvis control center</h1>
        </header>
        <Form method="post" className="flex flex-col gap-4">
          <input
            type="text"
            name="message"
            placeholder="Type your message"
            className="rounded border border-gray-300 p-2 text-gray-700"
          />
          <button type="submit" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            Submit
          </button>
        </Form>
        {actionData?.message && <p className="text-green-500">Message received: {actionData.message}</p>}
      </div>
    </div>
  );
}
