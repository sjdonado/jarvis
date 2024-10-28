import { useFetcher } from "@remix-run/react";

export default function ScreenControl() {
  const fetcher = useFetcher();

  const handleScreenSignal = (signal: "on" | "off") => {
    fetcher.submit({ screenSignal: signal }, { method: "post", action: "/screen-control" });
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-center">Screen Control</h2>
      <div className="flex justify-center items-center gap-2 mt-2">
        <button
          onClick={() => handleScreenSignal("on")}
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
        >
          Turn On
        </button>
        <button
          onClick={() => handleScreenSignal("off")}
          className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Turn Off
        </button>
      </div>
      {fetcher.state === "submitting" && <p className="text-xs text-gray-500 mt-1">Sending screen signal...</p>}
    </section>
  );
}
