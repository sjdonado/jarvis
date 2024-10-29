import { LoaderFunction } from "@remix-run/node";

import { isAuthenticated } from "~/sessions.server";

import { getStore } from "~/lib/store.server.mjs";

export const loader: LoaderFunction = async ({ request }) => {
  await isAuthenticated(request);

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

      const unsubscribe = store.subscribe((key) => {
        if (["scheduledInterval", "scheduledIntervalUpdatedAt", "display", "screen"].includes(key)) {
          sendUpdate();
        }
      });

      // Reconnect if the connection drops
      controller.enqueue(`retry: 10000\n\n`);

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
