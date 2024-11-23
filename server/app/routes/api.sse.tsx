import { LoaderFunction } from "@remix-run/node";
import { isAuthenticated } from "~/sessions.server";
import { screenManager } from "~/services/screenManager.server.mjs";

export const loader: LoaderFunction = async ({ request }) => {
  await isAuthenticated(request);

  let subscription: { unsubscribe: () => void };

  const stream = new ReadableStream({
    start(controller) {
      subscription = screenManager.subscribe(() => {
        controller.enqueue(`event: invalidate\ndata: {}\n\n`);
      });

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
