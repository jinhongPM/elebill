'use strict';
import { Hono } from 'hono';

var bills = new Hono();

// 获取账单（不含电梯详情）
bills.get('/bills', async function(c) {
  var ym = c.req.query('year_month');
  if (!ym) return c.json({ error: '请指定年月' }, 400);
  var sql = 'SELECT b.*, t.name as tenant_name, t.building, t.floor, t.area, t.elevators FROM bills b JOIN tenants t ON b.tenant_id = t.id WHERE b.year_month = ? ORDER BY t.building, t.floor, t.name';
  var r = await c.env.DB.prepare(sql).bind(ym).all();
  return c.json(r.results);
});

// 获取某月的完整计算结果（含电梯详情）
bills.get('/bills/result', async function(c) {
  var ym = c.req.query('year_month');
  if (!ym) return c.json({ error: '请指定年月' }, 400);
  var r = await c.env.DB.prepare('SELECT data FROM compute_results WHERE year_month = ?').bind(ym).first();
  if (!r) return c.json(null, 404);
  return c.json(JSON.parse(r.data));
});

// 计算账单
bills.post('/bills/compute', async function(c) {
  var body = await c.req.json();
  var year_month = body.year_month;
  if (!year_month) return c.json({ error: '请指定年月' }, 400);

  // 自动建表（兼容首次运行）
  await c.env.DB.prepare('CREATE TABLE IF NOT EXISTS compute_results (year_month TEXT PRIMARY KEY, data TEXT NOT NULL)').run();

  var parts = year_month.split('-').map(Number);
  var prevMonth = parts[1] === 1 ? (parts[0] - 1) + '-12' : parts[0] + '-' + String(parts[1] - 1).padStart(2, '0');

  var setting = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('unit_price').first();
  var unitPrice = setting ? parseFloat(setting.value) : 0.80;

  var curRows = await c.env.DB.prepare('SELECT * FROM meter_readings WHERE year_month = ?').bind(year_month).all();
  if (curRows.results.length === 0) return c.json({ error: '本月尚无电表读数' }, 400);
  var prevRows = await c.env.DB.prepare('SELECT * FROM meter_readings WHERE year_month = ?').bind(prevMonth).all();

  var curMap = new Map();
  curRows.results.forEach(function(r) { curMap.set(r.elevator, r.reading); });
  var prevMap = new Map();
  prevRows.results.forEach(function(r) { prevMap.set(r.elevator, r.reading); });

  var tenants = await c.env.DB.prepare('SELECT * FROM tenants ORDER BY building, floor').all();
  if (tenants.results.length === 0) return c.json({ error: '尚未录入租户信息' }, 400);

  function calc(building) {
    var bt = tenants.results.filter(function(t) { return t.building === building; });
    var els = building === 'A' ? ['A1','A2','A3'] : ['B1','B2','B3'];
    var map = {};
    els.forEach(function(el) {
      var cur = curMap.get(el);
      if (cur === undefined) { map[el] = { elevator: el, prev_reading: 0, current_reading: 0, usage: 0, cost: 0, total_area: 0, per_sqm: 0 }; return; }
      var prev = prevMap.get(el) || 0;
      var usage = cur - prev;
      var cost = usage * unitPrice;
      var totalArea = 0;
      bt.forEach(function(t) { if (t.elevators.indexOf(el) !== -1) totalArea += t.area; });
      map[el] = { elevator: el, prev_reading: prev, current_reading: cur, usage: usage, cost: cost, total_area: totalArea, per_sqm: totalArea > 0 ? cost / totalArea : 0 };
    });
    return map;
  }

  var aCosts = calc('A');
  var bCosts = calc('B');
  var details = [];

  tenants.results.forEach(function(tenant) {
    var costs = tenant.building === 'A' ? aCosts : bCosts;
    var used = tenant.elevators.split(',').map(function(e) { return e.trim(); });
    var perSqmSum = 0;
    var elDetails = [];
    used.forEach(function(el) {
      var ec = costs[el];
      if (ec) { elDetails.push(ec); perSqmSum += ec.per_sqm; }
    });
    var totalCost = Math.round(tenant.area * perSqmSum * 100) / 100;
    details.push({ tenant_id: tenant.id, tenant_name: tenant.name, building: tenant.building, floor: tenant.floor, area: tenant.area, elevators: tenant.elevators, per_sqm_sum: Math.round(perSqmSum * 10000) / 10000, total_cost: totalCost });

    var insertSQL = 'INSERT INTO bills (tenant_id, year_month, total_cost, breakdown) VALUES (?, ?, ?, ?) ON CONFLICT(tenant_id, year_month) DO UPDATE SET total_cost = excluded.total_cost, breakdown = excluded.breakdown';
    c.env.DB.prepare(insertSQL).bind(tenant.id, year_month, totalCost, JSON.stringify(elDetails)).run();
  });

  var fullResult = { year_month: year_month, unit_price: unitPrice, a_elevators: aCosts, b_elevators: bCosts, tenants: details };

  // 保存完整结果用于后续查看
  c.env.DB.prepare('INSERT OR REPLACE INTO compute_results (year_month, data) VALUES (?, ?)').bind(year_month, JSON.stringify(fullResult)).run();

  return c.json(fullResult);
});

bills.delete('/bills', async function(c) {
  var body = await c.req.json();
  if (!body.year_month) return c.json({ error: '请指定年月' }, 400);
  await c.env.DB.prepare('DELETE FROM bills WHERE year_month = ?').bind(body.year_month).run();
  await c.env.DB.prepare('DELETE FROM compute_results WHERE year_month = ?').bind(body.year_month).run();
  return c.json({ ok: true });
});

export { bills as billRoutes };