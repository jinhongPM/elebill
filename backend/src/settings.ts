import { Hono } from "hono";
import type { Env } from "./types";

const settings = new Hono<{ Bindings: Env }>();

function requireAdmin(c: any, next: any) {
  const payload = c.get("jwtPayload");
  if (payload.role !== "admin") return c.json({ error: "仅管理员可操作" }, 403);
  return next();
}

settings.get("/settings", async (c) => {
  const result = await c.env.DB.prepare("SELECT key, value FROM settings").all();
  return c.json(result.results);
});

settings.put("/settings/:key", requireAdmin, async (c) => {
  const key = c.req.param("key");
  const { value } = await c.req.json();
  await c.env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, String(value)).run();
  return c.json({ key, value });
});

export { settings as settingsRoutes };