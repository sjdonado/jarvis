import { useLoaderData, Link } from "@remix-run/react";
import { useState, useEffect } from "react";
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
    scheduledInterval: state.context.scheduledInterval,
  };
};

export default function Index() {
  const initialData = useLoaderData<typeof loader>();

  // TODO: invalidate instead of getting data from the sse
  // TODO: investigate why the canvas does not work locally (try npm clean, should be some dependency broken)
  // TODO: remove console logs
  const [scheduledInterval, setScheduledInterval] = useState(initialData.scheduledInterval);
  const [display, setDisplay] = useState(initialData.display);
  const [screen, setScreen] = useState(initialData.screen);

  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      setScheduledInterval(data.scheduledInterval);
      setDisplay(data.display);
      setScreen(data.screen);
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

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
        <ScheduleRandomQuotes screen={screen} scheduledInterval={scheduledInterval} />
      </div>
      <Link to="/logout" className="text-center text-sm text-red-500 underline">
        Logout
      </Link>
    </div>
  );
}
