import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", role: "user" });
  const [resetPwd, setResetPwd] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      var data = await api.getUsers();
      setUsers(data);
    } catch (e) { setError(e.message); }
  }

  function openNew() {
    setEditing(null);
    setForm({ username: "", password: "", role: "user" });
    setShowForm(true);
    setError("");
  }

  function openEdit(u) {
    setEditing(u.id);
    setForm({ username: u.username, role: u.role });
    setShowForm(true);
    setError("");
  }

  async function handleSave() {
    if (!form.username) { setError("请输入用户名"); return; }
    if (!editing && !form.password) { setError("请输入密码"); return; }
    setLoading(true); setError("");
    try {
      if (editing) {
        await api.updateUser(editing, { username: form.username, role: form.role });
      } else {
        await api.createUser(form);
      }
      setShowForm(false);
      loadUsers();
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function handleResetPwd() {
    if (!newPassword) { setError("请输入新密码"); return; }
    setLoading(true); setError("");
    try {
      await api.resetPassword(resetPwd, newPassword);
      setResetPwd(null);
      setNewPassword("");
      alert("密码已重置");
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function handleDelete(id, username) {
    if (!confirm("确定删除用户 \"" + username + "\"？")) return;
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (e) { setError(e.message); }
  }

  const filtered = users.filter(function(u) {
    if (!search) return true;
    var q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="page">
      <h2>用户管理</h2>
      {error && <div className="error-msg">{error}</div>}

      <div className="toolbar">
        <input className="search-input" type="text" placeholder="搜索用户名..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn-primary" onClick={openNew}>新增用户</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>{editing ? "编辑用户" : "新增用户"}</h3>
          <div className="form-row">
            <label>用户名              <input type="text" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={!!editing} />
            </label>
          </div>
          {!editing && (
            <div className="form-row">
              <label>密码
                <input type="password" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </label>
            </div>
          )}
          <div className="form-row">
            <label>角色
              <select value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <button className="btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>取消</button>
          </div>
        </div>
      )}

      {resetPwd && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>重置密码</h3>
          <div className="form-row">
            <label>新密码              <input type="password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} />
            </label>
          </div>
          <div className="form-row">
            <button className="btn-primary" onClick={handleResetPwd} disabled={loading}>
              {loading ? "重置中..." : "确认重置"}
            </button>
            <button className="btn-secondary" onClick={() => { setResetPwd(null); setNewPassword(""); }}>取消</button>
          </div>
        </div>
      )}

      <table className="table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>用户名</th>
            <th>角色</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && <tr><td colSpan="4" className="empty">暂无用户</td></tr>}
          {filtered.map((u) => (
            <tr key={u.id}>
              <td>{u.username}</td>
              <td>{u.role === "admin" ? "管理员" : "普通用户"}</td>
              <td>{u.created_at}</td>
              <td>
                <button className="btn-sm btn-primary" onClick={() => openEdit(u)}>编辑</button>
                <button className="btn-sm btn-secondary" onClick={() => setResetPwd(u.id)}>重置密码</button>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(u.id, u.username)}>删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
