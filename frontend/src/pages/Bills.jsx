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

  async function handleView() {
    setLoading(true); setError(''); setResult(null);
    try {
      var data = await api.getBills(yearMonth);
      if (!data || data.length === 0) {
        setError('该月份暂无账单数据，请先点击「计算本月账单」');
        setLoading(false); return;
      }
      var tenants = data.map(function(b) {
        return { tenant_id: b.tenant_id, tenant_name: b.tenant_name, building: b.building, floor: b.floor, area: b.area, elevators: b.elevators, total_cost: b.total_cost };
      });
      setResult({ year_month: yearMonth, unit_price: 0, a_elevators: [], b_elevators: [], tenants: tenants });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleCompute() {
    try {
      var existing = await api.getBills(yearMonth);
      if (existing && existing.length > 0) {
        if (!confirm('该月份已有账单数据，覆盖重新计算？\n（新增租户后不影响历史账单，除非你刻意重新计算）')) {
          return;
        }
      }
    } catch (e) {}

    setLoading(true); setError(''); setResult(null);
    try {
      var data = await api.computeBills(yearMonth);
      setResult(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
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

  function renderElevatorTable(list) {
    if (!list || Object.keys(list).length === 0) return null;
    var items = Object.values(list);
    return React.createElement('div', { style: { marginBottom: 16 } },
      React.createElement('table', { className: 'table', style: { fontSize: 13 } },
        React.createElement('thead', null,
          React.createElement('tr', null,
            ['电梯','上月读数','本月读数','用电量(kWh)','电费(元)','使用总面积(㎡)','单价(元/㎡)'].map(function(h) {
              return React.createElement('th', { key: h }, h);
            })
          )
        ),
        React.createElement('tbody', null,
          items.map(function(e) {
            return React.createElement('tr', { key: e.elevator },
              React.createElement('td', null, e.elevator),
              React.createElement('td', null, e.prev_reading),
              React.createElement('td', null, e.current_reading),
              React.createElement('td', null, e.usage),
              React.createElement('td', null, e.cost.toFixed(2)),
              React.createElement('td', null, e.total_area),
              React.createElement('td', null, e.per_sqm.toFixed(4))
            );
          })
        )
      )
    );
  }

  function renderTenantTable(list) {
    if (!list || list.length === 0) return null;
    var sum = list.reduce(function(s, b) { return s + b.total_cost; }, 0);
    return React.createElement('table', { className: 'table' },
      React.createElement('thead', null,
        React.createElement('tr', null,
          ['租户','楼层','面积(㎡)','使用电梯','公摊电费(元)'].map(function(h) {
            return React.createElement('th', { key: h }, h);
          })
        )
      ),
      React.createElement('tbody', null,
        list.map(function(b) {
          return React.createElement('tr', { key: b.tenant_id },
            React.createElement('td', null, b.tenant_name),
            React.createElement('td', null, b.floor + '楼'),
            React.createElement('td', null, b.area),
            React.createElement('td', null, b.elevators),
            React.createElement('td', { className: 'cost' }, b.total_cost.toFixed(2))
          );
        }),
        React.createElement('tr', { className: 'total-row', key: 'total' },
          React.createElement('td', { colSpan: 4 }, '合计'),
          React.createElement('td', { className: 'cost' }, sum.toFixed(2))
        )
      )
    );
  }

  var aBills = result ? result.tenants.filter(function(b) { return b.building === 'A'; }) : [];
  var bBills = result ? result.tenants.filter(function(b) { return b.building === 'B'; }) : [];
  var aElevs = result ? result.a_elevators : null;
  var bElevs = result ? result.b_elevators : null;

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
        aElevs && Object.keys(aElevs).length > 0 && React.createElement('div', { className: 'bill-group' },
          React.createElement('h3', null, 'A栋电梯详情'),
          renderElevatorTable(aElevs)
        ),
        bElevs && Object.keys(bElevs).length > 0 && React.createElement('div', { className: 'bill-group' },
          React.createElement('h3', null, 'B栋电梯详情'),
          renderElevatorTable(bElevs)
        ),
        aBills.length > 0 && React.createElement('div', { className: 'bill-group' },
          React.createElement('h3', null, 'A栋租户账单 - ' + yearMonth),
          renderTenantTable(aBills)
        ),
        bBills.length > 0 && React.createElement('div', { className: 'bill-group' },
          React.createElement('h3', null, 'B栋租户账单 - ' + yearMonth),
          renderTenantTable(bBills)
        )
      ),
      !result && !error && React.createElement('div', { className: 'empty' }, '点击「查看账单」查看已存账单，或「计算本月账单」生成新数据')
    )
  );
}