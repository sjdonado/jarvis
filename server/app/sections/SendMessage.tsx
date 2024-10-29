import { useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";

export default function SendMessage() {
  const fetcher = useFetcher<{ message: string }>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (fetcher.data) {
      const { message: newMessage } = fetcher.data;

      setMessage(newMessage || "");
    }
  }, [fetcher.data]);

  return (
    <section className="mt-4 flex w-full flex-col items-center gap-4">
      <h2 className="text-lg font-semibold">Send message</h2>
      <fetcher.Form method="post" action="/send-message" className="flex w-full flex-col gap-4">
        <textarea
          name="message"
          placeholder="Type your message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-32 resize-none rounded border border-gray-300 p-2 text-gray-700"
        />
        <button type="submit" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
          Submit
        </button>
        {fetcher.data?.message && <p className="text-xs text-green-500">Message sent!</p>}
      </fetcher.Form>
    </section>
  );
}
