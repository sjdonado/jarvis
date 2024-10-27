import { useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";

export default function ScheduleRamdonQuotes({ initialScheduleInterval }: { initialScheduleInterval: string }) {
  const fetcher = useFetcher();
  const [scheduleInterval, setScheduleInterval] = useState(initialScheduleInterval);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (fetcher.state === "submitting") {
      setHasSubmitted(true);
    }
  }, [fetcher.state]);

  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold">Schedule Random Quotes</h2>
      <fetcher.Form method="post" action="/schedule" className="flex items-center gap-2 mt-2">
        <input
          type="number"
          name="scheduleInterval"
          placeholder="Interval in minutes"
          value={scheduleInterval}
          onChange={(e) => setScheduleInterval(e.target.value)}
          className="rounded border border-gray-300 p-2 text-gray-700 w-full"
        />
        <button type="submit" className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600">
          Schedule
        </button>
      </fetcher.Form>
      {hasSubmitted && fetcher.state === "idle" && scheduleInterval && (
        <p className="text-xs text-green-500 mt-2">
          Random quotes are being sent every {scheduleInterval} minutes.
        </p>
      )}
    </div>
  );
}
