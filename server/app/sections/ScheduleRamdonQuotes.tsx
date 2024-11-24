import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import clsx from "clsx";

export default function ScheduleRandomQuotes({
  screen,
  randomQuotesInterval,
}: {
  screen: boolean;
  randomQuotesInterval: {
    value: number;
    updatedAt: number;
  };
}) {
  const fetcher = useFetcher();
  const [scheduledInterval, setScheduledInterval] = useState(randomQuotesInterval.value);
  const [nextScheduledTime, setNextScheduledTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!scheduledInterval) return;

    const intervalInMs = scheduledInterval * 60 * 1000;
    const nextTime = new Date(randomQuotesInterval.updatedAt + intervalInMs);

    if (isNaN(nextTime.getTime())) {
      setNextScheduledTime(null);
      setCountdown("");
      return;
    }

    setNextScheduledTime(nextTime.toLocaleTimeString());

    const updateCountdown = () => {
      const timeRemaining = Math.max(0, Math.floor((nextTime.getTime() - Date.now()) / 1000));

      const hours = Math.floor((timeRemaining % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((timeRemaining % (60 * 60)) / 60);
      const seconds = timeRemaining % 60;

      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();

    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [scheduledInterval, randomQuotesInterval.updatedAt]);

  return (
    <section>
      <h2 className="text-center text-lg font-semibold">Schedule Random Quotes</h2>
      <fetcher.Form method="post" action="/api/schedule-random-quotes" className="mt-2 flex items-center gap-2">
        <label htmlFor="scheduledInterval" className="sr-only">
          Schedule Interval (minutes)
        </label>
        <input
          type="number"
          id="scheduledInterval"
          name="scheduledInterval"
          placeholder="Interval in minutes"
          value={scheduledInterval}
          onChange={(e) => setScheduledInterval(e.target.valueAsNumber || 0)}
          className="w-full rounded border border-gray-300 p-2 text-gray-700"
        />
        <button
          type="submit"
          className={clsx(
            "rounded px-4 py-2 text-white",
            screen ? "cursor-pointer bg-purple-500" : "cursor-default bg-gray-300"
          )}
          disabled={!screen}
        >
          Schedule
        </button>
      </fetcher.Form>
      {nextScheduledTime && (
        <p className="mt-1 text-xs text-gray-500">
          Next quote scheduled at: {nextScheduledTime} (in {countdown})
        </p>
      )}
    </section>
  );
}
