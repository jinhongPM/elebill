import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
            <line x1="9" y1="16" x2="15" y2="16"/>
            <line x1="12" y1="16" x2="12" y2="20"/>
            <line x1="8" y1="18" x2="16" y2="18"/>
            <line x1="12" y1="8" x2="12" y2="11"/>
            <circle cx="12" cy="6" r="1"/>
          </svg>
        </div>
        <h1>电梯电费公摊计算</h1>
        <p className="login-subtitle">请输入账号密码登录</p>
        {error && <div className="error-msg">{error}</div>}
        <label>用户名<input value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label>密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button type="submit" disabled={loading}>{loading ? "登录中..." : "登录"}</button>
      </form>
    </div>
  );
}
