
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

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Formata validade para o padrão brasileiro MM/AAAA
const formatExpiryBR = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const year = parts[0];
    const month = parts[1];
    return `${month}/${year}`;
  }
  return dateStr;
};

const Dashboard: React.FC<DashboardProps> = ({ items, itemConfigs, orders, stockChain, inventoryEntries, selectedYear, selectedMonth, setSelectedYear, setSelectedMonth }) => {
  const currentActualYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentActualYear - 5 + i);

  const metrics = useMemo(() => {
    let totalStockValue = 0; let lowStockCount = 0; let upcomingExpiries = 0;
    items.forEach(item => {
      const cfg = itemConfigs.find(c => c.itemId === item.id && c.monthIndex === selectedMonth) || { averageCost: 0, minStock: 0 };
      const finalStock = stockChain[item.id]?.[selectedMonth]?.final || 0;
      totalStockValue += finalStock * cfg.averageCost;
      if (finalStock < cfg.minStock) lowStockCount++;
    });
    const now = new Date();
    orders.forEach(o => o.items.forEach(oi => {
      if (oi.expiryDate) {
        const [ey, em] = oi.expiryDate.split('-');
        const exp = new Date(parseInt(ey), parseInt(em)-1, 1);
        const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 0 && diffDays < 120) upcomingExpiries++;
      }
    }));
    return { totalStockValue, lowStockCount, upcomingExpiries };
  }, [items, itemConfigs, orders, stockChain, selectedMonth, selectedYear]);

  // LÓGICA FIFO CORRIGIDA: Prioriza o Estoque Inicial de Janeiro
  const panoramaData = useMemo(() => {
    const list: any[] = [];
    const now = new Date();

    items.forEach(item => {
      const supplyHistory: any[] = [];
      
      // 1. O primeiro lote sempre deve ser o Estoque Inicial de Janeiro (Lote 0)
      const janEntry = inventoryEntries.find(e => e.itemId === item.id && e.monthIndex === 0 && (e as any).year === selectedYear);
      if (janEntry?.manualInitialStock && janEntry.manualInitialStock > 0) {
        supplyHistory.push({
          batchNumber: 'ESTOQUE INICIAL JAN',
          arrivalDate: `${selectedYear}-01-01`,
          quantity: janEntry.manualInitialStock,
          expiryDate: undefined
        });
      }

      // 2. Adicionar recebimentos via pedidos subsequentes por ordem de chegada
      const ordersReceived = orders
        .filter(o => o.status === OrderStatus.RECEIVED)
        .flatMap(o => o.items.filter(oi => oi.itemId === item.id && oi.actualDate).map(oi => ({
          batchNumber: oi.batchNumber,
          arrivalDate: oi.actualDate!,
          quantity: oi.quantity,
          expiryDate: oi.expiryDate
        })));
      
      // Ordenar recebimentos por data para garantir FIFO
      ordersReceived.sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));
      supplyHistory.push(...ordersReceived);

      // 3. Calcular consumo total acumulado no ano até o mês atual
      let totalConsumedUntilNow = 0;
      for (let m = 0; m <= selectedMonth; m++) {
        totalConsumedUntilNow += stockChain[item.id]?.[m]?.consumed || 0;
      }

      // 4. Abater consumo acumulado dos lotes disponíveis (FIFO real)
      let remConsumption = totalConsumedUntilNow;
      const batchesWithBalance: any[] = [];

      supplyHistory.forEach(lote => {
        const canConsumeFromThisBatch = Math.min(lote.quantity, remConsumption);
        const balance = lote.quantity - canConsumeFromThisBatch;
        remConsumption -= canConsumeFromThisBatch;

        // Se sobrou saldo e o lote já tinha chegado até o mês atual
        const arrival = new Date(lote.arrivalDate + 'T12:00:00');
        if (balance > 0 && (arrival.getFullYear() < selectedYear || (arrival.getFullYear() === selectedYear && arrival.getMonth() <= selectedMonth))) {
            let isExpiringSoon = false;
            if (lote.expiryDate) {
              const [y, m] = lote.expiryDate.split('-');
              const expDate = new Date(parseInt(y), parseInt(m)-1, 1);
              const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
              if (diffDays >= 0 && diffDays <= 120) isExpiringSoon = true;
            }
            batchesWithBalance.push({ item, batch: lote, quantity: balance, isExpiringSoon });
        }
      });
      list.push(...batchesWithBalance);
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
             <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-2 outline-none font-bold min-w-[130px]">
               {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
             </select>
           </div>
           <div className="flex items-center space-x-2">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ano:</label>
             <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-2 outline-none font-bold">
               {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
          <p className="text-[10px] font-black text-emerald-600 mb-1 uppercase tracking-widest">Valor Total em Estoque ({MONTHS[selectedMonth]})</p>
          <p className="text-3xl font-black text-emerald-950">R$ {metrics.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded w-fit uppercase tracking-tighter italic">Lote Prioritário: Janeiro Inicial</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
          <p className="text-[10px] font-black text-orange-600 mb-1 uppercase tracking-widest">Abaixo do Mínimo</p>
          <p className="text-3xl font-black text-gray-900">{metrics.lowStockCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100">
          <p className="text-[10px] font-black text-red-600 mb-1 uppercase tracking-widest">Vencimentos (4 meses)</p>
          <p className="text-3xl font-black text-gray-900">{metrics.upcomingExpiries} Lotes</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-emerald-50/20">
            <h3 className="text-lg font-bold text-emerald-900 uppercase tracking-tight">Panorama do Inventário Físico (Lotes Ativos)</h3>
            <p className="text-[10px] text-emerald-700 font-bold uppercase opacity-60">Visualização baseada na regra FIFO (Primeiro que Entra, Primeiro que Sai).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Fabricante</th>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Apresentação</th>
                <th className="px-6 py-4 text-center">Partida / Lote</th>
                <th className="px-6 py-4 text-center">Saldo Atual</th>
                <th className="px-6 py-4 text-center">Validade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {panoramaData.length > 0 ? (
                panoramaData.map((data, idx) => (
                  <tr key={idx} className={`hover:bg-gray-50 transition-colors ${data.isExpiringSoon ? 'bg-red-50/20' : ''}`}>
                    <td className="px-6 py-4"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">{data.item.manufacturer || 'MSD'}</span></td>
                    <td className="px-6 py-4 font-black text-emerald-950 uppercase tracking-tight">{data.item.name}</td>
                    <td className="px-6 py-4 text-gray-500 text-[11px] font-medium">{data.item.unit}</td>
                    <td className="px-6 py-4 text-center"><code className="bg-gray-100 px-2 py-1 rounded-lg text-[11px] font-black text-gray-700 uppercase">{data.batch.batchNumber || '---'}</code></td>
                    <td className="px-6 py-4 text-center"><span className="font-black text-emerald-700">{data.quantity} <span className="text-[9px] opacity-60 uppercase">Unid</span></span></td>
                    <td className="px-6 py-4 text-center"><span className={`font-mono text-xs font-black tracking-tighter ${data.isExpiringSoon ? 'text-red-600' : 'text-gray-700'}`}>{formatExpiryBR(data.batch.expiryDate)}</span></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Nenhum lote com saldo encontrado para este período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
