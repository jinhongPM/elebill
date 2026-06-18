import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };
  const linkClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>电梯电费公摊</h2>
          <span className="user-info">{user?.username} ({isAdmin ? "管理员" : "用户"})</span>
        </div>
        <nav className="nav">
          <NavLink to="/meters" className={linkClass}>电表录入</NavLink>
          <NavLink to="/bills" className={linkClass}>账单查看</NavLink>
          <NavLink to="/summary" className={linkClass}>年度汇总</NavLink>
          {isAdmin && <NavLink to="/tenants" className={linkClass}>租户管理</NavLink>}
          {isAdmin && <NavLink to="/users" className={linkClass}>用户管理</NavLink>}
          {isAdmin && <NavLink to="/settings" className={linkClass}>系统设置</NavLink>}
        </nav>
        <button className="btn-logout" onClick={handleLogout}>退出登录</button>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}