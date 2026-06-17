import { Hono } from "hono";
import { sign } from "hono/jwt";
import type { Env, User } from "./types";

const auth = new Hono<{ Bindings: Env }>();

// ----- 密码工具 (Web Crypto API) -----
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password),
    { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  const toHex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${toHex(salt)}:${toHex(new Uint8Array(hash))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password),
    { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  const newHashHex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return newHashHex === hashHex;
}

// ----- 路由 -----

auth.post("/login", async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) {
    return c.json({ error: "用户名和密码不能为空" }, 400);
  }

  const result = await c.env.DB.prepare(
    "SELECT id, username, password_hash, role FROM users WHERE username = ?"
  ).bind(username).first<User>();

  if (!result) {
    return c.json({ error: "用户名或密码错误" }, 401);
  }

  const match = await verifyPassword(password, result.password_hash);
  if (!match) {
    return c.json({ error: "用户名或密码错误" }, 401);
  }

  const token = await sign(
    {
      sub: result.id,
      username: result.username,
      role: result.role,
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    },
    c.env.JWT_SECRET
  );

  return c.json({
    token,
    user: { id: result.id, username: result.username, role: result.role },
  });
});

auth.get("/me", async (c) => {
  const payload = c.get("jwtPayload");
  const result = await c.env.DB.prepare(
    "SELECT id, username, role FROM users WHERE id = ?"
  ).bind(payload.sub).first();
  return c.json(result);
});

export { auth as authRoutes, hashPassword as generatePasswordHash };
