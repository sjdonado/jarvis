import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Server is running");
});

app.get("/daily-quote", (c) => {
  return c.text("¿Hace ruido el árbol que cae cuando no hay nadie para escucharlo?");
});

Deno.serve(app.fetch);
