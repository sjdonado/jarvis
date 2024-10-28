import { useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";

import { WIDTH, HEIGHT } from "../config/constants.mjs";

export default function SendMessage() {
  const fetcher = useFetcher<{ message: string; imageData: string }>();
  const [message, setMessage] = useState("");
  const [imageData, setImageData] = useState<string | undefined>();

  useEffect(() => {
    if (fetcher.data) {
      const { message: newMessage, imageData: newImageData } = fetcher.data;

      setMessage(newMessage || "");
      setImageData(newImageData);
    }
  }, [fetcher.data]);

  return (
    <section className="flex flex-col items-center mt-4 gap-4 w-full">
      <h2 className="text-lg font-semibold">Send message</h2>
      <div className="flex justify-center">
        <img src={imageData} alt="Message Preview" className="border rounded shadow-md" width={WIDTH} height={HEIGHT} />
      </div>
      <fetcher.Form method="post" action="/send-message" className="flex flex-col gap-4 w-full">
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
        {fetcher.data?.message && <p className="text-green-500 text-xs">Message sent!</p>}
      </fetcher.Form>
    </section>
  );
}
