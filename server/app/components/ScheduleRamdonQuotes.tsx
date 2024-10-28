import { useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";

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
  const [nextScheduledTime, setNextScheduledTime] = useState("");
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const intervalInMs = scheduleInterval * 60 * 1000;
    const nextTime = new Date(scheduledInterval.updatedAt + intervalInMs);
    setNextScheduledTime(nextTime.toLocaleTimeString());

    const updateCountdown = () => {
      const timeRemaining = Math.max(0, Math.floor((nextTime.getTime() - Date.now()) / 1000));
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      setCountdown(`${minutes}m ${seconds}s`);
    };

    updateCountdown();

    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [scheduleInterval, scheduledInterval.updatedAt]);

  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold">Schedule Random Quotes</h2>
      <fetcher.Form method="post" action="/schedule" className="flex items-center gap-2 mt-2">
        <input
          type="number"
          name="scheduleInterval"
          placeholder="Interval in minutes"
          value={scheduleInterval}
          onChange={(e) => setScheduleInterval(e.target.valueAsNumber || 0)}
          className="rounded border border-gray-300 p-2 text-gray-700 w-full"
        />
        <button type="submit" className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600">
          Schedule
        </button>
      </fetcher.Form>
      <p className="text-xs text-gray-500 mt-1">
        Next quote scheduled at: {nextScheduledTime} (in {countdown})
      </p>
    </div>
  );
}
