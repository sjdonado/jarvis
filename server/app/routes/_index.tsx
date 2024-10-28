import { useLoaderData, Link } from "@remix-run/react";
import { LoaderFunction } from "@remix-run/node";

import { isAuthenticated } from "../sessions.server";

import ScheduleRandomQuotes from "~/sections/ScheduleRamdonQuotes";
import ScreenControl from "~/sections/ScreenControl";
import SendMessage from "~/sections/SendMessage";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await isAuthenticated(request);

  return {
    scheduledInterval: {
      value: session.get("scheduledInterval") || null,
      updatedAt: session.get("scheduledIntervalUpdatedAt") || null,
    },
  };
};

export default function Index() {
  const { scheduledInterval } = useLoaderData<typeof loader>();

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex w-1/4 flex-col max-w-5xl gap-10">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Jarvis Control Center</h1>
        </header>
        <ScreenControl />
        <SendMessage />
        <ScheduleRandomQuotes scheduledInterval={scheduledInterval} />
        <Link to="/logout" className="text-sm text-red-500 underline text-center">
          Logout
        </Link>
      </div>
    </div>
  );
}
