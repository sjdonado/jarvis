import { getStore } from "~/lib/store.server.mjs";

export const loader = async () => {
  const store = await getStore();

  const stream = new ReadableStream({
    start(controller) {
      const sendUpdate = () => {
        const data = JSON.stringify({
          scheduledInterval: {
            value: store.get("scheduledInterval"),
            updatedAt: store.get("scheduledIntervalUpdatedAt"),
          },
          display: store.get("display"),
          screen: store.get("screen"),
        });
        controller.enqueue(`data: ${data}\n\n`);
      };

      // Listen for store changes
      const unsubscribe = store.subscribe((key) => {
        if (["scheduledInterval", "scheduledIntervalUpdatedAt", "display", "screen"].includes(key)) {
          sendUpdate();
        }
      });

      // Reconnect if the connection drops
      controller.enqueue(`retry: 10000\n\n`);

      // Ensure unsubscribe is called to prevent memory leaks
      controller.close = () => {
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
