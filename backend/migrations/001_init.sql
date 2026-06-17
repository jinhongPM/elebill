-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 插默认配置（电费单价 0.80 元/kWh）
INSERT OR IGNORE INTO settings (key, value) VALUES ('unit_price', '0.80');

-- 租户表
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  building TEXT NOT NULL CHECK(building IN ('A', 'B')),
  floor INTEGER NOT NULL CHECK(floor >= 2 AND floor <= 6),
  area REAL NOT NULL CHECK(area > 0),
  elevators TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 电表读数表
CREATE TABLE IF NOT EXISTS meter_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  elevator TEXT NOT NULL CHECK(elevator IN ('A1','A2','A3','B1','B2','B3')),
  year_month TEXT NOT NULL,
  reading REAL NOT NULL CHECK(reading >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(elevator, year_month)
);

-- 账单表
CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,
  total_cost REAL NOT NULL CHECK(total_cost >= 0),
  breakdown TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, year_month)
);
