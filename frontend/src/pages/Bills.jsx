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

  async function handleCompute() {
    setLoading(true); setError(""); setResult(null);
    try { const data = await api.computeBills(yearMonth); setResult(data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleExport() {
    if (!result || !result.tenants || result.tenants.length === 0) return;
    const XLSX = await import("xlsx");
    const allElevators = { ...result.a_elevators, ...result.b_elevators };
    const elevatorRows = Object.values(allElevators).map((e) => ({
      "电梯": e.elevator,
      "上月读数": e.prev_reading,
      "本月读数": e.current_reading,
      "用电量(kWh)": e.usage,
      "电费(元)": e.cost.toFixed(2),
      "使用总面积(㎡)": e.total_area,
      "单价(元/㎡)": e.per_sqm.toFixed(4)
    }));
    const tenantRows = result.tenants.map((b) => ({
      "租户": b.tenant_name, "楼栋": b.building + "栋", "楼层": b.floor + "楼",
      "面积(㎡)": b.area, "使用电梯": b.elevators,
      "电梯单价合计(元/㎡)": b.per_sqm_sum, "公摊电费(元)": b.total_cost
    }));

    const wb = XLSX.utils.book_new();
    let ws1 = XLSX.utils.json_to_sheet(elevatorRows);
    XLSX.utils.book_append_sheet(wb, ws1, "电梯明细");
    let ws2 = XLSX.utils.json_to_sheet(tenantRows);
    XLSX.utils.book_append_sheet(wb, ws2, "租户账单");
    XLSX.writeFile(wb, "电梯电费_" + yearMonth + ".xlsx");
  }

  function handlePrint() { window.print(); }

  function renderElevatorTable(elevators, title) {
    const list = Object.values(elevators);
    if (list.length === 0) return null;
    const totalCost = list.reduce((s, e) => s + e.cost, 0);
    return (
      <div style={{marginBottom:16}}>
        <h4 style={{marginBottom:8, fontSize:14, color:"#555"}}>{title}</h4>
        <table className="table" style={{fontSize:13}}>
          <thead>
            <tr>
              <th>电梯</th>
              <th>上月读数</th>
              <th>本月读数</th>
              <th>用电量(kWh)</th>
              <th>电费(元)</th>
              <th>使用总面积(㎡)</th>
              <th>单价(元/㎡)</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.elevator}>
                <td><strong>{e.elevator}</strong></td>
                <td>{e.prev_reading}</td>
                <td>{e.current_reading}</td>
                <td>{e.usage}</td>
                <td>{e.cost.toFixed(2)}</td>
                <td>{e.total_area}</td>
                <td>{e.per_sqm.toFixed(4)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan="4">小计</td>
              <td>{totalCost.toFixed(2)}</td>
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
        <thead>
          <tr><th>租户</th><th>楼层</th><th>面积(㎡)</th><th>使用电梯</th><th>单价合计(元/㎡)</th><th>公摊电费(元)</th></tr>
        </thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.tenant_id}>
              <td>{b.tenant_name}</td><td>{b.floor}楼</td><td>{b.area}</td>
              <td>{b.elevators}</td><td>{b.per_sqm_sum}</td>
              <td className="cost">{b.total_cost.toFixed(2)}</td>
            </tr>
          ))}
          <tr className="total-row"><td colSpan="5">合计</td><td className="cost">{sum.toFixed(2)}</td></tr>
        </tbody>
      </table>
    );
  }

  const aBills = result ? result.tenants.filter((b) => b.building === "A") : [];
  const bBills = result ? result.tenants.filter((b) => b.building === "B") : [];
  const grandTotal = aBills.reduce((s, b) => s + b.total_cost, 0) + bBills.reduce((s, b) => s + b.total_cost, 0);

  return (
    <div className="page">
      <h2>账单查看</h2>
      <div className="card">
        <div className="form-row">
          <label>月份<input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} /></label>
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
      </div>

      {result && result.tenants && result.tenants.length > 0 && (
        <div className="bills-section">
          <div style={{marginBottom:8, fontSize:13, color:"#666"}}>
            电费单价: {result.unit_price} 元/kWh
          </div>

          {/* A栋电梯明细 */}
          <div className="bill-group">
            <h3>A栋电梯详情</h3>
            {renderElevatorTable(result.a_elevators, "A栋电梯")}
            <h3>A栋租户账单 - {yearMonth}</h3>
            {renderTenantTable(aBills)}
          </div>

          {/* B栋电梯明细 */}
          <div className="bill-group">
            <h3>B栋电梯详情</h3>
            {renderElevatorTable(result.b_elevators, "B栋电梯")}
            <h3>B栋租户账单 - {yearMonth}</h3>
            {renderTenantTable(bBills)}
          </div>

          <div style={{textAlign:"right", marginTop:12, fontWeight:700, fontSize:16}}>
            合计公摊电费: {grandTotal.toFixed(2)} 元
          </div>
        </div>
      )}

      {result && result.tenants && result.tenants.length === 0 && !error &&
        <div className="empty">暂无账单数据</div>
      }
      {!result && !error &&
        <div className="empty">点击"计算本月账单"生成数据</div>
      }
    </div>
  );
}