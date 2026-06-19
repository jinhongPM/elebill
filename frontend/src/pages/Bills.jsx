'use strict';
import React, { useState } from 'react';
import { api } from '../api';

function getMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export default function Bills() {
  var [yearMonth, setYearMonth] = useState(getMonth());
  var [result, setResult] = useState(null);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');

  async function loadResult(data) {
    if (!data || !data.tenants || data.tenants.length === 0) {
      setError('暂无账单数据'); setLoading(false); return;
    }
    setResult(data); setLoading(false);
  }

  async function handleView() {
    setLoading(true); setError(''); setResult(null);
    try {
      var data = await api.getBillsResult(yearMonth);
      if (data) { loadResult(data); return; }
      setError('该月份暂无账单数据，请先点击「计算本月账单」');
      setLoading(false);
    } catch (err) { setError(err.message); setLoading(false); }
  }

  async function handleCompute() {
    try {
      var existing = await api.getBills(yearMonth);
      if (existing && existing.length > 0) {
        if (!confirm('该月份已有账单数据，覆盖重新计算？\n（新增租户不影响历史账单，除非刻意重算）')) return;
      }
    } catch (e) {}
    setLoading(true); setError(''); setResult(null);
    try { var data = await api.computeBills(yearMonth); loadResult(data); }
    catch (err) { setError(err.message); setLoading(false); }
  }

  function excelRow(cells, bold) {
    var style = bold ? 'font-weight:bold;background:#1a1a2e;color:#fff;' : '';
    var border = 'border:1px solid #ccc;padding:6px 10px;';
    return '<tr>' + cells.map(function(c) { return '<td style="' + border + style + '">' + (c != null ? c : '') + '</td>'; }).join('') + '</tr>';
  }

  async function handleExport() {
    if (!result || !result.tenants || result.tenants.length === 0) return;

    var ym = yearMonth;
    var html = '<html><head><meta charset="utf-8"><title>电梯电费_' + ym + '</title></head><body>';
    html += '<h2 style="text-align:center">电梯电费公摊 - ' + ym + '</h2>';
    html += '<p>电费单价: ' + (result.unit_price || 0) + ' 元/kWh</p>';

    // A栋电梯详情
    if (result.a_elevators && Object.keys(result.a_elevators).length > 0) {
      html += '<h3>A栋电梯详情</h3><table style="border-collapse:collapse;width:100%;margin-bottom:20px">';
      html += excelRow(['电梯','上月读数','本月读数','用电量','电费(元)','总面积(㎡)','单价(元/㎡)'], true);
      var aEls = Object.values(result.a_elevators);
      aEls.forEach(function(e) { html += excelRow([e.elevator, e.prev_reading, e.current_reading, e.usage, e.cost.toFixed(2), e.total_area, e.per_sqm.toFixed(4)]); });
      var aTotal = aEls.reduce(function(s, e) { return s + e.cost; }, 0);
      html += excelRow(['小计', '', '', '', aTotal.toFixed(2), '', ''], true);
      html += '</table>';
    }

    // B栋电梯详情
    if (result.b_elevators && Object.keys(result.b_elevators).length > 0) {
      html += '<h3>B栋电梯详情</h3><table style="border-collapse:collapse;width:100%;margin-bottom:20px">';
      html += excelRow(['电梯','上月读数','本月读数','用电量','电费(元)','总面积(㎡)','单价(元/㎡)'], true);
      var bEls = Object.values(result.b_elevators);
      bEls.forEach(function(e) { html += excelRow([e.elevator, e.prev_reading, e.current_reading, e.usage, e.cost.toFixed(2), e.total_area, e.per_sqm.toFixed(4)]); });
      var bTotal = bEls.reduce(function(s, e) { return s + e.cost; }, 0);
      html += excelRow(['小计', '', '', '', bTotal.toFixed(2), '', ''], true);
      html += '</table>';
    }

    // A栋租户
    var aBills = result.tenants.filter(function(b) { return b.building === 'A'; });
    if (aBills.length > 0) {
      html += '<h3>A栋租户账单</h3><table style="border-collapse:collapse;width:100%;margin-bottom:20px">';
      html += excelRow(['租户','楼层','面积(㎡)','使用电梯','公摊电费(元)'], true);
      aBills.forEach(function(b) { html += excelRow([b.tenant_name, b.floor + '楼', b.area, b.elevators.split(',').map(function(e){return e.trim()}).sort().join(','), b.total_cost.toFixed(2)]); });
      var aSum = aBills.reduce(function(s, b) { return s + b.total_cost; }, 0);
      html += excelRow(['合计', '', '', '', aSum.toFixed(2)], true);
      html += '</table>';
    }

    // B栋租户
    var bBills = result.tenants.filter(function(b) { return b.building === 'B'; });
    if (bBills.length > 0) {
      html += '<h3>B栋租户账单</h3><table style="border-collapse:collapse;width:100%;margin-bottom:20px">';
      html += excelRow(['租户','楼层','面积(㎡)','使用电梯','公摊电费(元)'], true);
      bBills.forEach(function(b) { html += excelRow([b.tenant_name, b.floor + '楼', b.area, b.elevators.split(',').map(function(e){return e.trim()}).sort().join(','), b.total_cost.toFixed(2)]); });
      var bSum = bBills.reduce(function(s, b) { return s + b.total_cost; }, 0);
      html += excelRow(['合计', '', '', '', bSum.toFixed(2)], true);
      html += '</table>';
    }

    var grandTotal = result.tenants.reduce(function(s, b) { return s + b.total_cost; }, 0);
    html += '<p style="font-size:16px;font-weight:bold;text-align:right">总计: ' + grandTotal.toFixed(2) + ' 元</p>';
    html += '</body></html>';

    var blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '电梯电费_' + ym + '.xls';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() { window.print(); }

  function table(headers, rows, foot) {
    return React.createElement('table', { className: 'table' },
      React.createElement('thead', null, React.createElement('tr', null, headers.map(function(h) { return React.createElement('th', { key: h }, h); }))),
      React.createElement('tbody', null,
        rows.map(function(r, i) { return React.createElement('tr', { key: i }, r.map(function(c, j) { return React.createElement('td', { key: j, className: j === r.length-1 ? 'cost' : '' }, c); })); }),
        foot ? React.createElement('tr', { className: 'total-row', key: 't' }, foot.map(function(c, j) { return React.createElement('td', { key: j, className: j === foot.length-1 ? 'cost' : '' }, c); })) : null
      )
    );
  }

  function elevTable(elevs) {
    var items = Object.values(elevs);
    if (items.length === 0) return null;
    var totalCost = items.reduce(function(s, e) { return s + e.cost; }, 0);
    return table(
      ['电梯','上月读数','本月读数','用电量','电费(元)','总面积(㎡)','单价(元/㎡)'],
      items.map(function(e) { return [e.elevator, e.prev_reading, e.current_reading, e.usage, e.cost.toFixed(2), e.total_area, e.per_sqm.toFixed(4)]; }),
      ['小计', '', '', '', totalCost.toFixed(2), '', '']
    );
  }

  function tenantTable(list) {
    var sum = list.reduce(function(s, b) { return s + b.total_cost; }, 0);
    return table(
      ['租户','楼层','面积(㎡)','使用电梯','公摊电费(元)'],
      list.map(function(b) { return [b.tenant_name, b.floor + '楼', b.area, b.elevators.split(',').map(function(e){return e.trim()}).sort().join(','), b.total_cost.toFixed(2)]; }),
      ['合计', '', '', '', sum.toFixed(2)]
    );
  }

  var aBills = result ? result.tenants.filter(function(b) { return b.building === 'A'; }) : [];
  var bBills = result ? result.tenants.filter(function(b) { return b.building === 'B'; }) : [];

  return (
    React.createElement('div', { className: 'page' },
      React.createElement('h2', null, '账单查看'),
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'form-row' },
          React.createElement('label', null, '月份', React.createElement('input', { type: 'month', value: yearMonth, onChange: function(e) { setYearMonth(e.target.value); } })),
          React.createElement('button', { className: 'btn-primary', onClick: handleView }, '查看账单'),
          React.createElement('button', { className: 'btn-primary', onClick: handleCompute, disabled: loading }, loading ? '计算中...' : '计算本月账单'),
          result && result.tenants && result.tenants.length > 0 && React.createElement(React.Fragment, null,
            React.createElement('button', { className: 'btn-secondary', onClick: handleExport }, '导出 Excel'),
            React.createElement('button', { className: 'btn-secondary', onClick: handlePrint }, '打印')
          )
        ),
        error && React.createElement('div', { className: 'error-msg' }, error),
        React.createElement('div', { style: { fontSize: 12, color: '#999', marginTop: 4 } }, '提示：账单计算后固定不变，新增租户不影响历史账单')
      ),

      result && result.tenants && result.tenants.length > 0 && React.createElement('div', { className: 'bills-section' },
        result.a_elevators && Object.keys(result.a_elevators).length > 0 && React.createElement('div', { className: 'bill-group' },
          React.createElement('h3', null, 'A栋电梯详情'),
          elevTable(result.a_elevators)
        ),
        result.b_elevators && Object.keys(result.b_elevators).length > 0 && React.createElement('div', { className: 'bill-group' },
          React.createElement('h3', null, 'B栋电梯详情'),
          elevTable(result.b_elevators)
        ),
        aBills.length > 0 && React.createElement('div', { className: 'bill-group' },
          React.createElement('h3', null, 'A栋租户账单 - ' + yearMonth),
          tenantTable(aBills)
        ),
        bBills.length > 0 && React.createElement('div', { className: 'bill-group' },
          React.createElement('h3', null, 'B栋租户账单 - ' + yearMonth),
          tenantTable(bBills)
        )
      ),
      !result && !error && React.createElement('div', { className: 'empty' }, '点击「查看账单」查看历史，或「计算本月账单」生成新数据')
    )
  );
}