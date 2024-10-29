import { useFetcher } from "@remix-run/react";
import clsx from "clsx";
import { useState, useEffect } from "react";

export default function SendMessage({ screen }: { screen: boolean }) {
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
      <fetcher.Form method="post" action="/api/send-message" className="flex w-full flex-col gap-4">
        <textarea
          name="message"
          placeholder="Type your message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-32 resize-none rounded border border-gray-300 p-2 text-gray-700"
        />
        <button
          type="submit"
          className={clsx("cursor-pointer rounded px-4 py-2 text-white", screen ? "bg-blue-500 " : "cursor-default bg-gray-300")}
          disabled={!screen}
        >
          Submit
        </button>
        {fetcher.data?.message && <p className="text-xs text-green-500">Message sent!</p>}
      </fetcher.Form>
    </section>
  );
}
