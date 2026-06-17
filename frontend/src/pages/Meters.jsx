import React, { useState, useEffect } from "react";
import { api } from "../api";

const ELEVATORS = ["A1", "A2", "A3", "B1", "B2", "B3"];

function getCurrentMonth() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function getPrevMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? (y - 1) + "-12" : y + "-" + String(m - 1).padStart(2, "0");
}

export default function Meters() {
  const [yearMonth, setYearMonth] = useState(getCurrentMonth());
  const [readings, setReadings] = useState({});
  const [prevReadings, setPrevReadings] = useState({});
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadReadings(); }, [yearMonth]);

  async function loadReadings() {
    // 加载本月读数
    try {
      const data = await api.getReadings(yearMonth);
      const map = {};
      for (const r of data) map[r.elevator] = r.reading;
      setReadings(map);
    } catch (e) { setReadings({}); }

    // 加载上月读数（用于对比）
    try {
      const prev = getPrevMonth(yearMonth);
      const data = await api.getReadings(prev);
      const map = {};
      for (const r of data) map[r.elevator] = r.reading;
      setPrevReadings(map);
    } catch (e) { setPrevReadings({}); }
  }

  function handleChange(el, value) {
    setReadings((prev) => ({ ...prev, [el]: value === "" ? "" : Number(value) }));
  }

  async function handleSave() {
    // 检查是否本月读数小于上月读数
    const warnings = [];
    for (const el of ELEVATORS) {
      const cur = readings[el];
      const prev = prevReadings[el];
      if (cur !== undefined && cur !== "" && prev !== undefined && Number(cur) < Number(prev)) {
        warnings.push(el + "(" + prev + "→" + cur + ")");
      }
    }

    if (warnings.length > 0) {
      const msg = "以下电梯读数比上月小，请核对：\n" + warnings.join("\n") + "\n\n按确定继续保存，按取消返回修改。";
      if (!confirm(msg)) return;
    }

    setLoading(true);
    setSaved(null);
    try {
      const payload = {};
      for (const el of ELEVATORS) {
        if (readings[el] !== undefined && readings[el] !== "") payload[el] = Number(readings[el]);
      }
      await api.saveReadings(yearMonth, payload);
      setSaved("已保存");
    } catch (err) {
      alert("保存失败: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h2>电表录入</h2>
      <div className="card">
        <div className="form-row">
          <label>月份<input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} /></label>
        </div>
      </div>
      <div className="meter-grid">
        <div className="meter-group">
          <h3>A栋</h3>
          {["A1", "A2", "A3"].map((el) => (
            <label key={el} className="meter-input">
              <span>{el}</span>
              <input type="number" step="0.1" placeholder="电表读数"
                value={readings[el] ?? ""}
                onChange={(e) => handleChange(el, e.target.value)} />
              {prevReadings[el] !== undefined && (
                <span style={{fontSize:11, color:"#999", whiteSpace:"nowrap"}}>
                  上月: {prevReadings[el]}
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="meter-group">
          <h3>B栋</h3>
          {["B1", "B2", "B3"].map((el) => (
            <label key={el} className="meter-input">
              <span>{el}</span>
              <input type="number" step="0.1" placeholder="电表读数"
                value={readings[el] ?? ""}
                onChange={(e) => handleChange(el, e.target.value)} />
              {prevReadings[el] !== undefined && (
                <span style={{fontSize:11, color:"#999", whiteSpace:"nowrap"}}>
                  上月: {prevReadings[el]}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>
      <div className="toolbar">
        <button className="btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? "保存中..." : "保存读数"}
        </button>
        {saved && <span className="success">{saved}</span>}
      </div>
    </div>
  );
}