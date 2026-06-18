import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwtMiddleware } from "./jwt";
import { authRoutes } from "./auth";
import { tenantRoutes } from "./tenants";
import { readingRoutes } from "./readings";
import { billRoutes } from "./bills";
import { settingsRoutes } from "./settings";
import { userRoutes } from "./users";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use("/api/*", cors({ origin: "*", allowMethods: ["GET","POST","PUT","DELETE","OPTIONS"], allowHeaders: ["Content-Type","Authorization"] }));

// 登录路由（公开）
app.route("/api/auth", authRoutes);

// JWT 中间件 — 保护 /api/*（排除 /api/auth）
app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth")) return next();
  const mw = jwtMiddleware(c.env.JWT_SECRET);
  return mw(c, next);
});

// 业务路由
app.route("/api", tenantRoutes);
app.route("/api", readingRoutes);
app.route("/api", billRoutes);
app.route("/api", settingsRoutes);
app.route("/api", userRoutes);
app.get("/api/health", (c) => c.json({ ok: true }));

export default app;