import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function Settings() {
  const [unitPrice, setUnitPrice] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then((data) => {
      const up = data.find((s) => s.key === "unit_price");
      if (up) setUnitPrice(up.value);
    });
  }, []);

  async function handleSave() {
    await api.updateSetting("unit_price", unitPrice);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="page">
      <h2>系统设置</h2>

      <div className="card">
        <div className="form-row">
          <label>
            电费单价 (元/kWh)
            <input type="number" step="0.01" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </label>
        </div>
        <div className="form-actions">
          <button className="btn-primary" onClick={handleSave}>保存</button>
          {saved && <span className="success">已保存</span>}
        </div>
      </div>
    </div>
  );
}
