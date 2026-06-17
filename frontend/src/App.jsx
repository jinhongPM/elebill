import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import Tenants from "./pages/Tenants";
import Meters from "./pages/Meters";
import Bills from "./pages/Bills";
import Settings from "./pages/Settings";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">鍔犺浇涓?..</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">鍔犺浇涓?..</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/meters" replace />} />
        <Route path="tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
        <Route path="meters" element={<ProtectedRoute><Meters /></ProtectedRoute>} />
        <Route path="bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
