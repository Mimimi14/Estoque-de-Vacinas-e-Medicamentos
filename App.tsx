
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

// Mock session to bypass login
const MOCK_SESSION: any = {
  user: {
    email: 'admin.estoque@adoro.com.br',
    id: 'mock-user-id'
  }
};

const App: React.FC = () => {
  // Login temporarily disabled: initializing with MOCK_SESSION
  const [session, setSession] = useState<Session | null>(MOCK_SESSION);
  const [activeView, setActiveView] = useState<ViewType>('inventory');
  // Alterado para array para suportar seleção múltipla
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const [items, setItems] = useState<Item[]>([]);
  const [itemConfigs, setItemConfigs] = useState<ItemMonthlyConfig[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryEntries, setInventoryEntries] = useState<InventoryMonthData[]>([]);
  const [monthlyDates, setMonthlyDates] = useState<Record<string, string[]>>({}); // Key: "month-year"
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Load from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: itemsData } = await supabase.from('items').select('*');
        const { data: configsData } = await supabase.from('item_configs').select('*');
        const { data: ordersData } = await supabase.from('orders').select('*');
        const { data: inventoryData } = await supabase.from('inventory_entries').select('*');
        const { data: datesData } = await supabase.from('monthly_dates').select('*');

        if (itemsData && itemsData.length > 0) {
          setItems(itemsData);
          setItemConfigs(configsData || []);
          setOrders(ordersData || []);
          setInventoryEntries(inventoryData || []);
          
          const datesMap: Record<string, string[]> = {};
          datesData?.forEach(d => {
            const key = `${d.month_index}-${d.year || 2026}`;
            datesMap[key] = d.dates;
          });
          setMonthlyDates(datesMap);
        } else {
          const initialItems: Item[] = [
            { id: '1', name: 'Innovax ND', unit: 'Ampola', dosage: 4000, manufacturer: 'MSD' },
            { id: '2', name: 'Vectormune', unit: 'Ampola', dosage: 2000, manufacturer: 'CEVA' },
          ];
          setItems(initialItems);
          
          const initialConfigs: ItemMonthlyConfig[] = [];
          initialItems.forEach(item => {
            for (let m = 0; m < 12; m++) {
              initialConfigs.push({
                itemId: item.id,
                monthIndex: m,
                averageCost: item.id === '1' ? 91.70 : 120,
                minStock: item.id === '1' ? 2000 : 1500
              });
            }
          });
          setItemConfigs(initialConfigs);
          
          await supabase.from('items').upsert(initialItems);
          await supabase.from('item_configs').upsert(initialConfigs);
        }
      } catch (error) {
        console.error("Erro ao carregar do Supabase:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchData();
  }, []);

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
        if (m > 0) {
          prevMonthFinal = chain[item.id][m-1]?.final || 0;
        } else {
          prevMonthFinal = 0; 
        }

        const initial = (entry?.manualInitialStock !== undefined && entry?.manualInitialStock !== null)
          ? entry.manualInitialStock 
          : prevMonthFinal;

        let lastWeekIdx = -1;
        for (let i = 3; i >= 0; i--) {
          if (entryWeeks[i] !== null && entryWeeks[i] !== undefined) {
            lastWeekIdx = i;
            break;
          }
        }

        const flatReceived = orders.flatMap(o => 
          o.status === OrderStatus.RECEIVED 
            ? o.items.filter(oi => oi.itemId === item.id && oi.actualDate) 
            : []
        ).filter(oi => {
           const d = new Date(oi.actualDate! + 'T12:00:00');
           return d.getMonth() === m && d.getFullYear() === selectedYear;
        });

        if (lastWeekIdx === -1) {
          const totalReceived = flatReceived.reduce((sum, oi) => sum + oi.quantity, 0);
          chain[item.id][m] = { 
            initial, 
            final: initial + totalReceived, 
            consumed: 0 
          };
        } else {
          const lastCountDateStr = weekDates[lastWeekIdx];
          const lastCountVal = entryWeeks[lastWeekIdx] || 0;

          let receivedUpToLastCount = 0;
          let receivedAfterLastCount = 0;

          flatReceived.forEach(oi => {
            const arrival = oi.actualDate!;
            if (lastCountDateStr && arrival <= lastCountDateStr) {
              receivedUpToLastCount += oi.quantity;
            } else {
              receivedAfterLastCount += oi.quantity;
            }
          });

          const consumed = (initial + receivedUpToLastCount) - lastCountVal;
          const final = lastCountVal + receivedAfterLastCount;

          chain[item.id][m] = { 
            initial, 
            final: Math.max(0, final), 
            consumed: Math.max(0, consumed) 
          };
        }
      }
    });
    
    return chain;
  }, [items, orders, inventoryEntries, monthlyDates, selectedYear]);

  const updateInventoryEntry = async (
    itemId: string, 
    month: number, 
    weeks: [number | null, number | null, number | null, number | null],
    manualInitial?: number | null
  ) => {
    setIsSyncing(true);
    const idx = inventoryEntries.findIndex(e => e.itemId === itemId && e.monthIndex === month && (e as any).year === selectedYear);
    const existing = inventoryEntries[idx];
    const newEntry: InventoryMonthData = { 
      itemId, 
      monthIndex: month, 
      weeks: weeks as [number | null, number | null, number | null, number | null],
      weekDates: existing?.weekDates || ['', '', '', ''],
      manualInitialStock: manualInitial === null ? undefined : (manualInitial ?? existing?.manualInitialStock)
    };
    (newEntry as any).year = selectedYear;

    const nextEntries = [...inventoryEntries];
    if (idx > -1) {
      nextEntries[idx] = newEntry;
    } else {
      nextEntries.push(newEntry);
    }
    setInventoryEntries(nextEntries);

    await supabase.from('inventory_entries').upsert({
      item_id: itemId,
      month_index: month,
      year: selectedYear,
      weeks: weeks,
      manual_initial_stock: newEntry.manualInitialStock
    });
    setIsSyncing(false);
  };

  const updateMonthlyDate = async (month: number, weekIdx: number, date: string) => {
    setIsSyncing(true);
    const dateKey = `${month}-${selectedYear}`;
    const current = monthlyDates[dateKey] || ['', '', '', ''];
    const nextDates = [...current];
    nextDates[weekIdx] = date;
    
    const updatedMap = { ...monthlyDates, [dateKey]: nextDates };
    setMonthlyDates(updatedMap);

    await supabase.from('monthly_dates').upsert({
      month_index: month,
      year: selectedYear,
      dates: nextDates
    });
    setIsSyncing(false);
  };

  const handleUpdateItems = async (newItems: Item[], newConfigs: ItemMonthlyConfig[]) => {
    setIsSyncing(true);
    setItems(newItems);
    setItemConfigs(newConfigs);
    await supabase.from('items').upsert(newItems);
    await supabase.from('item_configs').upsert(newConfigs);
    setIsSyncing(false);
  };

  const handleOrdersChange = async (newOrders: Order[]) => {
    setIsSyncing(true);
    setOrders(newOrders);
    await supabase.from('orders').upsert(newOrders);
    setIsSyncing(false);
  };

  const handleDeleteOrder = async (orderId: string) => {
    setIsSyncing(true);
    setOrders(orders.filter(o => o.id !== orderId));
    await supabase.from('orders').delete().eq('id', orderId);
    setIsSyncing(false);
  };

  const handleLogout = async () => {
    setSession(null);
  };

  const renderContent = () => {
    if (!isLoaded) return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <p className="text-emerald-900 font-medium">Sincronizando com Supabase...</p>
      </div>
    );

    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard 
            items={items} 
            itemConfigs={itemConfigs} 
            orders={orders} 
            stockChain={calculateStockChain} 
            inventoryEntries={inventoryEntries} 
            selectedYear={selectedYear}
            selectedMonth={selectedMonths[0] ?? 0}
            setSelectedYear={setSelectedYear}
            setSelectedMonth={(m) => setSelectedMonths([m])}
          />
        );
      case 'inventory':
        return (
          <InventoryTable 
            items={items} 
            selectedMonths={selectedMonths} 
            setSelectedMonths={setSelectedMonths} 
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            orders={orders}
            stockChain={calculateStockChain}
            inventoryEntries={inventoryEntries}
            onUpdateEntry={updateInventoryEntry}
            allMonthlyDates={monthlyDates}
            onUpdateMonthlyDate={updateMonthlyDate}
            onReorderItems={(newItems) => { handleUpdateItems(newItems, itemConfigs); }}
            itemConfigs={itemConfigs}
          />
        );
      case 'orders':
        return (
          <OrderManagement 
            items={items} 
            orders={orders} 
            onAddOrder={(o) => handleOrdersChange([...orders, o])}
            onUpdateOrder={(updated) => handleOrdersChange(orders.map(o => o.id === updated.id ? updated : o))}
            onDeleteOrder={handleDeleteOrder}
          />
        );
      case 'fiscal':
        return (
          <FiscalCosts 
            items={items} 
            itemConfigs={itemConfigs}
            selectedMonth={selectedMonths[0] ?? 0} 
            setSelectedMonth={(m) => setSelectedMonths([m])} 
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            stockChain={calculateStockChain} 
            inventoryEntries={inventoryEntries} 
          />
        );
      case 'settings':
        return (
          <Settings 
            items={items} 
            itemConfigs={itemConfigs}
            onUpdateData={handleUpdateItems}
            selectedMonth={selectedMonths[0] ?? 0}
            setSelectedMonth={(m) => setSelectedMonths([m])}
          />
        );
      case 'support':
        return <Support />;
      default:
        return (
          <Dashboard 
            items={items} 
            itemConfigs={itemConfigs} 
            orders={orders} 
            stockChain={calculateStockChain} 
            inventoryEntries={inventoryEntries} 
            selectedYear={selectedYear}
            selectedMonth={selectedMonths[0] ?? 0}
            setSelectedYear={setSelectedYear}
            setSelectedMonth={(m) => setSelectedMonths([m])}
          />
        );
    }
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/20 z-10 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
      />

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'} p-4 md:p-8 overflow-auto`}>
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* O botão do cabeçalho só aparece quando a sidebar está OCULTA (Seta Azul) */}
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-900 transition-all flex-shrink-0 animate-in fade-in zoom-in duration-200"
                title="Mostrar Menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor"/>
                  <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor"/>
                  <rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor"/>
                </svg>
              </button>
            )}
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-emerald-900 uppercase tracking-tight">Estoque de Vacinas e Medicamentos</h1>
              {isSyncing && <span className="text-[10px] text-emerald-600 font-bold animate-pulse">Sincronizando Dados...</span>}
            </div>
          </div>

          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-4 bg-white p-2 rounded-lg shadow-sm border border-emerald-100 self-end md:self-auto hover:bg-emerald-50 transition-colors"
            >
               <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                 {session.user.email?.charAt(0).toUpperCase()}
               </div>
               <div className="text-right">
                 <p className="text-sm font-semibold text-gray-700">{session.user.email?.split('@')[0]}</p>
                 <p className="text-xs text-gray-400">Polo Regional Central</p>
               </div>
               <svg className={`w-4 h-4 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
               </svg>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ações</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors font-bold text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sair do Sistema</span>
                </button>
              </div>
            )}
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
