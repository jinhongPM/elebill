import { Hono } from "hono";
import { generatePasswordHash } from "./auth";

const users = new Hono();

function requireAdmin(c, next) {
  const p = c.get("jwtPayload");
  if (p.role !== "admin") return c.json({ error: "仅管理员可操作" }, 403);
  return next();
}

// 获取用户列表
users.get("/users", requireAdmin, async (c) => {
  const r = await c.env.DB.prepare(
    "SELECT id, username, role, created_at FROM users ORDER BY role, username"
  ).all();
  return c.json(r.results);
});

// 新增用户
users.post("/users", requireAdmin, async (c) => {
  const { username, password, role } = await c.req.json();
  if (!username || !password) {
    return c.json({ error: "用户名和密码不能为空" }, 400);
  }
  if (role !== "admin" && role !== "user") {
    return c.json({ error: "角色只能是 admin 或 user" }, 400);
  }
  // 检查用户名是否已存在
  const existing = await c.env.DB.prepare(
    "SELECT id FROM users WHERE username = ?"
  ).bind(username).first();
  if (existing) {
    return c.json({ error: "用户名已存在" }, 409);
  }
  const hash = await generatePasswordHash(password);
  const r = await c.env.DB.prepare(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) RETURNING id, username, role, created_at"
  ).bind(username, hash, role).first();
  return c.json(r, 201);
});

// 更新用户（角色/用户名）
users.put("/users/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const { username, role } = await c.req.json();
  if (role && role !== "admin" && role !== "user") {
    return c.json({ error: "角色只能是 admin 或 user" }, 400);
  }
  const r = await c.env.DB.prepare(
    "UPDATE users SET username = ?, role = ? WHERE id = ? RETURNING id, username, role, created_at"
  ).bind(username, role, id).first();
  if (!r) return c.json({ error: "用户不存在" }, 404);
  return c.json(r);
});

// 重置密码
users.put("/users/:id/password", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const { password } = await c.req.json();
  if (!password) return c.json({ error: "密码不能为空" }, 400);
  const hash = await generatePasswordHash(password);
  await c.env.DB.prepare(
    "UPDATE users SET password_hash = ? WHERE id = ?"
  ).bind(hash, id).run();
  return c.json({ ok: true });
});

// 删除用户
users.delete("/users/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

export { users as userRoutes };
