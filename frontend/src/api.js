const API_BASE = "https://elevator-cost-api.jhelebill.workers.dev/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "璇锋眰澶辫触" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  // 绉熸埛
  getTenants: (building) =>
    request(`/tenants${building ? `?building=${building}` : ""}`),
  createTenant: (data) =>
    request("/tenants", { method: "POST", body: JSON.stringify(data) }),
  updateTenant: (id, data) =>
    request(`/tenants/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTenant: (id) =>
    request(`/tenants/${id}`, { method: "DELETE" }),

  // 鐢佃〃璇绘暟
  getReadings: (yearMonth) => request(`/readings?year_month=${yearMonth}`),
  saveReadings: (yearMonth, readings) =>
    request("/readings", { method: "POST", body: JSON.stringify({ year_month: yearMonth, readings }) }),

  // 璐﹀崟
  getBills: (yearMonth) => request(`/bills?year_month=${yearMonth}`),
  computeBills: (yearMonth) =>
    request("/bills/compute", { method: "POST", body: JSON.stringify({ year_month: yearMonth }) }),

  // 閰嶇疆
  getSettings: () => request("/settings"),
  updateSetting: (key, value) =>
    request(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
};

