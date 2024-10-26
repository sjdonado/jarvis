import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { PLACEHOLDER_IMAGE, sendMessage } from "../../shared/display.mjs";

export const meta: MetaFunction = () => {
  return [{ title: "Jarvis" }, { name: "description", content: "Welcome to Jarvis!" }];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const message = formData.get("message");

  const imageData = sendMessage(message);
  console.log("Submitted message:", message);

  return { message, imageData };
};

export default function Index() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex w-3/4 max-w-5xl gap-10">
        <div className="flex w-1/2 flex-col items-center gap-6">
          <header className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Jarvis Control Center</h1>
          </header>
          <Form method="post" className="flex flex-col gap-4 w-full">
            <textarea
              name="message"
              placeholder="Type your message"
              className="rounded border border-gray-300 p-2 text-gray-700 h-32 resize-none"
            />
            <button type="submit" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
              Submit
            </button>
          </Form>
          {actionData?.message && <p className="text-green-500">Message sent!</p>}
        </div>
        <div className="flex w-1/2 items-center justify-center">
          <img
            src={actionData?.imageData || PLACEHOLDER_IMAGE}
            alt="Message Preview"
            className="border rounded shadow-md"
          />
        </div>
      </div>
    </div>
  );
}
