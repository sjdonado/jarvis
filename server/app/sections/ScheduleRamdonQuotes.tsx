import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";

export default function ScheduleRandomQuotes({
  scheduledInterval,
}: {
  scheduledInterval: {
    value: number;
    updatedAt: number;
  };
}) {
  const fetcher = useFetcher();
  const [scheduleInterval, setScheduleInterval] = useState(scheduledInterval.value);
  const [nextScheduledTime, setNextScheduledTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!scheduleInterval) return;

    const intervalInMs = scheduleInterval * 60 * 1000;
    const nextTime = new Date(scheduledInterval.updatedAt + intervalInMs);

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
  }, [scheduleInterval, scheduledInterval.updatedAt]);

  return (
    <section>
      <h2 className="text-center text-lg font-semibold">Schedule Random Quotes</h2>
      <fetcher.Form method="post" action="/api/schedule-random-quotes" className="mt-2 flex items-center gap-2">
        <label htmlFor="scheduleInterval" className="sr-only">
          Schedule Interval (minutes)
        </label>
        <input
          type="number"
          id="scheduleInterval"
          name="scheduleInterval"
          placeholder="Interval in minutes"
          value={scheduleInterval}
          onChange={(e) => setScheduleInterval(e.target.valueAsNumber || 0)}
          className="w-full rounded border border-gray-300 p-2 text-gray-700"
        />
        <button type="submit" className="rounded bg-purple-500 px-4 py-2 text-white">
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
