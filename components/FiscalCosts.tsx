
import React, { useState, useMemo } from 'react';
import { Item, InventoryMonthData, ItemMonthlyConfig } from '../types';

interface FiscalCostsProps {
  items: Item[];
  itemConfigs: ItemMonthlyConfig[];
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  inventoryEntries: InventoryMonthData[];
  stockChain: Record<string, Record<number, { initial: number, final: number, consumed: number }>>;
  monthlyProduction: Record<string, number>;
  updateMonthlyProduction: (month: number, year: number, count: number) => void;
  isReadOnly?: boolean;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

type SortKey = 'name' | 'consumedUnits' | 'consumedDoses' | 'unitCost' | 'doseCost' | 'total';
type SortDirection = 'asc' | 'desc';

const FiscalCosts: React.FC<FiscalCostsProps> = ({ 
  items, itemConfigs, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, stockChain, 
  monthlyProduction, updateMonthlyProduction, isReadOnly 
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'name',
    direction: 'asc'
  });

  const currentActualYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentActualYear - 5 + i);

  const getItemConfig = (itemId: string, month: number) => {
    return itemConfigs.find(c => c.itemId === itemId && c.monthIndex === month) || {
      itemId,
      monthIndex: month,
      averageCost: 0,
      minStock: 0
    };
  };

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedItems = useMemo(() => {
    const data = items.map(item => {
      const config = getItemConfig(item.id, selectedMonth);
      const consumedUnits = stockChain[item.id]?.[selectedMonth]?.consumed || 0;
      const consumedDoses = consumedUnits * item.dosage;
      const unitCost = config.averageCost;
      const doseCost = item.dosage > 0 ? unitCost / item.dosage : 0;
      const total = consumedUnits * unitCost;
      
      return {
        ...item,
        config,
        consumedUnits,
        consumedDoses,
        unitCost,
        doseCost,
        total
      };
    });

    data.sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.key) {
        case 'name': comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase()); break;
        case 'consumedUnits': comparison = a.consumedUnits - b.consumedUnits; break;
        case 'consumedDoses': comparison = a.consumedDoses - b.consumedDoses; break;
        case 'unitCost': comparison = a.unitCost - b.unitCost; break;
        case 'doseCost': comparison = a.doseCost - b.doseCost; break;
        case 'total': comparison = a.total - b.total; break;
        default: comparison = 0;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return data;
  }, [items, itemConfigs, selectedMonth, stockChain, sortConfig, selectedYear]);

  const totalMonthCost = useMemo(() => {
    return processedItems.reduce((sum, entry) => sum + entry.total, 0);
  }, [processedItems]);

  const currentProduction = monthlyProduction[`${selectedMonth}-${selectedYear}`] || 0;
  
  const costPerChick = useMemo(() => {
    if (currentProduction === 0) return 0;
    return totalMonthCost / currentProduction;
  }, [totalMonthCost, currentProduction]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <svg className="w-3 h-3 ml-1 opacity-20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
    return sortConfig.direction === 'asc' ? <svg className="w-3 h-3 ml-1 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg> : <svg className="w-3 h-3 ml-1 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center space-x-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Período:</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-2 outline-none font-bold min-w-[120px]"
            >
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ano:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-2 outline-none font-bold"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-2 bg-emerald-50/50 p-1.5 rounded-xl border border-emerald-100">
            <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest ml-1">Pintos Vendáveis:</label>
            <input 
              type="number"
              placeholder="0"
              disabled={isReadOnly}
              value={currentProduction || ''}
              onChange={(e) => updateMonthlyProduction(selectedMonth, selectedYear, parseInt(e.target.value) || 0)}
              className="w-32 bg-white border border-emerald-200 text-emerald-900 text-sm rounded-lg p-1.5 outline-none font-bold text-center placeholder:text-gray-300 disabled:bg-gray-50"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-8">
          <div className="text-right border-r border-emerald-100 pr-8">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Custo Dose/Pinto ({MONTHS[selectedMonth]})</p>
            <p className="text-2xl font-black text-emerald-900">
              R$ {costPerChick.toLocaleString('pt-BR', { minimumFractionDigits: 5, maximumFractionDigits: 5 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Custo Total de Consumo</p>
            <p className="text-2xl font-black text-emerald-900">R$ {totalMonthCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('name')}><div className="flex items-center uppercase">Item<SortIcon column="name" /></div></th>
              <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 text-center select-none" onClick={() => handleSort('consumedUnits')}><div className="flex items-center justify-center uppercase">Consumo (Unid)<SortIcon column="consumedUnits" /></div></th>
              <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 text-center select-none" onClick={() => handleSort('consumedDoses')}><div className="flex items-center justify-center uppercase">Consumo (Doses)<SortIcon column="consumedDoses" /></div></th>
              <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('unitCost')}><div className="flex items-center justify-end uppercase">Custo Unid<SortIcon column="unitCost" /></div></th>
              <th className="px-6 py-4 text-right cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('doseCost')}><div className="flex items-center justify-end uppercase">Custo Dose<SortIcon column="doseCost" /></div></th>
              <th className="px-6 py-4 text-right text-emerald-700 bg-emerald-50/30 cursor-pointer hover:bg-emerald-100/50 select-none" onClick={() => handleSort('total')}><div className="flex items-center justify-end uppercase">Total Mensal<SortIcon column="total" /></div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {processedItems.map(entry => (
              <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4"><span className="font-bold text-gray-900 block uppercase">{entry.name}</span><span className="text-[9px] text-gray-400 uppercase">{entry.unit}</span></td>
                <td className="px-6 py-4 text-center font-bold text-gray-700">{entry.consumedUnits}</td>
                <td className="px-6 py-4 text-center font-bold text-emerald-600 bg-emerald-50/20">{entry.consumedDoses.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-4 text-right font-mono text-xs">R$ {entry.unitCost.toFixed(2)}</td>
                <td className="px-6 py-4 text-right font-mono text-xs text-emerald-600">R$ {entry.doseCost.toFixed(4)}</td>
                <td className="px-6 py-4 text-right font-bold text-emerald-900 bg-emerald-50/10">R$ {entry.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FiscalCosts;
