
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

  // FIFO Calculation for "Panorama Geral"
  // Lógica: 
  // 1. Pega todos os lotes recebidos até o final do mês selecionado.
  // 2. Calcula o consumo total acumulado do item desde o início (considerando apenas o ano atual para simplificar o mock).
  // 3. Subtrai o consumo total dos lotes seguindo a ordem de chegada (FIFO).
  // 4. O que sobrar com saldo > 0 é o que está fisicamente no estoque naquele mês.
  const panoramaData = useMemo(() => {
    const list: any[] = [];
    const now = new Date();

    items.forEach(item => {
      // 1. Obter todos os lotes recebidos deste item até o mês selecionado no ano selecionado
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
        .sort((a, b) => a.actualDate.localeCompare(b.actualDate)); // Ordem FIFO

      // 2. Calcular o Consumo Total acumulado até o FINAL do mês selecionado
      let totalConsumedAccumulated = 0;
      for (let m = 0; m <= selectedMonth; m++) {
        totalConsumedAccumulated += stockChain[item.id]?.[m]?.consumed || 0;
      }

      // 3. Subtração Sequencial (FIFO)
      let remainingDeduction = totalConsumedAccumulated;
      const batchesWithStock: any[] = [];

      allBatches.forEach(batch => {
        const deductionFromThisBatch = Math.min(batch.quantity, remainingDeduction);
        const stockLeftInBatch = batch.quantity - deductionFromThisBatch;
        remainingDeduction -= deductionFromThisBatch;

        if (stockLeftInBatch > 0) {
            // Se ainda tem estoque, este lote aparece na lista do mês selecionado
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
             <label className="text-xs font-bold text-gray-400 uppercase">Mês:</label>
             <select 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
               className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-2 outline-none font-bold min-w-[130px]"
             >
               {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
             </select>
           </div>
           <div className="flex items-center space-x-2">
             <label className="text-xs font-bold text-gray-400 uppercase">Ano:</label>
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
          <p className="text-sm font-medium text-emerald-600 mb-1">Valor Total em Estoque ({MONTHS[selectedMonth]}/{selectedYear})</p>
          <p className="text-3xl font-bold text-gray-900">R$ {metrics.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <div className="mt-4 flex items-center text-xs text-emerald-500 bg-emerald-50 px-2 py-1 rounded w-fit">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>
            <span>Fechamento do Período</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-50">
          <p className="text-sm font-medium text-orange-600 mb-1">Itens Abaixo do Mínimo</p>
          <p className="text-3xl font-bold text-gray-900">{metrics.lowStockCount}</p>
          <p className="mt-4 text-xs text-gray-400">Em relação ao estoque final do mês</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-50">
          <p className="text-sm font-medium text-red-600 mb-1">Vencimentos Próximos (4 meses)</p>
          <p className="text-3xl font-bold text-gray-900">{metrics.upcomingExpiries} Lotes</p>
          <p className="mt-4 text-xs text-gray-400">Alerta de uso prioritário</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Consumo por Item ({MONTHS[selectedMonth]})</h3>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                <p className="text-sm">Sem dados de consumo para {MONTHS[selectedMonth]}.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Informações do Período</h3>
          <div className="space-y-4">
             {metrics.lowStockCount > 0 && (
               <div className="flex items-start space-x-3 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                 <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <div>
                   <p className="text-sm font-semibold text-orange-900">Atenção ao Nível de Segurança</p>
                   <p className="text-xs text-orange-700">Existem itens que fecharam {MONTHS[selectedMonth]} abaixo da reserva mínima.</p>
                 </div>
               </div>
             )}
             <div className="flex items-start space-x-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                 <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <div>
                   <p className="text-sm font-semibold text-emerald-900">FIFO Dinâmico</p>
                   <p className="text-xs text-emerald-700">A lista abaixo mostra os lotes remanescentes após os consumos até {MONTHS[selectedMonth]}.</p>
                 </div>
             </div>
          </div>
        </div>
      </div>

      {/* Panorama Geral Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-emerald-50/20 flex flex-col md:flex-row md:items-center justify-between gap-2">
           <div>
              <h3 className="text-lg font-bold text-emerald-900">Panorama Geral - Cenário em {MONTHS[selectedMonth]} {selectedYear}</h3>
              <p className="text-xs text-emerald-700 opacity-70 italic">Lotes disponíveis no estoque físico após fechamento do mês.</p>
           </div>
           <div className="bg-white px-3 py-1 rounded-full border border-emerald-100 text-[10px] font-bold text-emerald-600 uppercase">
             Total de Partidas Ativas: {panoramaData.length}
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Fabricante</th>
                <th className="px-6 py-4">Item / Vacina</th>
                <th className="px-6 py-4">Apresentação</th>
                <th className="px-6 py-4 text-center">Dosagem</th>
                <th className="px-6 py-4 text-center">Partida (Lote)</th>
                <th className="px-6 py-4 text-center">Saldo em Estoque</th>
                <th className="px-6 py-4 text-center">Validade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {panoramaData.length > 0 ? (
                panoramaData.map((data, idx) => (
                  <tr key={idx} className={`hover:bg-gray-50 transition-colors ${data.isExpiringSoon ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase">
                        {data.item.manufacturer || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight">{data.item.name}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{data.item.unit}</td>
                    <td className="px-6 py-4 text-center font-medium text-xs">{data.item.dosage.toLocaleString()} doses</td>
                    <td className="px-6 py-4 text-center">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-bold text-gray-600 uppercase">
                        {data.batch.batchNumber || '---'}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-emerald-600 text-[13px]">
                        {data.quantity} <span className="text-[10px] font-normal uppercase">{data.item.unit}(s)</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-mono text-xs font-bold ${data.isExpiringSoon ? 'text-red-600' : 'text-gray-600'}`}>
                          {data.batch.expiryDate ? new Date(data.batch.expiryDate + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                        </span>
                        {data.isExpiringSoon && (
                          <span className="flex items-center text-[8px] font-black uppercase text-red-600 animate-pulse mt-0.5">
                            <svg className="w-2.5 h-2.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            Vencimento Próximo
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                    Nenhum lote com saldo positivo em {MONTHS[selectedMonth]} {selectedYear}.
                  </td>
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
