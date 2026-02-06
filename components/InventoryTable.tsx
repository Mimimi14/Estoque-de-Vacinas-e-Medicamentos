
import React, { useState, useMemo, useEffect } from 'react';
import { Item, Order, InventoryMonthData, OrderStatus, ItemMonthlyConfig } from '../types';
// @ts-ignore
import XLSX from 'xlsx-js-style';

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

const FluidInput: React.FC<{ value: number | null; onChange: (val: number | null) => void; disabled?: boolean; className?: string }> = ({ value, onChange, disabled, className }) => {
  const [localVal, setLocalVal] = useState<string>(value === null ? '' : value.toString());
  useEffect(() => { setLocalVal(value === null ? '' : value.toString()); }, [value]);
  return <input type="number" value={localVal} disabled={disabled} onChange={(e) => setLocalVal(e.target.value)} onBlur={() => { const num = localVal === '' ? null : parseInt(localVal); onChange(num); }} className={className} />;
};

const InventoryTable: React.FC<InventoryTableProps> = ({ items, itemConfigs, selectedMonths, setSelectedMonths, selectedYear, setSelectedYear, orders, stockChain, inventoryEntries, onUpdateEntry, allMonthlyDates, onUpdateMonthlyDate, onReorderItems, readOnly }) => {
  const sortedSelectedMonths = useMemo(() => [...selectedMonths].sort((a, b) => a - b), [selectedMonths]);
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  const getReceivedForInterval = (itemId: string, month: number, weekIdx: number) => {
    const dates = allMonthlyDates[`${month}-${selectedYear}`] || ['', '', '', ''];
    const end = dates[weekIdx]; if (!end) return 0;
    const start = weekIdx > 0 ? dates[weekIdx-1] : '';
    let tot = 0;
    orders.forEach(o => {
      if (o.status !== OrderStatus.RECEIVED) return;
      o.items.forEach(oi => {
        if (oi.itemId === itemId && oi.actualDate) {
          const arr = oi.actualDate; 
          const arrD = new Date(arr + 'T12:00:00');
          if (arrD.getMonth() === month && arrD.getFullYear() === selectedYear) {
            if (weekIdx === 0 ? arr <= end : start && arr > start && arr <= end) tot += oi.quantity;
          }
        }
      });
    });
    return tot;
  };

  const handleExportExcel = () => {
    const BLUE_PETROL = "0B3443";
    const RED_DARK = "7B241C";
    const WHITE = "FFFFFF";

    const commonBorder = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    const centered = { horizontal: "center", vertical: "center" };

    const styleHeaderMain = { fill: { fgColor: { rgb: BLUE_PETROL } }, font: { color: { rgb: WHITE }, bold: true, sz: 14 }, alignment: centered, border: commonBorder };
    const styleHeaderSec = { fill: { fgColor: { rgb: BLUE_PETROL } }, font: { color: { rgb: WHITE }, bold: true, sz: 10 }, alignment: centered, border: commonBorder };
    const styleHeaderRed = { fill: { fgColor: { rgb: RED_DARK } }, font: { color: { rgb: WHITE }, bold: true, sz: 10 }, alignment: centered, border: commonBorder };
    const styleDataNormal = { alignment: centered, border: commonBorder };
    const styleDataRed = { fill: { fgColor: { rgb: RED_DARK } }, font: { color: { rgb: WHITE }, bold: true }, alignment: centered, border: commonBorder };
    const styleDataBold = { font: { bold: true }, alignment: centered, border: commonBorder };

    const colsPerMonth = 20; // Espaço detalhado por mês conforme imagem
    const totalCols = 4 + (sortedSelectedMonths.length * colsPerMonth);
    const data: any[][] = [];

    // Linha 0: Título Principal
    const row0 = Array(totalCols).fill("");
    row0[0] = `CONTROLE DE ESTOQUE E SOLICITAÇÃO DE VACINAS E MEDICAMENTOS - ${selectedYear}`;
    data.push(row0);

    // Linha 1: Dados do Item / Meses
    const row1 = Array(totalCols).fill("");
    row1[0] = "DADOS DO ITEM";
    sortedSelectedMonths.forEach((m, idx) => {
      row1[4 + (idx * colsPerMonth) + 1] = MONTHS[m];
    });
    data.push(row1);

    // Linha 2: Sub-Cabeçalhos Detalhados
    const row2 = Array(totalCols).fill("");
    row2[0] = "NOME COMERCIAL"; row2[1] = "EMPRESA"; row2[2] = "DOSE"; row2[3] = "APRESENTAÇÃO";
    sortedSelectedMonths.forEach((m, idx) => {
      const start = 4 + (idx * colsPerMonth) + 1;
      row2[start + 1] = `${MONTHS[m]} 1ª QUINZENA`;
      row2[start + 8] = `${MONTHS[m]} 2ª QUINZENA`;
      row2[start + 14] = `FECHAMENTO MENSAL`;
    });
    data.push(row2);

    // Linha 3: Labels das colunas (Datas, Consumo, Estoque...)
    const row3 = Array(totalCols).fill("");
    sortedSelectedMonths.forEach((m, idx) => {
      const start = 4 + (idx * colsPerMonth) + 1;
      const dates = allMonthlyDates[`${m}-${selectedYear}`] || ['---', '---', '---', '---'];
      row3[start] = "Inicial";
      // Q1
      row3[start+1] = dates[0] || "---"; row3[start+2] = "Consumo"; row3[start+3] = "Estoque";
      row3[start+4] = dates[1] || "---"; row3[start+5] = "Consumo"; row3[start+6] = "Estoque";
      row3[start+7] = "Total Consumo";
      // Q2
      row3[start+8] = dates[2] || "---"; row3[start+9] = "Consumo"; row3[start+10] = "Estoque";
      row3[start+11] = dates[3] || "---"; row3[start+12] = "Consumo"; row3[start+13] = "Estoque";
      row3[start+14] = "Total Consumo";
      // Fechamento
      row3[start+15] = "Inicial"; row3[start+16] = "Recebido"; row3[start+17] = "Consumo"; row3[start+18] = "Final"; row3[start+19] = "Status";
    });
    data.push(row3);

    // Itens
    items.forEach((item) => {
      const row = Array(totalCols).fill("");
      row[0] = item.name; row[1] = item.manufacturer || "MSD"; row[2] = item.dosage; row[3] = item.unit;

      sortedSelectedMonths.forEach((m, idx) => {
        const start = 4 + (idx * colsPerMonth) + 1;
        const chain = stockChain[item.id]?.[m] || { initial: 0, final: 0, consumed: 0 };
        const entry = inventoryEntries.find(e => e.itemId === item.id && e.monthIndex === m && (e as any).year === selectedYear) || { weeks: [null,null,null,null] };
        const rec = [0,1,2,3].reduce((acc, w) => acc + getReceivedForInterval(item.id, m, w), 0);
        
        // Cálculo detalhado de consumo por semana
        const s1 = entry.weeks[0] ?? chain.initial;
        const c1 = Math.max(0, chain.initial + getReceivedForInterval(item.id, m, 0) - s1);
        const s2 = entry.weeks[1] ?? s1;
        const c2 = Math.max(0, s1 + getReceivedForInterval(item.id, m, 1) - s2);
        const s3 = entry.weeks[2] ?? s2;
        const c3 = Math.max(0, s2 + getReceivedForInterval(item.id, m, 2) - s3);
        const s4 = entry.weeks[3] ?? s3;
        const c4 = Math.max(0, s3 + getReceivedForInterval(item.id, m, 3) - s4);

        row[start] = chain.initial;
        row[start+1] = ""; row[start+2] = c1; row[start+3] = s1;
        row[start+4] = ""; row[start+5] = c2; row[start+6] = s2;
        row[start+7] = c1 + c2;
        row[start+8] = ""; row[start+9] = c3; row[start+10] = s3;
        row[start+11] = ""; row[start+12] = c4; row[start+13] = s4;
        row[start+14] = c3 + c4;
        row[start+15] = chain.initial; row[start+16] = rec; row[start+17] = chain.consumed; row[start+18] = chain.final;
        row[start+19] = chain.final < 100 ? "ALERTA" : "OK";
      });
      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
      { s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
      { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
    ];

    sortedSelectedMonths.forEach((_, idx) => {
      const start = 4 + (idx * colsPerMonth) + 1;
      ws['!merges']?.push({ s: { r: 1, c: start }, e: { r: 1, c: start + 19 } }); // Mescla do mês
      ws['!merges']?.push({ s: { r: 2, c: start + 1 }, e: { r: 2, c: start + 7 } }); // Q1
      ws['!merges']?.push({ s: { r: 2, c: start + 8 }, e: { r: 2, c: start + 14 } }); // Q2
      ws['!merges']?.push({ s: { r: 2, c: start + 15 }, e: { r: 2, c: start + 19 } }); // Fechamento
    });

    const range = XLSX.utils.decode_range(ws['!ref'] || "");
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[addr]) ws[addr] = { v: "" };
        const cell = ws[addr];

        if (R === 0) cell.s = styleHeaderMain;
        else if (R === 1 || R === 2) {
          const isRedCol = (C >= 4) && ((C - 5) % colsPerMonth === 7 || (C - 5) % colsPerMonth === 14 || (C - 5) % colsPerMonth === 19);
          cell.s = isRedCol ? styleHeaderRed : styleHeaderSec;
        } else if (R === 3) {
          const isRedCol = (C >= 4) && ((C - 5) % colsPerMonth === 7 || (C - 5) % colsPerMonth === 14 || (C - 5) % colsPerMonth === 19);
          cell.s = isRedCol ? styleHeaderRed : styleHeaderSec;
        } else {
          const isRedCol = (C >= 4) && ((C - 5) % colsPerMonth === 7 || (C - 5) % colsPerMonth === 14 || (C - 5) % colsPerMonth === 19);
          cell.s = isRedCol ? styleDataRed : styleDataNormal;
          if (C < 4) cell.s = { ...cell.s, alignment: C === 0 ? { horizontal: "left" } : centered };
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque");
    XLSX.writeFile(wb, `Relatorio_Estoque_${selectedYear}.xlsx`);
  };

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
          <button onClick={handleExportExcel} className="bg-emerald-800 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md hover:bg-emerald-900 transition-all flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span>Exportar Relatório Excel</span>
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {MONTHS.map((m, i) => (
            <button key={m} onClick={() => { if(!selectedMonths.includes(i)) setSelectedMonths([...selectedMonths, i]); else if(selectedMonths.length > 1) setSelectedMonths(selectedMonths.filter(x => x !== i)); }} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black transition-all border uppercase ${selectedMonths.includes(i) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}>{m}</button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <table className="text-[11px] text-left border-collapse table-fixed min-w-full" style={{ width: `${190 + (sortedSelectedMonths.length * 650)}px` }}>
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
            <tr>
              <th rowSpan={3} className="px-4 py-4 w-[190px] sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200 text-center">Item</th>
              {sortedSelectedMonths.map(m => <th key={m} colSpan={7} className="px-2 py-2 text-center bg-emerald-50/50 border-x border-gray-200 text-emerald-700 font-black border-b border-emerald-100 w-[650px]">{MONTHS[m]}</th>)}
            </tr>
            <tr className="border-b border-gray-100">
              {sortedSelectedMonths.map(m => (
                <React.Fragment key={m}>
                  <th className="px-2 py-4 w-[80px] text-center text-gray-400 border-r border-gray-100">Início</th>
                  <th className="px-2 py-1.5 text-center bg-blue-50/30 border-r border-gray-100 w-[95px]">S1</th>
                  <th className="px-2 py-1.5 text-center bg-blue-50/30 border-r border-gray-100 w-[95px]">S2</th>
                  <th className="px-2 py-1.5 text-center bg-purple-50/30 border-r border-gray-100 w-[95px]">S3</th>
                  <th className="px-2 py-1.5 text-center bg-purple-50/30 border-r border-gray-100 w-[95px]">S4</th>
                  <th className="px-2 py-4 w-[90px] text-center text-orange-600 bg-orange-50/30 border-r border-gray-100">Consumo</th>
                  <th className="px-4 py-4 w-[100px] bg-emerald-50 text-emerald-700 text-center">Saldo</th>
                </React.Fragment>
              ))}
            </tr>
            <tr className="bg-white">
              {sortedSelectedMonths.map(m => {
                const dates = allMonthlyDates[`${m}-${selectedYear}`] || ['', '', '', ''];
                const b = { min: `${selectedYear}-${(m+1).toString().padStart(2,'0')}-01`, max: `${selectedYear}-${(m+1).toString().padStart(2,'0')}-31` };
                return (
                  <React.Fragment key={m}>
                    <th className="px-1 py-1.5 border-r border-gray-100"></th>
                    {[0, 1, 2, 3].map(i => (
                      <th key={i} className="px-1.5 py-2 text-center border-r border-gray-100">
                        <input type="date" value={dates[i]} min={b.min} max={b.max} disabled={readOnly} onChange={(e) => onUpdateMonthlyDate(m, i, e.target.value)} className="text-[10px] w-full text-center bg-emerald-50/50 border border-emerald-200 rounded-lg py-1.5 px-1 outline-none transition-all cursor-pointer" />
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
              <tr key={item.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200">
                  <div className="truncate font-bold uppercase">{item.name}</div>
                  <div className="flex items-center space-x-1"><p className="text-[8px] text-emerald-600 font-black uppercase">{item.manufacturer || 'MSD'}</p></div>
                </td>
                {sortedSelectedMonths.map(m => {
                  const chain = stockChain[item.id]?.[m] || { initial: 0, final: 0, consumed: 0 };
                  const entry = inventoryEntries.find(e => e.itemId === item.id && e.monthIndex === m && (e as any).year === selectedYear) || { weeks: [null,null,null,null] };
                  return (
                    <React.Fragment key={m}>
                      <td className="px-2 py-3 text-center border-r border-gray-100">{m === 0 ? <FluidInput value={(entry as any).manualInitialStock ?? null} disabled={readOnly} onChange={(num) => onUpdateEntry(item.id, m, entry.weeks as any, num)} className="w-[70px] text-center bg-emerald-50 border border-emerald-100 rounded p-1 outline-none" /> : chain.initial}</td>
                      {[0, 1, 2, 3].map(w => {
                        const rec = getReceivedForInterval(item.id, m, w);
                        return (
                          <td key={w} className="px-1 py-3 border-r border-gray-50">
                            <div className="flex flex-col items-center">
                              {rec > 0 && <span className="text-[9px] font-bold text-emerald-600">+{rec}</span>}
                              <FluidInput value={entry.weeks[w]} disabled={readOnly} onChange={(num) => { const nWeeks = [...entry.weeks]; nWeeks[w] = num; onUpdateEntry(item.id, m, nWeeks as any); }} className="w-[85px] text-center border border-gray-200 rounded p-1.5 outline-none font-medium" />
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 font-bold text-center text-orange-600">{chain.consumed}</td>
                      <td className={`px-4 py-3 font-bold text-center ${chain.final < 100 ? 'text-red-500 bg-red-50' : 'text-emerald-700 bg-emerald-50'}`}>{chain.final}</td>
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
