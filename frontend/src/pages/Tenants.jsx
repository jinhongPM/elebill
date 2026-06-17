import React, { useState, useEffect } from "react";
import { api } from "../api";

const ELEVATORS = { A: ["A1", "A2", "A3"], B: ["B1", "B2", "B3"] };
const FLOORS = [2, 3, 4, 5, 6];

export default function Tenants() {
  const [showForm, setShowForm] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", building: "A", floor: 2, area: "", elevators: [] });

  useEffect(() => { loadTenants(); }, [filter]);

  async function loadTenants() {
    const data = await api.getTenants(filter || undefined);
    setTenants(data);
  }

  function resetForm() {
    setForm({ name: "", building: "A", floor: 2, area: "", elevators: [] });
    setEditing(null);
  }

  function startEdit(t) {
    setShowForm(true);
    setForm({ name: t.name, building: t.building, floor: t.floor, area: String(t.area), elevators: t.elevators.split(",").map((e) => e.trim()) });
    setEditing(t.id);
  }

  function toggleElevator(el) {
    setForm((f) => ({ ...f, elevators: f.elevators.includes(el) ? f.elevators.filter((e) => e !== el) : [...f.elevators, el] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const data = { name: form.name, building: form.building, floor: Number(form.floor), area: Number(form.area), elevators: form.elevators.join(",") };
    if (editing) { await api.updateTenant(editing, data); } else { await api.createTenant(data); }
    resetForm();
    setShowForm(false);
    loadTenants();
  }

  async function handleDelete(id) {
    if (!confirm("确定删除此租户？")) return;
    await api.deleteTenant(id);
    loadTenants();
  }

  return (
    <div className="page">
      <h2>租户管理</h2>
      <div className="toolbar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">全部楼栋</option>
          <option value="A">A栋</option>
          <option value="B">B栋</option>
        </select>
        <button className="btn-primary" onClick={() => { setShowForm(true); resetForm(); }}>新增租户</button>
      </div>

      {showForm && (
        <form className="card form-tenant" onSubmit={handleSubmit}>
          <h3>{editing ? "编辑租户" : "新增租户"}</h3>
          <div className="form-row">
            <label>名称<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>楼栋
              <select value={form.building} onChange={(e) => { setForm({ ...form, building: e.target.value, elevators: [] }) }}>
                <option value="A">A栋</option>
                <option value="B">B栋</option>
              </select>
            </label>
            <label>楼层
              <select value={form.floor} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })}>
                {FLOORS.map((f) => <option key={f} value={f}>{f}楼</option>)}
              </select>
            </label>
            <label>面积 (㎡)<input type="number" step="0.1" min="0" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required /></label>
          </div>
          <div className="form-row">
            <label>使用电梯：</label>
            <div className="elevator-checkboxes">
              {ELEVATORS[form.building].map((el) => (
                <label key={el} className="checkbox-label">
                  <input type="checkbox" checked={form.elevators.includes(el)} onChange={() => toggleElevator(el)} />
                  {el}
                </label>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editing ? "保存" : "新增"}</button>
            <button type="button" className="btn-secondary" onClick={() => { resetForm(); setShowForm(false); }}>取消</button>
          </div>
        </form>
      )}

      <table className="table">
        <thead>
          <tr><th>名称</th><th>楼栋</th><th>楼层</th><th>面积(㎡)</th><th>使用电梯</th><th>操作</th></tr>
        </thead>
        <tbody>
          {tenants.length === 0 && <tr><td colSpan="6" className="empty">暂无租户</td></tr>}
          {tenants.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td><td>{t.building}栋</td><td>{t.floor}楼</td><td>{t.area}</td><td>{t.elevators}</td>
              <td className="actions">
                <button className="btn-sm" onClick={() => startEdit(t)}>编辑</button>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(t.id)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}