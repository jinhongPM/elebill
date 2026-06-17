import { Hono } from "hono";
import type { Env } from "./types";

const bills = new Hono<{ Bindings: Env }>();

bills.get("/bills", async (c) => {
  const { year_month } = c.req.query();
  if (!year_month) return c.json({ error: "请指定年月" }, 400);
  const sql = "SELECT b.*, t.name as tenant_name, t.building, t.floor, t.area, t.elevators" +
    " FROM bills b JOIN tenants t ON b.tenant_id = t.id" +
    " WHERE b.year_month = ? ORDER BY t.building, t.floor, t.name";
  const result = await c.env.DB.prepare(sql).bind(year_month).all();
  return c.json(result.results);
});

bills.post("/bills/compute", async (c) => {
  const { year_month } = await c.req.json();
  if (!year_month) return c.json({ error: "请指定年月" }, 400);
  const [y, m] = year_month.split("-").map(Number);
  const prevMonth = m === 1 ? (y - 1) + "-12" : y + "-" + String(m - 1).padStart(2, "0");
  const setting = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'unit_price'").first();
  const unitPrice = setting ? parseFloat(setting.value) : 0.80;
  const curRows = await c.env.DB.prepare("SELECT * FROM meter_readings WHERE year_month = ?").bind(year_month).all();
  if (curRows.results.length === 0) return c.json({ error: "本月尚无电表读数" }, 400);
  const prevRows = await c.env.DB.prepare("SELECT * FROM meter_readings WHERE year_month = ?").bind(prevMonth).all();
  var curMap = new Map(curRows.results.map(r => [r.elevator, r.reading]));
  var prevMap = new Map(prevRows.results.map(r => [r.elevator, r.reading]));
  var tenants = await c.env.DB.prepare("SELECT * FROM tenants ORDER BY building, floor").all();
  if (tenants.results.length === 0) return c.json({ error: "尚未录入租户信息" }, 400);

  function calc(building) {
    var bt = tenants.results.filter(t => t.building === building);
    var els = building === "A" ? ["A1","A2","A3"] : ["B1","B2","B3"];
    var map = new Map();
    for (var el of els) {
      var cur = curMap.get(el);
      if (cur === undefined) { map.set(el, { elevator: el, prev_reading:0, current_reading:0, usage:0, cost:0, total_area:0, per_sqm:0 }); continue; }
      var prev = prevMap.get(el) ?? 0;
      var usage = cur - prev;
      var cost = usage * unitPrice;
      var totalArea = bt.filter(t => t.elevators.includes(el)).reduce((s, t) => s + t.area, 0);
      map.set(el, { elevator:el, prev_reading:prev, current_reading:cur, usage, cost, total_area:totalArea, per_sqm: totalArea > 0 ? cost / totalArea : 0 });
    }
    return map;
  }

  var aCosts = calc("A"), bCosts = calc("B"), details = [];
  for (var t of tenants.results) {
    var costs = t.building === "A" ? aCosts : bCosts;
    var used = t.elevators.split(",").map(e => e.trim()), sum = 0, det = [];
    for (var el of used) { var ec = costs.get(el); if (ec) { det.push(ec); sum += ec.per_sqm; } }
    var total = Math.round(t.area * sum * 100) / 100;
    details.push({ tenant_id:t.id, tenant_name:t.name, building:t.building, floor:t.floor, area:t.area, elevators:t.elevators, per_sqm_sum:Math.round(sum*10000)/10000, total_cost:total, details:det });
    var sql = "INSERT INTO bills (tenant_id, year_month, total_cost, breakdown) VALUES (?, ?, ?, ?) ON CONFLICT(tenant_id, year_month) DO UPDATE SET total_cost=excluded.total_cost, breakdown=excluded.breakdown";
    await c.env.DB.prepare(sql).bind(t.id, year_month, total, JSON.stringify(det)).run();
  }
  return c.json({ year_month, unit_price:unitPrice, a_elevators:Object.fromEntries(aCosts), b_elevators:Object.fromEntries(bCosts), tenants:details });
});

bills.delete("/bills", async (c) => {
  var { year_month } = await c.req.json();
  if (!year_month) return c.json({ error: "请指定年月" }, 400);
  await c.env.DB.prepare("DELETE FROM bills WHERE year_month = ?").bind(year_month).run();
  return c.json({ ok: true });
});

export { bills as billRoutes };
