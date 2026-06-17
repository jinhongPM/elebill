import { Hono } from "hono";
import type { Env, Tenant, MeterReading, ElevatorCost, TenantBillDetail } from "./types";

const bills = new Hono<{ Bindings: Env }>();

// 获取某月的账单
bills.get("/bills", async (c) => {
  const { year_month } = c.req.query();
  if (!year_month) return c.json({ error: "请指定年月" }, 400);

  const result = await c.env.DB.prepare(
    `SELECT b.*, t.name as tenant_name, t.building, t.floor, t.area, t.elevators
     FROM bills b JOIN tenants t ON b.tenant_id = t.id
     WHERE b.year_month = ? ORDER BY t.building, t.floor, t.name`
  ).bind(year_month).all();
  return c.json(result.results);
});

// 计算某月账单
bills.post("/bills/compute", async (c) => {
  const { year_month } = await c.req.json();
  if (!year_month) return c.json({ error: "请指定年月" }, 400);

  // 解析年月，计算上月
  const [y, m] = year_month.split("-").map(Number);
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;

  // 1. 获取全局电费单价
  const setting = await c.env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'unit_price'"
  ).first<{ value: string }>();
  const unitPrice = setting ? parseFloat(setting.value) : 0.80;

  // 2. 获取本月和上月的电表读数
  const currentReadings = await c.env.DB.prepare(
    "SELECT * FROM meter_readings WHERE year_month = ?"
  ).bind(year_month).all<MeterReading>();
  const prevReadings = await c.env.DB.prepare(
    "SELECT * FROM meter_readings WHERE year_month = ?"
  ).bind(prevMonth).all<MeterReading>();

  if (currentReadings.results.length === 0) {
    return c.json({ error: `${year_month} 尚未录入电表读数` }, 400);
  }

  // 构建 lookup: Map<elevator, reading>
  const currentMap = new Map(currentReadings.results.map((r) => [r.elevator, r.reading]));
  const prevMap = new Map(prevReadings.results.map((r) => [r.elevator, r.reading]));

  // 3. 获取所有租户
  const tenants = await c.env.DB.prepare(
    "SELECT * FROM tenants ORDER BY building, floor"
  ).all<Tenant>();

  if (tenants.results.length === 0) {
    return c.json({ error: "尚未录入租户信息" }, 400);
  }

  // 4. 每栋楼：统计使用每个电梯的租户总面积
  function calcPerSqm(building: string): Map<string, ElevatorCost> {
    const buildingTenants = tenants.results.filter((t) => t.building === building);
    const result = new Map<string, ElevatorCost>();
    const elevators = building === "A" ? ["A1", "A2", "A3"] : ["B1", "B2", "B3"];

    for (const el of elevators) {
      const currentReading = currentMap.get(el);
      if (currentReading === undefined) {
        result.set(el, { elevator: el, cost: 0, total_area: 0, per_sqm: 0 });
        continue;
      }

      // 本月用电量
      const prevReading = prevMap.get(el) ?? 0;
      const usage = currentReading - prevReading;
      const cost = usage * unitPrice;

      // 使用该电梯的租户总面积
      const usingTenants = buildingTenants.filter((t) => t.elevators.includes(el));
      const totalArea = usingTenants.reduce((sum, t) => sum + t.area, 0);

      const perSqm = totalArea > 0 ? cost / totalArea : 0;
      result.set(el, { elevator: el, cost, total_area: totalArea, per_sqm: perSqm });
    }
    return result;
  }

  const aCosts = calcPerSqm("A");
  const bCosts = calcPerSqm("B");

  // 5. 计算每个租户的费用并写入数据库
  const details: TenantBillDetail[] = [];

  for (const tenant of tenants.results) {
    const costs = tenant.building === "A" ? aCosts : bCosts;
    const usedElevators = tenant.elevators.split(",").map((e) => e.trim());

    // 租户使用的电梯明细
    const elevatorDetails: ElevatorCost[] = [];
    let perSqmSum = 0;

    for (const el of usedElevators) {
      const ec = costs.get(el);
      if (ec) {
        elevatorDetails.push(ec);
        perSqmSum += ec.per_sqm;
      }
    }

    const totalCost = Math.round(tenant.area * perSqmSum * 100) / 100;

    details.push({
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      building: tenant.building,
      floor: tenant.floor,
      area: tenant.area,
      elevators: tenant.elevators,
      per_sqm_sum: Math.round(perSqmSum * 10000) / 10000,
      total_cost: totalCost,
      details: elevatorDetails,
    });

    // 写入/更新 bills 表
    await c.env.DB.prepare(
      `INSERT INTO bills (tenant_id, year_month, total_cost, breakdown)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(tenant_id, year_month) DO UPDATE SET total_cost = excluded.total_cost, breakdown = excluded.breakdown`
    ).bind(tenant.id, year_month, totalCost, JSON.stringify(elevatorDetails)).run();
  }

  return c.json({
    year_month,
    unit_price: unitPrice,
    a_elevators: Object.fromEntries(aCosts),
    b_elevators: Object.fromEntries(bCosts),
    tenants: details,
  });
});

// 删除某月账单
bills.delete("/bills", async (c) => {
  const { year_month } = await c.req.json();
  if (!year_month) return c.json({ error: "请指定年月" }, 400);
  await c.env.DB.prepare("DELETE FROM bills WHERE year_month = ?").bind(year_month).run();
  return c.json({ ok: true });
});

export { bills as billRoutes };
