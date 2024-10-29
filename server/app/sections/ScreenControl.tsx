import { useFetcher } from "@remix-run/react";
import clsx from "clsx";
import { useEffect, useState } from "react";

export default function ScreenControl({ screen }: { screen: boolean }) {
  const fetcher = useFetcher();
  const [isScreenOn, setIsScreenOn] = useState<boolean>(screen);

  const handleScreenSignal = (signal: "on" | "off") => {
    fetcher.submit({ screenSignal: signal }, { method: "post", action: "/screen-control" });
  };

  useEffect(() => {
    setIsScreenOn(screen);
  }, [screen]);

  return (
    <section>
      <h2 className="text-center text-lg font-semibold">Screen Control</h2>
      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          onClick={() => handleScreenSignal("on")}
          className={clsx(
            "rounded px-4 py-2 text-white",
            !isScreenOn ? "bg-green-500" : "bg-gray-300"
          )}
        >
          Turn On
        </button>
        <button
          onClick={() => handleScreenSignal("off")}
          className={clsx(
            "rounded px-4 py-2 text-white",
            isScreenOn ? "bg-red-500" : "bg-gray-300"
          )}
        >
          Turn Off
        </button>
      </div>
    </section>
  );
}
