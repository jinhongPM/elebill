const API_BASE = "https://elevator-cost-api.jhelebill.workers.dev/api";

async function request(path, options) {
  if (!options) options = {};
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (options.headers) Object.assign(headers, options.headers);
  if (token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(API_BASE + path, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error((err && err.error) || "HTTP " + res.status);
  }
  return res.json();
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  getTenants: (building) => {
    var q = building ? "?building=" + building : "";
    return request("/tenants" + q);
  },
  createTenant: (data) =>
    request("/tenants", { method: "POST", body: JSON.stringify(data) }),
  updateTenant: (id, data) =>
    request("/tenants/" + id, { method: "PUT", body: JSON.stringify(data) }),
  deleteTenant: (id) =>
    request("/tenants/" + id, { method: "DELETE" }),

  getReadings: (yearMonth) => request("/readings?year_month=" + yearMonth),
  saveReadings: (yearMonth, readings) =>
    request("/readings", { method: "POST", body: JSON.stringify({ year_month: yearMonth, readings }) }),

  getBills: (yearMonth) => request("/bills?year_month=" + yearMonth),
  getBillsResult: (yearMonth) => request("/bills/result?year_month=" + yearMonth),
  computeBills: (yearMonth) =>
    request("/bills/compute", { method: "POST", body: JSON.stringify({ year_month: yearMonth }) }),

  getSettings: () => request("/settings"),
  updateSetting: (key, value) =>
    request("/settings/" + key, { method: "PUT", body: JSON.stringify({ value }) }),

  getUsers: () => request("/users"),
  createUser: (data) =>
    request("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id, data) =>
    request("/users/" + id, { method: "PUT", body: JSON.stringify(data) }),
  resetPassword: (id, password) =>
    request("/users/" + id + "/password", { method: "PUT", body: JSON.stringify({ password }) }),
  getSummary: (year) => request("/bills/summary?year=" + year),

  deleteUser: (id) =>
    request("/users/" + id, { method: "DELETE" }),
};
