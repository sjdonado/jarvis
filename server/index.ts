import coap from "https://esm.sh/coap@0.26.0";

// Store the current message to send to clients
let currentMessage = "Hello from CoAP Server!";

// CoAP server logic
const coapServer = coap.createServer((req, res) => {
  console.log("CoAP client connected");
  // Respond with the current message
  res.end(currentMessage);
});

// Bind CoAP server to port 5683
coapServer.listen(5683, () => {
  console.log("CoAP server listening on port 5683");
});

// Function to send a message to connected CoAP clients
function setMessage(message: string) {
  currentMessage = message;
  console.log(`Updated message to: ${currentMessage}`);
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
        setMessage(message); // Update CoAP message
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
});
