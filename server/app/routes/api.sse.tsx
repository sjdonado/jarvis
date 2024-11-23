import { LoaderFunction } from "@remix-run/node";

import { isAuthenticated } from "~/sessions.server";

import { screenManager } from "~/services/screenManager.server.mjs";

export const loader: LoaderFunction = async ({ request }) => {
  await isAuthenticated(request);

  let subscription: { unsubscribe: () => void };

  const stream = new ReadableStream({
    start(controller) {
      subscription = screenManager.subscribe((state) => {
        const data = JSON.stringify({
          screen: state.matches("active"),
          display: state.context.display.base64,
          scheduledInterval: state.context.scheduledInterval,
        });
        controller.enqueue(`data: ${data}\n\n`);
      });

      // Reconnect if the connection drops
      controller.enqueue(`retry: 10000\n\n`);

      controller.close = () => {
        subscription.unsubscribe();
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
