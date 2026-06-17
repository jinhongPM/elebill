import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { cors } from "hono/cors";
import { authRoutes } from "./auth";
import { tenantRoutes } from "./tenants";
import { readingRoutes } from "./readings";
import { billRoutes } from "./bills";
import { settingsRoutes } from "./settings";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// CORS --- 允许生产环境所有来源
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// 登录路由（公开）
app.route("/api/auth", authRoutes);

// JWT 中间件 — 之后所有 /api/* 路由需要认证
app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth")) {
    return next();
  }
  const jwtMiddleware = jwt({ secret: c.env.JWT_SECRET });
  return jwtMiddleware(c, next);
});

// 受保护路由
app.route("/api", tenantRoutes);
app.route("/api", readingRoutes);
app.route("/api", billRoutes);
app.route("/api", settingsRoutes);

app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
