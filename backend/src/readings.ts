import { Hono } from "hono";
import type { Env, MeterReading } from "./types";

const readings = new Hono<{ Bindings: Env }>();

readings.get("/readings", async (c) => {
  const { year_month } = c.req.query();
  if (!year_month) return c.json({ error: "请指定年月" }, 400);
  const result = await c.env.DB.prepare("SELECT * FROM meter_readings WHERE year_month = ? ORDER BY elevator").bind(year_month).all<MeterReading>();
  return c.json(result.results);
});

readings.get("/readings/:elevator", async (c) => {
  const elevator = c.req.param("elevator");
  const result = await c.env.DB.prepare("SELECT * FROM meter_readings WHERE elevator = ? ORDER BY year_month DESC LIMIT 12").bind(elevator).all<MeterReading>();
  return c.json(result.results);
});

readings.post("/readings", async (c) => {
  const body = await c.req.json();
  const { year_month, readings } = body;
  if (!year_month || !readings) return c.json({ error: "参数缺少 year_month 或 readings" }, 400);
  const elevators = ["A1", "A2", "A3", "B1", "B2", "B3"];
  const stmt = c.env.DB.prepare("INSERT INTO meter_readings (elevator, year_month, reading) VALUES (?, ?, ?) ON CONFLICT(elevator, year_month) DO UPDATE SET reading = excluded.reading");
  for (const el of elevators) { if (readings[el] !== undefined) { await stmt.bind(el, year_month, readings[el]).run(); } }
  return c.json({ ok: true });
});

export { readings as readingRoutes };