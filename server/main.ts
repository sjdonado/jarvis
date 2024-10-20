import coap from "coap";

const observers: coap.OutgoingMessage[] = [];

const coapServer = coap.createServer((req, res) => {
  console.log("CoAP client connected from", req.rsinfo.address, req.rsinfo.port);

  if (req.headers["Observe"] === 0) {
    console.log("Client is observing the resource");

    observers.push(res);

    res.setOption("Observe", 1);
  }

  res.end("Connected!");
});

coapServer.listen(5683, () => {
  console.log("CoAP server listening on port 5683");
});

function notifyObservers(message: string) {
  console.log(`Notifying observers: ${message}`);

  observers.forEach((res) => {
    res.setOption("Observe", 1); // Continue signaling this is an observed resource
    res.write(message);
  });
}

Deno.serve(
  async (req: Request) => {
    console.log(`Received request: ${req.method} ${new URL(req.url).pathname}`);

    const { pathname } = new URL(req.url);
    if (req.method === "GET" && pathname === "/") {
      return new Response("Server is running\n", { status: 200 });
    } else if (req.method === "POST" && pathname === "/send") {
      try {
        const contentType = req.headers.get("Content-Type");
        if (contentType !== "application/json") {
          return new Response("Content-Type must be application/json\n", { status: 400 });
        }

        const { message } = await req.json();
        if (message) {
          notifyObservers(message); // Notify observing CoAP clients
          return new Response("Message sent to CoAP clients\n", { status: 200 });
        } else {
          return new Response("Invalid message\n", { status: 400 });
        }
      } catch (err) {
        console.error("Error processing request:", err);
        return new Response("Invalid request\n", { status: 400 });
      }
    } else {
      return new Response("Not found\n", { status: 404 });
    }
  },
  { port: 8000 },
);
