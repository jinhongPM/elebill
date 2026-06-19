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

  async function handleExport() {
    if (!result || !result.tenants || result.tenants.length === 0) return;
    var XLSX = await import('xlsx');
    var rows = result.tenants.map(function(b) {
      return { '租户': b.tenant_name, '楼栋': b.building + '栋', '楼层': b.floor + '楼', '面积(㎡)': b.area, '使用电梯': b.elevators, '公摊电费(元)': b.total_cost };
    });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), yearMonth + '账单');
    XLSX.writeFile(wb, '电梯电费_' + yearMonth + '.xlsx');
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