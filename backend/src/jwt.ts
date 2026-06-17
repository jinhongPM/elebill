// 自定义 JWT 工具 — 用 Web Crypto API 实现
// 支持 HS256 签名和验证

export async function sign(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = await hmacSHA256(headerB64 + "." + payloadB64, secret);
  return headerB64 + "." + payloadB64 + "." + signature;
}

export async function verify(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const expectedSig = await hmacSHA256(headerB64 + "." + payloadB64, secret);
  if (sigB64 !== expectedSig) return null;
  try {
    return JSON.parse(base64urlDecode(payloadB64));
  } catch {
    return null;
  }
}

// Middleware 工厂
export function jwtMiddleware(secret: string) {
  return async (c: any, next: any) => {
    const auth = c.req.header("Authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return c.json({ error: "未提供认证令牌" }, 401);
    }
    const token = auth.slice(7);
    const payload = await verify(token, secret);
    if (!payload) {
      return c.json({ error: "令牌无效或已过期" }, 401);
    }
    c.set("jwtPayload", payload);
    await next();
  };
}

// ----- 工具函数 -----

function base64url(str: string): string {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

async function hmacSHA256(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64url(String.fromCharCode(...new Uint8Array(sig)));
}
