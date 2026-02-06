
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Item, Order, InventoryMonthData, OrderStatus, ViewType, ItemMonthlyConfig } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InventoryTable from './components/InventoryTable';
import OrderManagement from './components/OrderManagement';
import FiscalCosts from './components/FiscalCosts';
import Settings from './components/Settings';
import Auth from './components/Auth';
import Support from './components/Support';

const FALLBACK_USER_ID = 'dev-editor-2026';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const [items, setItems] = useState<Item[]>([]);
  const [itemConfigs, setItemConfigs] = useState<ItemMonthlyConfig[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryEntries, setInventoryEntries] = useState<InventoryMonthData[]>([]);
  const [monthlyDates, setMonthlyDates] = useState<Record<string, string[]>>({}); 
  const [monthlyProduction, setMonthlyProduction] = useState<Record<string, number>>({}); 
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const savedReadOnly = localStorage.getItem('sge_readonly') === 'true';
      setIsReadOnly(savedReadOnly);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user?.id || FALLBACK_USER_ID;
    const fetchData = async () => {
      setIsLoaded(false);
      try {
        const [
          { data: itemsData },
          { data: configsData },
          { data: ordersData },
          { data: inventoryData },
          { data: datesData },
          { data: statsData }
        ] = await Promise.all([
          supabase.from('items').select('*').eq('user_id', userId),
          supabase.from('item_configs').select('*').eq('user_id', userId),
          supabase.from('orders').select('*').eq('user_id', userId),
          supabase.from('inventory_entries').select('*').eq('user_id', userId),
          supabase.from('monthly_dates').select('*').eq('user_id', userId),
          supabase.from('monthly_stats').select('*').eq('user_id', userId)
        ]);

        let finalItems = itemsData || [];
        let finalConfigs = configsData || [];

        // Adicionar Innovax ND se o catálogo estiver vazio ou se não existir o item específico
        const hasInnovax = finalItems.some(i => i.name === 'Innovax ND');
        if (!hasInnovax) {
          const defaultItem = { id: 'innovax-nd-seed', name: 'Innovax ND', manufacturer: 'MSD', unit: 'Ampola', dosage: 4000 };
          finalItems = [defaultItem, ...finalItems];
          // Adicionar configs para todos os meses para o item default
          for (let m = 0; m < 12; m++) {
            finalConfigs.push({ itemId: defaultItem.id, monthIndex: m, averageCost: 450, minStock: 100 });
          }
        }

        setItems(finalItems);
        setItemConfigs(finalConfigs);
        setOrders(ordersData || []);
        setInventoryEntries(inventoryData || []);
        
        const datesMap: Record<string, string[]> = {};
        datesData?.forEach(d => {
          const key = `${d.month_index}-${d.year || 2026}`;
          datesMap[key] = d.dates;
        });
        setMonthlyDates(datesMap);

        const prodMap: Record<string, number> = {};
        statsData?.forEach(s => {
          const key = `${s.month_index}-${s.year}`;
          prodMap[key] = s.production_count || 0;
        });
        setMonthlyProduction(prodMap);

      } catch (error) {
        console.error("Erro na sincronização:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchData();
  }, [session]);

  const calculateStockChain = useMemo(() => {
    const chain: Record<string, Record<number, { initial: number, final: number, consumed: number }>> = {};
    items.forEach(item => {
      chain[item.id] = {};
      for (let m = 0; m < 12; m++) {
        const entry = inventoryEntries.find(e => e.itemId === item.id && e.monthIndex === m && (e as any).year === selectedYear);
        const dateKey = `${m}-${selectedYear}`;
        const weekDates = monthlyDates[dateKey] || ['', '', '', ''];
        const entryWeeks = entry?.weeks || [null, null, null, null];
        let prevMonthFinal = 0;
        if (m > 0) prevMonthFinal = chain[item.id][m-1]?.final || 0;
        const initial = (entry?.manualInitialStock !== undefined && entry?.manualInitialStock !== null) ? entry.manualInitialStock : prevMonthFinal;
        
        let lastWeekIdx = -1;
        for (let i = 3; i >= 0; i--) { if (entryWeeks[i] !== null && entryWeeks[i] !== undefined) { lastWeekIdx = i; break; } }
        
        const flatReceived = orders.flatMap(o => o.status === OrderStatus.RECEIVED ? o.items.filter(oi => oi.itemId === item.id && oi.actualDate) : []).filter(oi => {
           const d = new Date(oi.actualDate! + 'T12:00:00');
           return d.getMonth() === m && d.getFullYear() === selectedYear;
        });

        if (lastWeekIdx === -1) {
          const totalReceived = flatReceived.reduce((sum, oi) => sum + oi.quantity, 0);
          chain[item.id][m] = { initial, final: initial + totalReceived, consumed: 0 };
        } else {
          const lastCountDateStr = weekDates[lastWeekIdx];
          const lastCountVal = entryWeeks[lastWeekIdx] || 0;
          let receivedUpToLastCount = 0;
          let receivedAfterLastCount = 0;
          flatReceived.forEach(oi => {
            if (lastCountDateStr && oi.actualDate! <= lastCountDateStr) receivedUpToLastCount += oi.quantity;
            else receivedAfterLastCount += oi.quantity;
          });
          const consumed = (initial + receivedUpToLastCount) - lastCountVal;
          const final = lastCountVal + receivedAfterLastCount;
          chain[item.id][m] = { initial, final: Math.max(0, final), consumed: Math.max(0, consumed) };
        }
      }
    });
    return chain;
  }, [items, orders, inventoryEntries, monthlyDates, selectedYear]);

  const updateInventoryEntry = async (itemId: string, month: number, weeks: [number | null, number | null, number | null, number | null], manualInitial?: number | null) => {
    if (isReadOnly) return;
    setIsSyncing(true);
    const userId = session?.user?.id || FALLBACK_USER_ID;
    const existingEntry = inventoryEntries.find(e => e.itemId === itemId && e.monthIndex === month && (e as any).year === selectedYear);
    const finalManualInitial = manualInitial !== undefined ? manualInitial : (existingEntry?.manualInitialStock ?? null);
    await supabase.from('inventory_entries').upsert({ item_id: itemId, month_index: month, year: selectedYear, weeks: weeks, manual_initial_stock: finalManualInitial, user_id: userId });
    setInventoryEntries(prev => {
      const idx = prev.findIndex(e => e.itemId === itemId && e.monthIndex === month && (e as any).year === selectedYear);
      const next = [...prev];
      const newEntry = { itemId, monthIndex: month, year: selectedYear, weeks, manualInitialStock: finalManualInitial ?? undefined } as any;
      if (idx > -1) next[idx] = newEntry; else next.push(newEntry);
      return next;
    });
    setIsSyncing(false);
  };

  const updateMonthlyDate = async (month: number, weekIdx: number, date: string) => {
    if (isReadOnly) return;
    setIsSyncing(true);
    const userId = session?.user?.id || FALLBACK_USER_ID;
    const dateKey = `${month}-${selectedYear}`;
    const current = monthlyDates[dateKey] || ['', '', '', ''];
    const nextDates = [...current];
    nextDates[weekIdx] = date;
    setMonthlyDates(prev => ({ ...prev, [dateKey]: nextDates }));
    await supabase.from('monthly_dates').upsert({ month_index: month, year: selectedYear, dates: nextDates, user_id: userId });
    setIsSyncing(false);
  };

  const updateMonthlyProduction = async (month: number, year: number, count: number) => {
    if (isReadOnly) return;
    setIsSyncing(true);
    const userId = session?.user?.id || FALLBACK_USER_ID;
    const key = `${month}-${year}`;
    setMonthlyProduction(prev => ({ ...prev, [key]: count }));
    await supabase.from('monthly_stats').upsert({ month_index: month, year: year, production_count: count, user_id: userId });
    setIsSyncing(false);
  };

  const handleUpdateItems = async (newItems: Item[], newConfigs: ItemMonthlyConfig[]) => {
    if (isReadOnly) return;
    setIsSyncing(true);
    const userId = session?.user?.id || FALLBACK_USER_ID;
    await Promise.all([supabase.from('items').upsert(newItems.map(i => ({ ...i, user_id: userId }))), supabase.from('item_configs').upsert(newConfigs.map(c => ({ ...c, user_id: userId })))]);
    setItems(newItems); setItemConfigs(newConfigs);
    setIsSyncing(false);
  };

  const handleOrdersChange = async (newOrders: Order[]) => {
    if (isReadOnly) return;
    setIsSyncing(true);
    const userId = session?.user?.id || FALLBACK_USER_ID;
    await supabase.from('orders').upsert(newOrders.map(o => ({ ...o, user_id: userId })));
    setOrders(newOrders);
    setIsSyncing(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-10 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isReadOnly={isReadOnly} />
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'} p-4 md:p-8 overflow-auto`}>
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-900 transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor"/><rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor"/></svg></button>}
            <div className="flex flex-col"><h1 className="text-2xl font-bold text-emerald-900 uppercase tracking-tight">Controle de Estoque 2026</h1>{isSyncing && <span className="text-[10px] text-emerald-600 font-bold animate-pulse uppercase">Sincronizando...</span>}</div>
          </div>
          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-4 bg-white p-2 rounded-lg shadow-sm border border-emerald-100 hover:bg-emerald-50 transition-colors">
               <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">{session ? session.user.email?.charAt(0).toUpperCase() : 'D'}</div>
               <div className="text-right hidden sm:block">
                 <p className="text-sm font-semibold text-gray-700">{session ? session.user.email?.split('@')[0] : 'Modo Edição / Dev'}</p>
                 <p className="text-xs text-gray-400">{isReadOnly ? 'Acesso Leitura' : 'Acesso Editor'}</p>
               </div>
            </button>
          </div>
        </header>
        {!isLoaded ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div><p className="text-emerald-900 font-medium italic">Sincronizando...</p></div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {activeView === 'dashboard' && <Dashboard items={items} itemConfigs={itemConfigs} orders={orders} stockChain={calculateStockChain} inventoryEntries={inventoryEntries} selectedYear={selectedYear} selectedMonth={selectedMonths[0] ?? 0} setSelectedYear={setSelectedYear} setSelectedMonth={(m) => setSelectedMonths([m])} />}
            {activeView === 'inventory' && <InventoryTable items={items} itemConfigs={itemConfigs} selectedMonths={selectedMonths} setSelectedMonths={setSelectedMonths} selectedYear={selectedYear} setSelectedYear={setSelectedYear} orders={orders} stockChain={calculateStockChain} inventoryEntries={inventoryEntries} onUpdateEntry={updateInventoryEntry} allMonthlyDates={monthlyDates} onUpdateMonthlyDate={updateMonthlyDate} onReorderItems={(newItems) => handleUpdateItems(newItems, itemConfigs)} readOnly={isReadOnly} />}
            {activeView === 'orders' && <OrderManagement items={items} orders={orders} onAddOrder={(o) => handleOrdersChange([...orders, o])} onUpdateOrder={(updated) => handleOrdersChange(orders.map(o => o.id === updated.id ? updated : o))} onDeleteOrder={(id) => handleOrdersChange(orders.filter(o => o.id !== id))} readOnly={isReadOnly} />}
            {activeView === 'fiscal' && <FiscalCosts items={items} itemConfigs={itemConfigs} selectedMonth={selectedMonths[0] ?? 0} setSelectedMonth={(m) => setSelectedMonths([m])} selectedYear={selectedYear} setSelectedYear={setSelectedYear} stockChain={calculateStockChain} inventoryEntries={inventoryEntries} monthlyProduction={monthlyProduction} updateMonthlyProduction={updateMonthlyProduction} isReadOnly={isReadOnly} />}
            {activeView === 'settings' && <Settings items={items} itemConfigs={itemConfigs} onUpdateData={handleUpdateItems} selectedMonth={selectedMonths[0] ?? 0} setSelectedMonth={(m) => setSelectedMonths([m])} readOnly={isReadOnly} />}
            {activeView === 'support' && <Support />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
