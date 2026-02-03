
import React, { useState, useMemo } from 'react';
import { Item, Order, InventoryMonthData, OrderStatus, ItemMonthlyConfig } from '../types';

interface InventoryTableProps {
  items: Item[];
  itemConfigs: ItemMonthlyConfig[];
  selectedMonths: number[];
  setSelectedMonths: (m: number[]) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  orders: Order[];
  stockChain: Record<string, Record<number, { initial: number, final: number, consumed: number }>>;
  inventoryEntries: InventoryMonthData[];
  onUpdateEntry: (itemId: string, month: number, weeks: [number | null, number | null, number | null, number | null], manualInitial?: number | null) => void;
  allMonthlyDates: Record<string, string[]>;
  onUpdateMonthlyDate: (month: number, weekIdx: number, date: string) => void;
  onReorderItems: (items: Item[]) => void;
  readOnly?: boolean;
}

const MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

const InventoryTable: React.FC<InventoryTableProps> = ({ 
  items, itemConfigs, selectedMonths, setSelectedMonths, selectedYear, setSelectedYear, orders, stockChain, inventoryEntries, onUpdateEntry, allMonthlyDates, onUpdateMonthlyDate, onReorderItems, readOnly 
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [canDrag, setCanDrag] = useState(false);
  const sortedSelectedMonths = useMemo(() => [...selectedMonths].sort((a, b) => a - b), [selectedMonths]);
  const currentActualYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentActualYear - 5 + i);

  const toggleMonth = (monthIdx: number) => {
    if (selectedMonths.includes(monthIdx)) { if (selectedMonths.length > 1) setSelectedMonths(selectedMonths.filter(m => m !== monthIdx)); }
    else setSelectedMonths([...selectedMonths, monthIdx]);
  };

  const getMonthBounds = (mIdx: number, yr: number) => {
    const f = new Date(yr, mIdx, 1); const l = new Date(yr, mIdx + 1, 0);
    const fmt = (d: Date) => `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    return { min: fmt(f), max: fmt(l) };
  };

  const getItemConfig = (itemId: string, month: number) => itemConfigs.find(c => c.itemId === itemId && c.monthIndex === month) || { itemId, monthIndex: month, averageCost: 0, minStock: 0 };

  const getReceivedForInterval = (itemId: string, month: number, weekIdx: number) => {
    const dates = allMonthlyDates[`${month}-${selectedYear}`] || ['', '', '', ''];
    const end = dates[weekIdx]; if (!end) return 0;
    const start = weekIdx > 0 ? dates[weekIdx-1] : '';
    let tot = 0;
    orders.forEach(o => {
      if (o.status !== OrderStatus.RECEIVED) return;
      o.items.forEach(oi => {
        if (oi.itemId === itemId && oi.actualDate) {
          const arr = oi.actualDate; const arrD = new Date(arr + 'T12:00:00');
          if (arrD.getMonth() === month && arrD.getFullYear() === selectedYear) {
            if (weekIdx === 0 ? arr <= end : start && arr > start && arr <= end) tot += oi.quantity;
          }
        }
      });
    });
    return tot;
  };

  const getEntryForMonth = (itemId: string, month: number) => inventoryEntries.find(e => e.itemId === itemId && e.monthIndex === month && (e as any).year === selectedYear) || { weeks: [null, null, null, null], manualInitialStock: undefined };

  const handleDragStart = (e: React.DragEvent, index: number) => { if (!canDrag || readOnly) { e.preventDefault(); return; } setDraggedIndex(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDrop = (e: React.DragEvent, index: number) => { e.preventDefault(); if (draggedIndex === null || draggedIndex === index || readOnly) return; const next = [...items]; const item = next[draggedIndex]; next.splice(draggedIndex, 1); next.splice(index, 0, item); onReorderItems(next); setDraggedIndex(null); setDragOverIndex(null); setCanDrag(false); };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-100 flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-bold text-emerald-900">Estoque Mensal ({selectedYear})</h3>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-2 outline-none font-bold">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => {}} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md">Exportar Dados</button>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {MONTHS.map((m, i) => (
            <button key={m} onClick={() => toggleMonth(i)} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all border uppercase ${selectedMonths.includes(i) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}>{m}</button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <table className="text-[11px] text-left border-collapse table-fixed min-w-full" style={{ width: `${190 + (sortedSelectedMonths.length * 610)}px` }}>
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
            <tr>
              <th rowSpan={3} className="px-4 py-4 w-[190px] sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200 text-center">Item</th>
              {sortedSelectedMonths.map(m => <th key={m} colSpan={7} className="px-2 py-2 text-center bg-emerald-50/50 border-x border-gray-200 text-emerald-700 font-black border-b border-emerald-100 w-[610px]">{MONTHS[m]}</th>)}
            </tr>
            <tr className="border-b border-gray-100">
              {sortedSelectedMonths.map(m => (
                <React.Fragment key={m}>
                  <th className="px-2 py-4 w-[80px] text-center text-gray-400 border-r border-gray-100">Início</th>
                  <th className="px-2 py-1.5 text-center bg-blue-50/30 border-r border-gray-100 w-[85px]">S1</th>
                  <th className="px-2 py-1.5 text-center bg-blue-50/30 border-r border-gray-100 w-[85px]">S2</th>
                  <th className="px-2 py-1.5 text-center bg-purple-50/30 border-r border-gray-100 w-[85px]">S3</th>
                  <th className="px-2 py-1.5 text-center bg-purple-50/30 border-r border-gray-100 w-[85px]">S4</th>
                  <th className="px-2 py-4 w-[90px] text-center text-orange-600 bg-orange-50/30 border-r border-gray-100">Consumo</th>
                  <th className="px-4 py-4 w-[100px] bg-emerald-50 text-emerald-700 text-center">Saldo</th>
                </React.Fragment>
              ))}
            </tr>
            <tr className="bg-white">
              {sortedSelectedMonths.map(m => {
                const dates = allMonthlyDates[`${m}-${selectedYear}`] || ['', '', '', ''];
                const b = getMonthBounds(m, selectedYear);
                return (
                  <React.Fragment key={m}>
                    <th className="px-1 py-1.5 border-r border-gray-100"></th>
                    {[0, 1, 2, 3].map(i => (
                      <th key={i} className="px-1 py-1.5 text-center border-r border-gray-100">
                        <input type="date" value={dates[i]} min={b.min} max={b.max} disabled={readOnly} onChange={(e) => onUpdateMonthlyDate(m, i, e.target.value)} className="text-[9px] w-full bg-emerald-50/30 border border-emerald-100 rounded px-1 disabled:opacity-50" />
                      </th>
                    ))}
                    <th className="px-1 py-1.5 border-r border-gray-100"></th><th className="px-1 py-1.5"></th>
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item, idx) => (
              <tr key={item.id} draggable={!readOnly} onDragStart={(e) => handleDragStart(e, idx)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, idx)} className={`hover:bg-gray-50/50 ${draggedIndex === idx ? 'opacity-30' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200">
                  <div className="flex items-center space-x-2">
                    {!readOnly && <div onMouseDown={() => setCanDrag(true)} onMouseUp={() => setCanDrag(false)} className="cursor-grab text-gray-300 hover:text-emerald-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor"/></svg></div>}
                    <div><div className="truncate font-bold uppercase">{item.name}</div><p className="text-[9px] text-gray-400 uppercase">{item.unit}</p></div>
                  </div>
                </td>
                {sortedSelectedMonths.map(m => {
                  const chain = stockChain[item.id]?.[m] || { initial: 0, final: 0, consumed: 0 };
                  const entry = getEntryForMonth(item.id, m);
                  return (
                    <React.Fragment key={m}>
                      <td className="px-2 py-3 text-center border-r border-gray-100">
                        {m === 0 ? <input type="number" value={entry.manualInitialStock ?? ''} disabled={readOnly} onChange={(e) => onUpdateEntry(item.id, m, entry.weeks as any, e.target.value === '' ? null : parseInt(e.target.value))} className="w-[70px] text-center bg-emerald-50 border border-emerald-100 rounded p-1" /> : chain.initial}
                      </td>
                      {[0, 1, 2, 3].map(w => {
                        const rec = getReceivedForInterval(item.id, m, w);
                        return <td key={w} className="px-1 py-3 border-r border-gray-50"><div className="flex flex-col items-center">{rec > 0 && <span className="text-[9px] font-bold text-emerald-600">+{rec}</span>}<input type="number" value={entry.weeks[w] ?? ''} disabled={readOnly} onChange={(e) => { const nWeeks = [...entry.weeks]; nWeeks[w] = e.target.value === '' ? null : parseInt(e.target.value); onUpdateEntry(item.id, m, nWeeks as any); }} className="w-[75px] text-center border rounded p-1" /></div></td>;
                      })}
                      <td className="px-2 py-3 font-bold text-center text-orange-600">{chain.consumed}</td>
                      <td className={`px-4 py-3 font-bold text-center ${chain.final < (getItemConfig(item.id, m).minStock) ? 'text-red-500 bg-red-50' : 'text-emerald-700 bg-emerald-50'}`}>{chain.final}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;
