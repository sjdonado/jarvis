import coap from "https://esm.sh/coap@0.26.0";

// Store the current message to send to clients
let currentMessage = "Hello from CoAP Server!";

// Store observing clients
let observers: coap.OutgoingMessage[] = [];

// CoAP server logic with support for observe
const coapServer = coap.createServer((req, res) => {
  console.log("CoAP client connected from", req.rsinfo.address, req.rsinfo.port);

  // Check if the request is asking to observe
  if (req.headers['Observe'] === 0) {
    console.log("Client is observing the resource");

    // Add the client to observers
    observers.push(res);

    // Respond with the current message and confirm the observation
    res.setOption('Observe', 1);  // Signal that this is an observed resource
    res.end(currentMessage);
  } else {
    // Regular response (non-observe)
    res.end(currentMessage);
  }
});

// Bind CoAP server to port 5683
coapServer.listen(5683, () => {
  console.log("CoAP server listening on port 5683");
});

// Function to send a message to all observing clients
function notifyObservers(message: string) {
  currentMessage = message;
  console.log(`Notifying observers: ${currentMessage}`);

  // Notify all observing clients
  observers.forEach(res => {
    res.setOption('Observe', 1); // Continue signaling this is an observed resource
    res.write(currentMessage);
  });
}

// HTTP API handler using Deno.serve
Deno.serve(async (req: Request) => {
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
}, { port: 8000 });
