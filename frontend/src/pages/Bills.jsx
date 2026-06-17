import React, { useState, useEffect } from "react";
import { api } from "../api";

function getCurrentMonth() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

export default function Bills() {
  const [yearMonth, setYearMonth] = useState(getCurrentMonth());
  const [bills, setBills] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadBills(); }, [yearMonth]);

  async function loadBills() {
    try { const data = await api.getBills(yearMonth); setBills(data); setError(""); } catch { setBills(null); }
  }

  async function handleCompute() {
    setLoading(true); setError(""); setBills(null);
    try { const data = await api.computeBills(yearMonth); setBills(data.tenants); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleExport() {
    if (!bills || bills.length === 0) return;
    const XLSX = await import("xlsx");
    const rows = bills.map((b) => ({
      "租户": b.tenant_name, "楼栋": b.building + "栋", "楼层": b.floor + "楼",
      "面积(㎡)": b.area, "使用电梯": b.elevators,
      "电梯单价合计(元/㎡)": b.per_sqm_sum, "公摊电费(元)": b.total_cost
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, yearMonth + "电梯电费");
    XLSX.writeFile(wb, "电梯电费_" + yearMonth + ".xlsx");
  }

  function handlePrint() { window.print(); }

  const aBills = bills ? bills.filter((b) => b.building === "A") : [];
  const bBills = bills ? bills.filter((b) => b.building === "B") : [];
  const total = aBills.reduce((s, b) => s + b.total_cost, 0) + bBills.reduce((s, b) => s + b.total_cost, 0);

  return (
    <div className="page">
      <h2>账单查看</h2>
      <div className="card">
        <div className="form-row">
          <label>月份<input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} /></label>
          <button className="btn-primary" onClick={handleCompute} disabled={loading}>{loading ? "计算中..." : "计算本月账单"}</button>
          {bills && bills.length > 0 && <><button className="btn-secondary" onClick={handleExport}>导出 Excel</button><button className="btn-secondary" onClick={handlePrint}>打印</button></>}
        </div>
        {error && <div className="error-msg">{error}</div>}
      </div>

      {bills && bills.length > 0 && (
        <div className="bills-section">
          <div className="bill-group">
            <h3>A栋 - {yearMonth} 电梯电费</h3>
            <table className="table">
              <thead><tr><th>租户</th><th>楼层</th><th>面积(㎡)</th><th>使用电梯</th><th>单价合计(元/㎡)</th><th>公摊电费(元)</th></tr></thead>
              <tbody>
                {aBills.map((b) => (
                  <tr key={b.tenant_id}><td>{b.tenant_name}</td><td>{b.floor}楼</td><td>{b.area}</td><td>{b.elevators}</td><td>{b.per_sqm_sum}</td><td className="cost">{b.total_cost.toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bill-group">
            <h3>B栋 - {yearMonth} 电梯电费</h3>
            <table className="table">
              <thead><tr><th>租户</th><th>楼层</th><th>面积(㎡)</th><th>使用电梯</th><th>单价合计(元/㎡)</th><th>公摊电费(元)</th></tr></thead>
              <tbody>
                {bBills.map((b) => (
                  <tr key={b.tenant_id}><td>{b.tenant_name}</td><td>{b.floor}楼</td><td>{b.area}</td><td>{b.elevators}</td><td>{b.per_sqm_sum}</td><td className="cost">{b.total_cost.toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{textAlign:"right", marginTop:12, fontWeight:700, fontSize:15}}>合计公摊电费: {total.toFixed(2)} 元</div>
        </div>
      )}
      {bills && bills.length === 0 && !error && <div className="empty">暂无账单数据</div>}
      {!bills && !error && <div className="empty">点击"计算本月账单"生成数据</div>}
    </div>
  );
}