// 数据库类型定义
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export interface Tenant {
  id: number;
  name: string;
  building: string;
  floor: number;
  area: number;
  elevators: string;
  created_at: string;
  updated_at: string;
}

export interface MeterReading {
  id: number;
  elevator: string;
  year_month: string;
  reading: number;
  created_at: string;
}

export interface Bill {
  id: number;
  tenant_id: number;
  year_month: string;
  total_cost: number;
  breakdown: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: string;
}

export interface ElevatorCost {
  elevator: string;
  cost: number;
  total_area: number;
  per_sqm: number;
}

export interface TenantBillDetail {
  tenant_id: number;
  tenant_name: string;
  building: string;
  floor: number;
  area: number;
  elevators: string;
  per_sqm_sum: number;
  total_cost: number;
  details: ElevatorCost[];
}
