import React, { useState, useEffect } from "react";
import { api } from "../api";

function getCurrentYear() {
  return String(new Date().getFullYear());
}

export default function Summary() {
  var [year, setYear] = useState(getCurrentYear());
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");
  var [expandedMonth, setExpandedMonth] = useState(null);
  var [expandedBuilding, setExpandedBuilding] = useState(null);

  useEffect(() => { loadSummary(); }, [year]);

  async function loadSummary() {
    setLoading(true); setError(""); setData(null);
    try {
      var d = await api.getSummary(year);
      setData(d);
    } catch (e) {
      setError(e.message);
      setData(null);
    }
    setLoading(false);
  }


  function toggleExpand(m, building) {
    if (expandedMonth === m.year_month && expandedBuilding === building) {
      setExpandedMonth(null);
      setExpandedBuilding(null);
    } else {
      setExpandedMonth(m.year_month);
      setExpandedBuilding(building);
    }
  }

  function maxVal(months, key) {
    var max = 0;
    months.forEach(function(m) { if (m[key] > max) max = m[key]; });
    return max || 1;
  }

  function barChart(months, building, key, color) {
    var mx = maxVal(months, key);
    return months.map(function(m, i) {
      var pct = (m[key] / mx * 100).toFixed(0);
      var expanded = expandedMonth === m.year_month && expandedBuilding === building;
      var elev = building === "A" ? m.a_elevators : m.b_elevators;
      return React.createElement(React.Fragment, { key: i },
        React.createElement("div", {
          className: "bar-row",
          style: { display: "flex", alignItems: "center", gap: 8, marginBottom: expanded ? 0 : 4, cursor: "pointer", padding: "2px 0" },
          onClick: function() { toggleExpand(m, building); },
          title: "点击查看电梯详情"
        },
          React.createElement("span", { style: { width: 40, fontSize: 12, color: "#666", textAlign: "right" } }, m.month_label),
          React.createElement("div", { style: { flex: 1, height: 20, background: "#eee", borderRadius: 4, overflow: "hidden" } },
            React.createElement("div", { style: { width: pct + "%", height: "100%", background: color, borderRadius: 4, transition: "width 0.3s" } })
          ),
          React.createElement("span", { style: { width: 70, fontSize: 12, textAlign: "right", fontWeight: 600 } }, m[key].toFixed(0) + "元")
        ),
        expanded && React.createElement("div", { style: { marginLeft: 48, marginBottom: 8, padding: 8, background: "#f8f9fa", borderRadius: 6, fontSize: 12 } },
          Object.keys(elev).sort().map(function(el) {
            return React.createElement("div", { key: el, style: { display: "flex", gap: 12, padding: "2px 0" } },
              React.createElement("span", { style: { width: 30, fontWeight: 600 } }, el),
              React.createElement("span", null, elev[el].toFixed(2) + "元")
            );
          })
        )
      );
    });
  }

  return React.createElement("div", { className: "page" },
    React.createElement("h2", null, "年度汇总"),
    React.createElement("div", { className: "card" },
      React.createElement("div", { className: "form-row" },
        React.createElement("label", null, "年份",
          React.createElement("input", { type: "number", value: year, min: "2026", max: "2030",
            onChange: function(e) { setYear(e.target.value); } })
        ),
        React.createElement("button", { className: "btn-primary", onClick: loadSummary, disabled: loading },
          loading ? "加载中..." : "查询"
        )
      )
    ),

    error && React.createElement("div", { className: "error-msg" }, error),

    data && data.months && data.months.length > 0 && React.createElement(React.Fragment, null,

      // 年度合计概要
      React.createElement("div", { className: "card", style: { background: "#1a1a2e", color: "#fff" } },
        React.createElement("div", { style: { display: "flex", gap: 32, justifyContent: "space-around", textAlign: "center" } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 12, color: "#8899aa" } }, "A栋年度电费"),
            React.createElement("div", { style: { fontSize: 28, fontWeight: 700, marginTop: 4, color: "#4fc3f7" } }, data.total.a.toLocaleString() + "元")
          ),
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 12, color: "#8899aa" } }, "B栋年度电费"),
            React.createElement("div", { style: { fontSize: 28, fontWeight: 700, marginTop: 4, color: "#81c784" } }, data.total.b.toLocaleString() + "元")
          ),
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 12, color: "#8899aa" } }, "年度合计"),
            React.createElement("div", { style: { fontSize: 28, fontWeight: 700, marginTop: 4, color: "#fff" } }, data.total.all.toLocaleString() + "元")
          )
        )
      ),

      // 柱状图
      React.createElement("div", { className: "card" },
        React.createElement("h3", null, "月度电费趋势"),
        React.createElement("div", { style: { display: "flex", gap: 40 } },
          React.createElement("div", { style: { flex: 1 } },
            React.createElement("div", { style: { fontSize: 13, color: "#4fc3f7", fontWeight: 600, marginBottom: 8 } }, "A栋"),
            barChart(data.months, "A", "a_total", "#4fc3f7")
          ),
          React.createElement("div", { style: { flex: 1 } },
            React.createElement("div", { style: { fontSize: 13, color: "#81c784", fontWeight: 600, marginBottom: 8 } }, "B栋"),
            barChart(data.months, "B", "b_total", "#81c784")
          )
        )
      ),

      // 明细表格
      React.createElement("div", { className: "card" },
        React.createElement("h3", null, "月度明细"),
        React.createElement("table", { className: "table" },
          React.createElement("thead", null,
            React.createElement("tr", null,
              React.createElement("th", null, "月份"),
              React.createElement("th", null, "A栋电费"),
              React.createElement("th", null, "B栋电费"),
              React.createElement("th", null, "合计"),
              React.createElement("th", null, "操作")
            )
          ),
          React.createElement("tbody", null,
            data.months.map(function(m, i) {
              return React.createElement("tr", { key: i },
                React.createElement("td", { style: { fontWeight: 600 } }, m.year_month),
                React.createElement("td", null, m.a_total.toFixed(2)),
                React.createElement("td", null, m.b_total.toFixed(2)),
                React.createElement("td", { className: "cost" }, m.total.toFixed(2)),
                React.createElement("td", null,
                  React.createElement("a", { href: "/bills?ym=" + m.year_month, className: "btn-sm btn-primary",
                    style: { textDecoration: "none", display: "inline-block", padding: "2px 8px" } }, "查看")
                )
              );
            })
          )
        )
      )
    ),

    data && (!data.months || data.months.length === 0) && !error &&
      React.createElement("div", { className: "empty" }, "该年份暂无账单数据")
  );
}
