import "dotenv/config";
import { serve } from "@hono/node-server";
import { closePool } from "./db";
import app from "./app";

const port = Number(process.env.PORT) || 8787;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(
    `Finance API http://localhost:${info.port} (health: /health, routes under /api)`
  );
});

process.on("SIGINT", async () => {
  console.log("Shutting down...");
  await closePool();
  process.exit(0);
});
