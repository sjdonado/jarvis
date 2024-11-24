import { useLoaderData, Link, useRevalidator } from "@remix-run/react";
import { useEffect } from "react";
import { LoaderFunction } from "@remix-run/node";

import { HEIGHT, SCREEN_OFF_BASE64, WIDTH } from "~/config/constants.mjs";
import { isAuthenticated } from "~/sessions.server";

import ScheduleRandomQuotes from "~/sections/ScheduleRamdonQuotes";
import ScreenControl from "~/sections/ScreenControl";
import SendMessage from "~/sections/SendMessage";

import { screenManager } from "~/services/screenManager.server.mjs";

export const loader: LoaderFunction = async ({ request }) => {
  await isAuthenticated(request);

  const state = screenManager.getSnapshot();

  return {
    screen: state.matches("active"),
    display: state.context.display.base64,
    randomQuotesInterval: state.context.randomQuotesInterval,
  };
};

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  useEffect(() => {
    let eventSource: EventSource | null = null;
    const connect = () => {
      eventSource = new EventSource("/api/sse");

      eventSource.onmessage = (event) => {
        if (event.type === "invalidate") {
          revalidator.revalidate();
        }
      };

      eventSource.onerror = () => {
        console.error("SSE connection lost. Attempting to reconnect...");
        eventSource?.close();
        eventSource = null;

        // Reconnect after 5 seconds
        setTimeout(() => {
          connect();
        }, 5000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [revalidator]);

  const { screen, display, randomQuotesInterval } = data;

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-12">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Jarvis Control Center</h1>
      </header>
      <div className="flex max-w-5xl flex-col gap-6">
        <div className="flex justify-center">
          <img
            src={screen ? display : SCREEN_OFF_BASE64}
            alt={display ? "Message Preview" : ""}
            className="rounded border shadow-md"
            width={WIDTH}
            height={HEIGHT}
          />
        </div>
        <ScreenControl screen={screen} />
        <SendMessage screen={screen} />
        <ScheduleRandomQuotes screen={screen} randomQuotesInterval={randomQuotesInterval} />
      </div>
      <Link to="/logout" className="text-center text-sm text-red-500 underline">
        Logout
      </Link>
    </div>
  );
}
