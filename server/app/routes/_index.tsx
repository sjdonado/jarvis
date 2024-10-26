import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { HEIGHT, WIDTH, sendMessage } from "../../shared/display.mjs";

export const meta: MetaFunction = () => {
  return [{ title: "Jarvis" }, { name: "description", content: "Welcome to Jarvis!" }];
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const message = formData.get("message");
  const getQuote = formData.get("getQuote");

  let finalMessage = message;

  if (getQuote) {
    try {
      const response = await fetch("https://zenquotes.io/api/random");
      const data = await response.json();
      if (data[0]?.q && data[0]?.a) {
        finalMessage = `"${data[0].q}"\n ― ${data[0].a}`;
      } else {
        console.error("Failed to fetch quote.");
      }
    } catch (error) {
      console.error("Error fetching quote:", error);
    }
  }

  const imageData = sendMessage(finalMessage);
  console.log("Submitted message:", finalMessage);

  return { message: finalMessage, imageData };
};

export default function Index() {
  const actionData = useActionData<typeof action>();
  const [message, setMessage] = useState("");

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
          <img
            src={actionData?.imageData}
            alt="Message Preview"
            className="border rounded shadow-md"
            width={WIDTH}
            height={HEIGHT}
          />
        </div>
        <Form method="post" className="flex flex-col gap-4 w-full">
          <textarea
            name="message"
            placeholder="Type your message or fetch a random quote"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded border border-gray-300 p-2 text-gray-700 h-32 resize-none"
          />
          <button
            type="submit"
            name="getQuote"
            value="true"
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Get Random Quote
          </button>
          <button type="submit" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            Submit
          </button>
        </Form>
        {actionData?.message && <p className="text-green-500">Message sent!</p>}
      </div>
    </div>
  );
}
