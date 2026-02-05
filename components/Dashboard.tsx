
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Item, Order, InventoryMonthData, ItemMonthlyConfig, OrderStatus } from '../types';

interface DashboardProps {
  items: Item[];
  itemConfigs: ItemMonthlyConfig[];
  orders: Order[];
  stockChain: Record<string, Record<number, { initial: number, final: number, consumed: number }>>;
  inventoryEntries: InventoryMonthData[];
  selectedYear: number;
  selectedMonth: number;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatDateBR = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const Dashboard: React.FC<DashboardProps> = ({ 
  items, 
  itemConfigs, 
  orders, 
  stockChain, 
  inventoryEntries, 
  selectedYear, 
  selectedMonth, 
  setSelectedYear, 
  setSelectedMonth 
}) => {
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

  const metrics = useMemo(() => {
    let totalStockValue = 0;
    let lowStockCount = 0;
    let upcomingExpiries = 0;

    items.forEach(item => {
      const config = getItemConfig(item.id, selectedMonth);
      const finalStock = stockChain[item.id]?.[selectedMonth]?.final || 0;
      totalStockValue += finalStock * config.averageCost;
      if (finalStock < config.minStock) {
        lowStockCount++;
      }
    });

    const now = new Date();
    orders.forEach(o => {
      o.items.forEach(oi => {
        if (oi.expiryDate) {
          const exp = new Date(oi.expiryDate + 'T12:00:00');
          const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 0 && diffDays < 120) upcomingExpiries++;
        }
      });
    });

    return { totalStockValue, lowStockCount, upcomingExpiries };
  }, [items, itemConfigs, orders, stockChain, selectedMonth, selectedYear]);

  const chartData = useMemo(() => {
    const consumptionMap: Record<string, number> = {};
    
    items.forEach(item => {
        const consumption = stockChain[item.id]?.[selectedMonth]?.consumed || 0;
        if (consumption > 0) {
            consumptionMap[item.name] = consumption;
        }
    });

    return Object.entries(consumptionMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [items, stockChain, selectedMonth, selectedYear]);

  const panoramaData = useMemo(() => {
    const list: any[] = [];
    const now = new Date();

    items.forEach(item => {
      const allBatches = orders
        .filter(o => o.status === OrderStatus.RECEIVED)
        .flatMap(o => o.items
          .filter(oi => oi.itemId === item.id && oi.actualDate)
          .map(oi => ({
            ...oi,
            requestName: o.requestName,
            actualDate: oi.actualDate!
          }))
        )
        .filter(batch => {
            const arrivalDate = new Date(batch.actualDate + 'T12:00:00');
            return arrivalDate.getFullYear() < selectedYear || 
                   (arrivalDate.getFullYear() === selectedYear && arrivalDate.getMonth() <= selectedMonth);
        })
        .sort((a, b) => a.actualDate.localeCompare(b.actualDate));

      let totalConsumedAccumulated = 0;
      for (let m = 0; m <= selectedMonth; m++) {
        totalConsumedAccumulated += stockChain[item.id]?.[m]?.consumed || 0;
      }

      let remainingDeduction = totalConsumedAccumulated;
      const batchesWithStock: any[] = [];

      allBatches.forEach(batch => {
        const deductionFromThisBatch = Math.min(batch.quantity, remainingDeduction);
        const stockLeftInBatch = batch.quantity - deductionFromThisBatch;
        remainingDeduction -= deductionFromThisBatch;

        if (stockLeftInBatch > 0) {
            let isExpiringSoon = false;
            if (batch.expiryDate) {
              const expDate = new Date(batch.expiryDate + 'T12:00:00');
              const diffMs = expDate.getTime() - now.getTime();
              const diffDays = diffMs / (1000 * 60 * 60 * 24);
              if (diffDays >= 0 && diffDays <= 120) isExpiringSoon = true;
            }

            batchesWithStock.push({
              item,
              batch,
              quantity: stockLeftInBatch,
              isExpiringSoon
            });
        }
      });

      list.push(...batchesWithStock);
    });

    return list;
  }, [items, orders, inventoryEntries, stockChain, selectedMonth, selectedYear]);

  const COLORS = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <h2 className="text-xl font-bold text-emerald-900">Dashboard de Gestão</h2>
         <div className="flex flex-wrap items-center gap-4">
           <div className="flex items-center space-x-2">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mês:</label>
             <select 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
               className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-2 outline-none font-bold min-w-[130px]"
             >
               {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
             </select>
           </div>
           <div className="flex items-center space-x-2">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ano:</label>
             <select 
               value={selectedYear} 
               onChange={(e) => setSelectedYear(parseInt(e.target.value))}
               className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-2 outline-none font-bold"
             >
               {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
          <p className="text-[10px] font-black text-emerald-600 mb-1 uppercase tracking-widest">Valor Total em Estoque ({MONTHS[selectedMonth]})</p>
          <p className="text-3xl font-black text-emerald-950">R$ {metrics.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded w-fit uppercase tracking-tighter">
            Fechamento do Período
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
          <p className="text-[10px] font-black text-orange-600 mb-1 uppercase tracking-widest">Abaixo do Mínimo</p>
          <p className="text-3xl font-black text-gray-900">{metrics.lowStockCount}</p>
          <p className="mt-4 text-[10px] text-gray-400 uppercase font-bold">Reserva de Segurança</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
          <p className="text-[10px] font-black text-red-600 mb-1 uppercase tracking-widest">Vencimentos (4 meses)</p>
          <p className="text-3xl font-black text-gray-900">{metrics.upcomingExpiries} Lotes</p>
          <p className="mt-4 text-[10px] text-gray-400 uppercase font-bold italic">Prioridade de Uso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
          <h3 className="text-lg font-bold text-emerald-950 mb-6 uppercase tracking-tight">Consumo por Item ({MONTHS[selectedMonth]})</h3>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 italic">
                <p className="text-sm">Sem dados de consumo registrados.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
          <h3 className="text-lg font-bold text-emerald-950 mb-4 uppercase tracking-tight">Informações Estratégicas</h3>
          <div className="space-y-4">
             {metrics.lowStockCount > 0 && (
               <div className="flex items-start space-x-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl">
                 <div className="bg-orange-100 p-2 rounded-xl text-orange-600 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <div>
                   <p className="text-xs font-black text-orange-950 uppercase tracking-tight">Nível Crítico Detectado</p>
                   <p className="text-[11px] text-orange-700 font-medium">Existem vacinas ou medicamentos que fecharam o período abaixo da margem de segurança configurada.</p>
                 </div>
               </div>
             )}
             <div className="flex items-start space-x-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                 <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div>
                   <p className="text-xs font-black text-emerald-950 uppercase tracking-tight">Regra FIFO Aplicada</p>
                   <p className="text-[11px] text-emerald-700 font-medium italic">A listagem de lotes prioriza a saída das partidas mais antigas para evitar desperdícios e obsolescência.</p>
                 </div>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-emerald-50/20 flex flex-col md:flex-row md:items-center justify-between gap-2">
           <div>
              <h3 className="text-lg font-bold text-emerald-900 uppercase tracking-tight">Panorama do Inventário Físico</h3>
              <p className="text-[10px] text-emerald-700 font-bold uppercase opacity-60">Status dos lotes remanescentes após o fechamento de {MONTHS[selectedMonth]}.</p>
           </div>
           <div className="bg-white px-3 py-1.5 rounded-full border border-emerald-100 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
             {panoramaData.length} Lotes Ativos
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Fabricante</th>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Apresentação</th>
                <th className="px-6 py-4 text-center">Partida (Lote)</th>
                <th className="px-6 py-4 text-center">Saldo Atual</th>
                <th className="px-6 py-4 text-center">Validade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {panoramaData.length > 0 ? (
                panoramaData.map((data, idx) => (
                  <tr key={idx} className={`hover:bg-gray-50 transition-colors ${data.isExpiringSoon ? 'bg-red-50/20' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">
                        {data.item.manufacturer || 'MSD'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-emerald-950 uppercase tracking-tight">{data.item.name}</td>
                    <td className="px-6 py-4 text-gray-500 text-[11px] font-medium">{data.item.unit}</td>
                    <td className="px-6 py-4 text-center">
                      <code className="bg-gray-100 px-2 py-1 rounded-lg text-[11px] font-black text-gray-700 uppercase">
                        {data.batch.batchNumber || '---'}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-emerald-700">
                        {data.quantity} <span className="text-[9px] opacity-60 uppercase">Unid</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-mono text-xs font-black tracking-tighter ${data.isExpiringSoon ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatDateBR(data.batch.expiryDate)}
                        </span>
                        {data.isExpiringSoon && (
                          <span className="text-[8px] font-black uppercase text-red-600 animate-pulse mt-0.5">Priorizar Uso</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Nenhum lote com saldo positivo identificado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
