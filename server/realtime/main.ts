import "@std/dotenv/load";

import coap from "coap";

const VALID_API_KEY = process.env.API_KEY;
const COAP_OPTION_API_KEY = "2048";

const observers: { [key: string]: coap.OutgoingMessage } = {};

const coapServer = coap.createServer((req, res) => {
  console.log("CoAP client connected from", req.rsinfo.address, req.rsinfo.port);

  const apiKeyOption = req.options.find((opt) => opt.name === COAP_OPTION_API_KEY);
  const apiKey = apiKeyOption ? apiKeyOption.value.toString() : null;

  if (apiKey !== VALID_API_KEY) {
    console.log("Invalid or missing API_KEY in custom option 2048");
    res.code = "4.01"; // CoAP Unauthorized response code
    return res.end("Unauthorized: Missing or invalid API_KEY");
  }

  if (req.headers["Observe"] === 0) {
    console.log("Client is observing the resource");

    observers[`${req.rsinfo.address}:${req.rsinfo.port}`] = res;

    res.setOption("Observe", 1);
  } else {
    res.end("Connected!");
  }
});

coapServer.listen(5683, () => {
  console.log("CoAP server listening on port 5683");
});

function notifyObservers(message: string) {
  console.log(`Notifying observers: ${message}`);

  Object.values(observers).forEach((res) => {
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
    }

    if (req.method === "POST" && pathname === "/send") {
      try {
        const contentType = req.headers.get("Content-Type");
        if (contentType !== "application/json") {
          return new Response("Content-Type must be application/json\n", { status: 400 });
        }

        const { message } = await req.json();
        if (message) {
          notifyObservers(message);

          return new Response("Message sent to CoAP clients\n", { status: 200 });
        } else {
          return new Response("Invalid message\n", { status: 400 });
        }
      } catch (err) {
        console.error("Error processing request:", err);
        return new Response("Invalid request\n", { status: 400 });
      }
    }

    return new Response("Not found\n", { status: 404 });
  },
  { port: 8000 },
);
