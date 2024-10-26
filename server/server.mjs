import "dotenv/config";

import { createRequestHandler } from "@remix-run/express";
import express from "express";

import { systemUsageSetup } from "./shared/display.server.mjs";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

const app = express();

app.use(viteDevServer ? viteDevServer.middlewares : express.static("build/client"));

const build = viteDevServer
  ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
  : await import("./build/server/index.js");

app.all("*", createRequestHandler({ build }));

app.listen(3000, () => {
  console.log("App listening on http://localhost:3000");
});

systemUsageSetup();
