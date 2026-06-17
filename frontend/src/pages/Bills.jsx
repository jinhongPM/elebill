import React, { useState } from "react";
import { api } from "../api";

function getCurrentMonth() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

export default function Bills() {
  const [yearMonth, setYearMonth] = useState(getCurrentMonth());
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasStored, setHasStored] = useState(false);

  async function handleCompute() {
    // 先检查是否已有账单
    try {
      const existing = await api.getBills(yearMonth);
      if (existing && existing.length > 0) {
        if (!confirm("该月份已有账单数据，覆盖重新计算？\n（新增租户后不影响历史账单，除非你刻意重新计算）")) {
          return;
        }
      }
    } catch (e) {}

    setLoading(true); setError(""); setResult(null);
    try { const data = await api.computeBills(yearMonth); setResult(data); setHasStored(true); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleView() {
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await api.getBills(yearMonth);
      if (!data || data.length === 0) {
        setError("该月份暂无账单数据，请先点击「计算本月账单」");
        setResult(null);
        return;
      }
      // 从 stored bills 构建展示数据
      const tenants = data.map((b) => ({
        tenant_id: b.tenant_id,
        tenant_name: b.tenant_name,
        building: b.building,
        floor: b.floor,
        area: b.area,
        elevators: b.elevators,
        total_cost: b.total_cost,
        per_sqm_sum: 0,
        details: []
      }));
      setResult({ year_month, unit_price: 0, a_elevators: {}, b_elevators: {}, tenants });
      setHasStored(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleExport() {
    if (!result || !result.tenants || result.tenants.length === 0) return;
    const XLSX = await import("xlsx");
    const tenantRows = result.tenants.map((b) => ({
      "租户": b.tenant_name, "楼栋": b.building + "栋", "楼层": b.floor + "楼",
      "面积(㎡)": b.area, "使用电梯": b.elevators, "公摊电费(元)": b.total_cost
    }));
    const wb = XLSX.utils.book_new();
    let ws = XLSX.utils.json_to_sheet(tenantRows);
    XLSX.utils.book_append_sheet(wb, ws, "租户账单");
    XLSX.writeFile(wb, "电梯电费_" + yearMonth + ".xlsx");
  }

  function handlePrint() { window.print(); }

  function renderElevatorTable(elevators, title) {
    const list = Object.values(elevators);
    if (list.length === 0) return null;
    return (
      <div style={{marginBottom:16}}>
        <h4 style={{marginBottom:8, fontSize:14, color:"#555"}}>{title}</h4>
        <table className="table" style={{fontSize:13}}>
          <thead>
            <tr><th>电梯</th><th>上月读数</th><th>本月读数</th><th>用电量(kWh)</th><th>电费(元)</th><th>使用总面积(㎡)</th><th>单价(元/㎡)</th></tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.elevator}>
                <td><strong>{e.elevator}</strong></td>
                <td>{e.prev_reading}</td><td>{e.current_reading}</td><td>{e.usage}</td>
                <td>{e.cost.toFixed(2)}</td><td>{e.total_area}</td><td>{e.per_sqm.toFixed(4)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan="4">小计</td>
              <td>{list.reduce((s, e) => s + e.cost, 0).toFixed(2)}</td>
              <td colSpan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  function renderTenantTable(list) {
    if (!list || list.length === 0) return null;
    const sum = list.reduce((s, b) => s + b.total_cost, 0);
    return (
      <table className="table">
        <thead><tr><th>租户</th><th>楼层</th><th>面积(㎡)</th><th>使用电梯</th><th>公摊电费(元)</th></tr></thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.tenant_id}>
              <td>{b.tenant_name}</td><td>{b.floor}楼</td><td>{b.area}</td>
              <td>{b.elevators}</td><td className="cost">{b.total_cost.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="total-row"><td colSpan="4">合计</td><td className="cost">{sum.toFixed(2)}</td></tr>
        </tbody>
      </table>
    );
  }

  const aBills = result ? result.tenants.filter((b) => b.building === "A") : [];
  const bBills = result ? result.tenants.filter((b) => b.building === "B") : [];

  return (
    <div className="page">
      <h2>账单查看</h2>
      <div className="card">
        <div className="form-row">
          <label>月份<input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} /></label>
          <button className="btn-primary" onClick={handleView}>查看账单</button>
          <button className="btn-primary" onClick={handleCompute} disabled={loading}>
            {loading ? "计算中..." : "计算本月账单"}
          </button>
          {result && result.tenants && result.tenants.length > 0 && (
            <>
              <button className="btn-secondary" onClick={handleExport}>导出 Excel</button>
              <button className="btn-secondary" onClick={handlePrint}>打印</button>
            </>
          )}
        </div>
        {error && <div className="error-msg">{error}</div>}
        <div style={{fontSize:12, color:"#999", marginTop:4}}>
          提示：账单计算后数据固定不变，新增租户不影响历史账单
        </div>
      </div>

      {result && result.tenants && result.tenants.length > 0 && (
        <div className="bills-section">
          {result.a_elevators && Object.keys(result.a_elevators).length > 0 && (
            <div className="bill-group">
              <h3>A栋电梯详情</h3>
              {renderElevatorTable(result.a_elevators, "A栋")}
            </div>
          )}
          {result.b_elevators && Object.keys(result.b_elevators).length > 0 && (
            <div className="bill-group">
              <h3>B栋电梯详情</h3>
              {renderElevatorTable(result.b_elevators, "B栋")}
            </div>
          )}
          <div className="bill-group">
            {aBills.length > 0 && <><h3>A栋租户账单 - {yearMonth}</h3>{renderTenantTable(aBills)}</>}
          </div>
          <div className="bill-group">
            {bBills.length > 0 && <><h3>B栋租户账单 - {yearMonth}</h3>{renderTenantTable(bBills)}</>}
          </div>
        </div>
      )}
      {!result && !error && <div className="empty">点击「查看账单」查看已存账单，或「计算本月账单」生成新数据</div>}
    </div>
  );
}