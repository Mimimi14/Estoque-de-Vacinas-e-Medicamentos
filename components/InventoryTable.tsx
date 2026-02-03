
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
  onUpdateEntry: (
    itemId: string, 
    month: number, 
    weeks: [number | null, number | null, number | null, number | null],
    manualInitial?: number | null
  ) => void;
  allMonthlyDates: Record<string, string[]>;
  onUpdateMonthlyDate: (month: number, weekIdx: number, date: string) => void;
  onReorderItems: (items: Item[]) => void;
}

const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const InventoryTable: React.FC<InventoryTableProps> = ({ 
  items, 
  itemConfigs,
  selectedMonths, 
  setSelectedMonths, 
  selectedYear,
  setSelectedYear,
  orders, 
  stockChain, 
  inventoryEntries, 
  onUpdateEntry,
  allMonthlyDates,
  onUpdateMonthlyDate,
  onReorderItems
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [canDrag, setCanDrag] = useState(false);

  const currentActualYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentActualYear - 5 + i);

  const sortedSelectedMonths = useMemo(() => [...selectedMonths].sort((a, b) => a - b), [selectedMonths]);

  const toggleMonth = (monthIdx: number) => {
    if (selectedMonths.includes(monthIdx)) {
      if (selectedMonths.length > 1) {
        setSelectedMonths(selectedMonths.filter(m => m !== monthIdx));
      }
    } else {
      setSelectedMonths([...selectedMonths, monthIdx]);
    }
  };

  // Função para calcular os limites do calendário (Primeiro e Último dia do mês)
  const getMonthBounds = (monthIdx: number, year: number) => {
    const firstDay = new Date(year, monthIdx, 1);
    const lastDay = new Date(year, monthIdx + 1, 0);
    
    const formatDate = (date: Date) => {
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${y}-${m}-${d}`;
    };

    return {
      min: formatDate(firstDay),
      max: formatDate(lastDay)
    };
  };

  const getItemConfig = (itemId: string, month: number) => {
    return itemConfigs.find(c => c.itemId === itemId && c.monthIndex === month) || {
      itemId,
      monthIndex: month,
      averageCost: 0,
      minStock: 0
    };
  };

  const getReceivedForInterval = (itemId: string, month: number, weekIdx: number) => {
    const dateKey = `${month}-${selectedYear}`;
    const monthlyDates = allMonthlyDates[dateKey] || ['', '', '', ''];
    const endDateStr = monthlyDates[weekIdx];
    if (!endDateStr) return 0;
    const startDateStr = weekIdx > 0 ? monthlyDates[weekIdx - 1] : '';
    let totalReceived = 0;

    orders.forEach(order => {
      if (order.status !== OrderStatus.RECEIVED) return;
      order.items.forEach(orderItem => {
        if (orderItem.itemId === itemId && orderItem.actualDate) {
          const arrival = orderItem.actualDate;
          const arrivalDate = new Date(arrival + 'T12:00:00');
          if (arrivalDate.getMonth() !== month || arrivalDate.getFullYear() !== selectedYear) return;

          let isInInterval = false;
          if (weekIdx === 0) {
            isInInterval = arrival <= endDateStr;
          } else {
            isInInterval = startDateStr !== '' && arrival > startDateStr && arrival <= endDateStr;
          }
          if (isInInterval) totalReceived += orderItem.quantity;
        }
      });
    });
    return totalReceived;
  };

  const getEntryForMonth = (itemId: string, month: number) => {
    return inventoryEntries.find(e => e.itemId === itemId && e.monthIndex === month && (e as any).year === selectedYear) || {
      weeks: [null, null, null, null] as (number | null)[],
      manualInitialStock: undefined
    };
  };

  const handleWeekChange = (itemId: string, month: number, weekIdx: number, val: string) => {
    const numVal = val === '' ? null : Math.max(0, parseInt(val) || 0);
    const entry = getEntryForMonth(itemId, month);
    const newWeeks = [...entry.weeks] as [number | null, number | null, number | null, number | null];
    newWeeks[weekIdx] = numVal;
    onUpdateEntry(itemId, month, newWeeks);
  };

  const handleInitialStockChange = (itemId: string, month: number, val: string) => {
    const numVal = val === '' ? null : Math.max(0, parseInt(val) || 0);
    onUpdateEntry(itemId, month, getEntryForMonth(itemId, month).weeks as any, numVal);
  };

  const handleExportExcel = () => {
    const monthNames = sortedSelectedMonths.map(m => MONTHS[m]).join('_');
    const fileName = `Estoque_${monthNames}_${selectedYear}.xls`;
    
    const palette = {
      lightGreen: '#a8cf93', mediumGreen: '#6ec08d', darkGreen: '#3b8f63', receiptGreen: '#065535',
      red: '#ae1804', darkRed: '#760404', white: '#ffffff', black: '#000000', border: '#000000'
    };

    const totalCols = 4 + (sortedSelectedMonths.length * 10);
    
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"><style>
          table { border-collapse: collapse; font-family: Calibri, sans-serif; }
          td, th { border: 1px solid ${palette.border}; padding: 8px; font-size: 11px; text-align: center; vertical-align: middle; }
          .header-main { background-color: ${palette.darkGreen}; color: ${palette.white}; font-weight: bold; height: 45px; }
          .header-dados-item { background-color: ${palette.mediumGreen}; color: ${palette.white}; font-weight: bold; }
          .header-quinzena { background-color: ${palette.red}; color: ${palette.white}; font-weight: bold; }
          .header-dates { background-color: ${palette.lightGreen}; color: ${palette.black}; font-weight: bold; }
          .header-sub { background-color: ${palette.mediumGreen}; color: ${palette.white}; font-weight: bold; }
          .col-name { text-align: left; font-weight: bold; }
        </style></head>
      <body><table>
          <tr><th colspan="${totalCols}" class="header-main">CONTROLE DE ESTOQUE E SOLICITAÇÃO DE VACINAS E MEDICAMENTOS - ${selectedYear}</th></tr>
          <tr><th colspan="4" rowspan="3" class="header-dados-item">DADOS DO ITEM</th>
            ${sortedSelectedMonths.map(m => `<th colspan="10" style="background-color: ${palette.darkGreen}; color: ${palette.white}; font-weight: bold; font-size: 14px;">${MONTHS[m]}</th>`).join('')}
          </tr>
          <tr>${sortedSelectedMonths.map(m => `<th colspan="5" class="header-quinzena">${MONTHS[m]} 1ª QUINZENA</th><th colspan="5" class="header-quinzena">${MONTHS[m]} 2ª QUINZENA</th>`).join('')}</tr>
          <tr>${sortedSelectedMonths.map(m => {
              const dates = allMonthlyDates[`${m}-${selectedYear}`] || ['', '', '', ''];
              return `<th colspan="2" class="header-dates">${dates[0] || 'S1'}</th><th colspan="2" class="header-dates">${dates[1] || 'S2'}</th><th style="background-color: ${palette.darkRed}; color: ${palette.white}; font-weight: bold;">Total</th><th colspan="2" class="header-dates">${dates[2] || 'S3'}</th><th colspan="2" class="header-dates">${dates[3] || 'S4'}</th><th style="background-color: ${palette.darkRed}; color: ${palette.white}; font-weight: bold;">Total</th>`;
            }).join('')}</tr>
          <tr><th class="header-sub">NOME COMERCIAL</th><th class="header-sub">EMPRESA</th><th class="header-sub">DOSE</th><th class="header-sub">APRESENTAÇÃO</th>
            ${sortedSelectedMonths.map(() => `<th class="header-sub">Consumo</th><th class="header-sub">Estoque</th><th class="header-sub">Consumo</th><th class="header-sub">Estoque</th><th style="background-color: ${palette.darkRed}; color: ${palette.white}; font-weight: bold;">Consumo</th><th class="header-sub">Consumo</th><th class="header-sub">Estoque</th><th class="header-sub">Consumo</th><th class="header-sub">Estoque</th><th style="background-color: ${palette.darkRed}; color: ${palette.white}; font-weight: bold;">Consumo</th>`).join('')}
          </tr>
    `;

    items.forEach(item => {
      html += `<tr><td class="col-name">${item.name}</td><td>${item.manufacturer || '---'}</td><td>${item.dosage.toLocaleString()}</td><td>${item.unit}</td>`;
      sortedSelectedMonths.forEach(m => {
        const entry = getEntryForMonth(item.id, m);
        const chainData = stockChain[item.id]?.[m] || { initial: 0, final: 0, consumed: 0 };
        const initial = (m === 0 && entry.manualInitialStock !== undefined) ? entry.manualInitialStock : chainData.initial;
        const rec = [getReceivedForInterval(item.id, m, 0), getReceivedForInterval(item.id, m, 1), getReceivedForInterval(item.id, m, 2), getReceivedForInterval(item.id, m, 3)];
        const s = [entry.weeks[0] || 0, entry.weeks[1] || 0, entry.weeks[2] || 0, entry.weeks[3] || 0];
        const c1 = s[0] > 0 ? Math.max(0, (initial + rec[0]) - s[0]) : 0;
        const c2 = s[1] > 0 ? Math.max(0, (s[0] + rec[1]) - s[1]) : 0;
        const c3 = s[2] > 0 ? Math.max(0, (s[1] + rec[2]) - s[2]) : 0;
        const c4 = s[3] > 0 ? Math.max(0, (s[2] + rec[3]) - s[3]) : 0;
        const renderStock = (count: number, received: number) => received > 0 ? `<td style="background-color: ${palette.receiptGreen}; color: ${palette.white}; font-weight: bold;">${Math.max(0, count - received)} + ${received}</td>` : `<td>${count}</td>`;
        html += `<td>${c1}</td>${renderStock(s[0], rec[0])}<td>${c2}</td>${renderStock(s[1], rec[1])}<td style="background-color: ${palette.darkRed}; color: ${palette.white}; font-weight: bold;">${c1 + c2}</td><td>${c3}</td>${renderStock(s[2], rec[2])}<td>${c4}</td>${renderStock(s[3], rec[3])}<td style="background-color: ${palette.darkRed}; color: ${palette.white}; font-weight: bold;">${c3 + c4}</td>`;
      });
      html += `</tr>`;
    });

    html += `</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => { if (!canDrag) { e.preventDefault(); return; } setDraggedIndex(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); if (draggedIndex === index) return; setDragOverIndex(index); };
  const handleDrop = (e: React.DragEvent, index: number) => { e.preventDefault(); if (draggedIndex === null || draggedIndex === index) return; const newItems = [...items]; const draggedItem = newItems[draggedIndex]; newItems.splice(draggedIndex, 1); newItems.splice(index, 0, draggedItem); onReorderItems(newItems); setDraggedIndex(null); setDragOverIndex(null); setCanDrag(false); };
  const handleDragEnd = () => { setDraggedIndex(null); setDragOverIndex(null); setCanDrag(false); };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-gray-100 flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-bold text-emerald-900">Estoque Mensal ({selectedYear})</h3>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Ano:</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-2 outline-none font-bold"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-emerald-100 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>Exportar Dados</span>
          </button>
        </div>

        <div className="flex items-center space-x-4 pt-1">
           <div className="relative group flex-shrink-0">
              <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200 flex items-center justify-center cursor-help hover:bg-emerald-100 transition-colors shadow-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
              </div>
              
              <div className="absolute left-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-nowrap">
                 <div className="bg-emerald-900 text-white text-[9px] font-bold px-3 py-1.5 rounded-md shadow-xl border border-emerald-700 uppercase tracking-wider">
                    Clique nos meses para selecionar múltiplos períodos
                 </div>
                 <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-emerald-900 ml-2.5"></div>
              </div>
           </div>

           <div className="flex flex-wrap gap-1.5 items-center">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => toggleMonth(i)}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all border uppercase tracking-tighter ${
                    selectedMonths.includes(i)
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-100'
                      : 'bg-white border-gray-200 text-gray-400 hover:border-emerald-200 hover:text-emerald-600'
                  }`}
                >
                  {m}
                </button>
              ))}
           </div>
           
           <div className="ml-auto text-[9px] font-bold text-gray-300 uppercase">
             {selectedMonths.length} período(s) selecionado(s)
           </div>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <table className="text-[11px] text-left border-collapse table-fixed min-w-full" style={{ width: `${190 + (sortedSelectedMonths.length * 610)}px` }}>
          <thead className="text-[10px] uppercase bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
            <tr>
              <th rowSpan={3} className="px-4 py-4 w-[190px] sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200">Item / Medicamento</th>
              {sortedSelectedMonths.map(m => (
                <th key={m} colSpan={7} className="px-2 py-2 text-center bg-emerald-50/50 border-x border-gray-200 text-emerald-700 uppercase tracking-tighter font-black border-b border-emerald-100 w-[610px]">
                  {MONTHS[m]}
                </th>
              ))}
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
                const bounds = getMonthBounds(m, selectedYear); // Calcula min/max para este mês
                return (
                  <React.Fragment key={m}>
                    <th className="px-1 py-1.5 border-r border-gray-100"></th>
                    {[0, 1, 2, 3].map((idx) => (
                      <th key={idx} className="px-1 py-1.5 text-center border-r border-gray-100">
                        <div className="flex justify-center">
                          <input 
                            type="date"
                            value={dates[idx]}
                            min={bounds.min} // Calendário abre no mês correto
                            max={bounds.max} // Impede seleção fora do mês
                            onChange={(e) => onUpdateMonthlyDate(m, idx, e.target.value)}
                            className="text-[9px] w-full max-w-[80px] bg-emerald-50/30 border border-emerald-100 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-emerald-400 font-normal appearance-none"
                          />
                        </div>
                      </th>
                    ))}
                    <th className="px-1 py-1.5 border-r border-gray-100"></th>
                    <th className="px-1 py-1.5"></th>
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item, index) => (
              <tr 
                key={item.id} 
                draggable={canDrag}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`transition-all duration-200 relative ${
                  draggedIndex === index ? 'opacity-30 bg-gray-100 scale-[0.98]' : 'hover:bg-gray-50/50'
                } ${dragOverIndex === index ? 'border-t-4 border-emerald-500 shadow-[0_-4px_10px_-4px_rgba(16,185,129,0.3)]' : ''}`}
              >
                <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div 
                      onMouseDown={() => setCanDrag(true)}
                      onMouseUp={() => setCanDrag(false)}
                      className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded transition-all"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-bold uppercase" title={item.name}>{item.name}</div>
                      <p className="text-[9px] text-gray-400 font-normal uppercase">{item.unit}</p>
                    </div>
                  </div>
                </td>
                
                {sortedSelectedMonths.map(m => {
                  const chainData = stockChain[item.id]?.[m] || { initial: 0, final: 0, consumed: 0 };
                  const entry = getEntryForMonth(item.id, m);
                  const config = getItemConfig(item.id, m);

                  return (
                    <React.Fragment key={m}>
                      <td className="px-2 py-3 font-semibold text-gray-600 text-center border-r border-gray-100">
                        {(m === 0) ? (
                          <input 
                            type="number" 
                            value={entry.manualInitialStock ?? ''} 
                            onChange={(e) => handleInitialStockChange(item.id, m, e.target.value)}
                            placeholder="0"
                            className="w-[70px] text-center bg-emerald-50 border border-emerald-100 rounded p-1 text-[10px] outline-none"
                          />
                        ) : (
                          <span>{chainData.initial}</span>
                        )}
                      </td>
                      {[0, 1, 2, 3].map((weekIdx) => {
                        const received = getReceivedForInterval(item.id, m, weekIdx);
                        const userCount = entry.weeks[weekIdx];
                        return (
                          <td key={weekIdx} className={`px-1 py-3 ${weekIdx < 2 ? 'bg-blue-50/5' : 'bg-purple-50/5'} border-r border-gray-50`}>
                            <div className="flex flex-col items-center">
                              {received > 0 && <span className="text-[9px] font-bold text-emerald-600 mb-0.5">+{received}</span>}
                              <input 
                                type="number" 
                                value={userCount ?? ''} 
                                onChange={(e) => handleWeekChange(item.id, m, weekIdx, e.target.value)}
                                className="w-[75px] text-center bg-white border border-gray-200 rounded p-1 text-[10px] outline-none focus:ring-1 focus:ring-emerald-400 shadow-sm"
                              />
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 font-bold text-center text-[12px] text-orange-600 bg-orange-50/10 border-r border-gray-100">
                        {chainData.consumed}
                      </td>
                      <td className={`px-4 py-3 font-bold text-center text-[12px] ${chainData.final < config.minStock ? 'text-red-500 bg-red-50/30' : 'text-emerald-700 bg-emerald-50/30'}`}>
                        {chainData.final}
                      </td>
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
