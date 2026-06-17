const API_BASE = "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "请求失败" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  // 租户
  getTenants: (building) =>
    request(`/tenants${building ? `?building=${building}` : ""}`),
  createTenant: (data) =>
    request("/tenants", { method: "POST", body: JSON.stringify(data) }),
  updateTenant: (id, data) =>
    request(`/tenants/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTenant: (id) =>
    request(`/tenants/${id}`, { method: "DELETE" }),

  // 电表读数
  getReadings: (yearMonth) => request(`/readings?year_month=${yearMonth}`),
  saveReadings: (yearMonth, readings) =>
    request("/readings", { method: "POST", body: JSON.stringify({ year_month: yearMonth, readings }) }),

  // 账单
  getBills: (yearMonth) => request(`/bills?year_month=${yearMonth}`),
  computeBills: (yearMonth) =>
    request("/bills/compute", { method: "POST", body: JSON.stringify({ year_month: yearMonth }) }),

  // 配置
  getSettings: () => request("/settings"),
  updateSetting: (key, value) =>
    request(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
};
