import { Hono } from "hono";
const tenants = new Hono();

function requireAdmin(c, next) {
  const p = c.get("jwtPayload");
  if (p.role !== "admin") return c.json({ error: "仅管理员可操作" }, 403);
  return next();
}

tenants.get("/tenants", async (c) => {
  const b = c.req.query("building");
  const sql = b ? "SELECT * FROM tenants WHERE building = ? ORDER BY floor DESC, name" : "SELECT * FROM tenants ORDER BY building, floor DESC, name";
  const r = b ? await c.env.DB.prepare(sql).bind(b).all() : await c.env.DB.prepare(sql).all();
  return c.json(r.results);
});

tenants.post("/tenants", requireAdmin, async (c) => {
  const d = await c.req.json();
  if (!d.name || !d.building || !d.floor || !d.area || !d.elevators) return c.json({ error: "所有字段必填" }, 400);
  if (d.building !== "A" && d.building !== "B") return c.json({ error: "楼栋只能是 A 或 B" }, 400);
  if (d.floor < 2 || d.floor > 6) return c.json({ error: "楼层 2-6" }, 400);
  const r = await c.env.DB.prepare("INSERT INTO tenants (name, building, floor, area, elevators) VALUES (?, ?, ?, ?, ?) RETURNING *").bind(d.name, d.building, d.floor, d.area, d.elevators).first();
  return c.json(r, 201);
});

tenants.put("/tenants/:id", requireAdmin, async (c) => {
  const id = c.req.param("id");
  const d = await c.req.json();
  const r = await c.env.DB.prepare("UPDATE tenants SET name=?, building=?, floor=?, area=?, elevators=? WHERE id=? RETURNING *").bind(d.name, d.building, d.floor, d.area, d.elevators, id).first();
  if (!r) return c.json({ error: "租户不存在" }, 404);
  return c.json(r);
});

tenants.delete("/tenants/:id", requireAdmin, async (c) => {
  await c.env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});

export { tenants as tenantRoutes };