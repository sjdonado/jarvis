import { useLoaderData, Link } from "@remix-run/react";
import { LoaderFunction } from "@remix-run/node";

import { HEIGHT, WIDTH } from "~/config/constants.mjs";
import { isAuthenticated } from "~/sessions.server";
import { getStore } from "~/lib/store.server.mjs";

import ScheduleRandomQuotes from "~/sections/ScheduleRamdonQuotes";
import ScreenControl from "~/sections/ScreenControl";
import SendMessage from "~/sections/SendMessage";

export const loader: LoaderFunction = async ({ request }) => {
  await isAuthenticated(request);

  const store = await getStore();

  return {
    scheduledInterval: {
      value: store.get("scheduledInterval"),
      updatedAt: store.get("scheduledIntervalUpdatedAt"),
    },
    display: store.get("display"),
    screen: store.get("screen"),
  };
};

export default function Index() {
  const { scheduledInterval, display, screen } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-12">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Jarvis Control Center</h1>
      </header>
      <div className="flex max-w-5xl flex-col gap-6">
        <div className="flex justify-center">
          <img src={display} alt="Message Preview" className="rounded border shadow-md" width={WIDTH} height={HEIGHT} />
        </div>
        <ScreenControl screen={screen} />
        <SendMessage />
        <ScheduleRandomQuotes scheduledInterval={scheduledInterval} />
      </div>
      <Link to="/logout" className="text-center text-sm text-red-500 underline">
        Logout
      </Link>
    </div>
  );
}
