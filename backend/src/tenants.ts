import { Hono } from "hono";
import type { Env, Tenant } from "./types";

const tenants = new Hono<{ Bindings: Env }>();

// 检查管理员权限中间件
function requireAdmin(c: any, next: any) {
  const payload = c.get("jwtPayload");
  if (payload.role !== "admin") {
    return c.json({ error: "仅管理员可操作" }, 403);
  }
  return next();
}

// 获取所有租户
tenants.get("/tenants", async (c) => {
  const { building } = c.req.query();
  let query = "SELECT * FROM tenants ORDER BY building, floor, name";
  let stmt = c.env.DB.prepare(query);
  if (building) {
    query = "SELECT * FROM tenants WHERE building = ? ORDER BY floor, name";
    stmt = c.env.DB.prepare(query).bind(building);
  }
  const result = await stmt.all<Tenant>();
  return c.json(result.results);
});

// 创建租户（仅管理员）
tenants.post("/tenants", requireAdmin, async (c) => {
  const { name, building, floor, area, elevators } = await c.req.json();
  if (!name || !building || !floor || !area || !elevators) {
    return c.json({ error: "所有字段必填" }, 400);
  }
  if (building !== "A" && building !== "B") {
    return c.json({ error: "楼栋只能是 A 或 B" }, 400);
  }
  if (floor < 2 || floor > 6) {
    return c.json({ error: "楼层 2-6" }, 400);
  }

  const result = await c.env.DB.prepare(
    "INSERT INTO tenants (name, building, floor, area, elevators) VALUES (?, ?, ?, ?, ?) RETURNING *"
  ).bind(name, building, floor, area, elevators).first<Tenant>();

  return c.json(result, 201);
});

// 更新租户（仅管理员）
tenants.put("/tenants/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const { name, building, floor, area, elevators } = await c.req.json();

  const result = await c.env.DB.prepare(
    "UPDATE tenants SET name=?, building=?, floor=?, area=?, elevators=?, updated_at=datetime('now') WHERE id=? RETURNING *"
  ).bind(name, building, floor, area, elevators, id).first<Tenant>();

  if (!result) return c.json({ error: "租户不存在" }, 404);
  return c.json(result);
});

// 删除租户（仅管理员）
tenants.delete("/tenants/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

export { tenants as tenantRoutes };
