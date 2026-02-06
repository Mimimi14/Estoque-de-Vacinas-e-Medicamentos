
import React, { useState } from 'react';
import { Item, ItemMonthlyConfig } from '../types';

interface SettingsProps {
  items: Item[];
  itemConfigs: ItemMonthlyConfig[];
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  onUpdateData: (items: Item[], configs: ItemMonthlyConfig[]) => void;
  readOnly?: boolean;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'AGOSTO', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const Settings: React.FC<SettingsProps> = ({ items, itemConfigs, selectedMonth, setSelectedMonth, onUpdateData, readOnly }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [cost, setCost] = useState('');
  const [min, setMin] = useState('');
  const [dosage, setDosage] = useState('');
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const resetForm = () => {
    setName('');
    setUnit('');
    setManufacturer('');
    setCost('');
    setMin('');
    setDosage('');
    setEditingItemId(null);
  };

  const handleEditClick = (item: Item) => {
    const cfg = itemConfigs.find(c => c.itemId === item.id && c.monthIndex === selectedMonth) || { averageCost: 0, minStock: 0 };
    setEditingItemId(item.id);
    setName(item.name);
    setUnit(item.unit);
    setManufacturer(item.manufacturer || '');
    setDosage(item.dosage.toString());
    setCost(cfg.averageCost.toString());
    setMin(cfg.minStock.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    if (editingItemId) {
      const updatedItems = items.map(it => 
        it.id === editingItemId 
          ? { ...it, name, unit, manufacturer, dosage: parseFloat(dosage) } 
          : it
      );
      
      const updatedConfigs = itemConfigs.map(cfg => 
        (cfg.itemId === editingItemId && cfg.monthIndex === selectedMonth)
          ? { ...cfg, averageCost: parseFloat(cost), minStock: parseInt(min) }
          : cfg
      );
      
      onUpdateData(updatedItems, updatedConfigs);
    } else {
      const id = crypto.randomUUID();
      const newItem = { id, name, unit, manufacturer, dosage: parseFloat(dosage) };
      const nConfigs = [...itemConfigs];
      for (let m = 0; m < 12; m++) {
        nConfigs.push({ itemId: id, monthIndex: m, averageCost: parseFloat(cost), minStock: parseInt(min) });
      }
      onUpdateData([...items, newItem], nConfigs);
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 flex items-center justify-between">
        <h2 className="text-xl font-bold text-emerald-900">Catálogo de Itens</h2>
        <div className="flex items-center space-x-2">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configurar Mês:</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))} 
            className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-bold text-sm outline-none text-emerald-900"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!readOnly && (
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-emerald-50 h-fit shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center uppercase text-xs tracking-wider">
              {editingItemId ? (
                <>
                  <svg className="w-4 h-4 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Editar Item
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  Cadastrar Novo Item
                </>
              )}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome do Item</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="" className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Fornecedor / Laboratório</label>
                <input type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Ex: MSD, Ceva, Zoetis" className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Apresentação</label>
                <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ex: Frasco 1000 doses" className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Doses/Unid</label>
                  <input type="number" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="" className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Custo Unit.</label>
                  <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium" required />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Estoque Mínimo</label>
                <input type="number" value={min} onChange={(e) => setMin(e.target.value)} placeholder="" className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium" required />
              </div>
              <div className="flex gap-2 pt-2">
                {editingItemId && (
                  <button type="button" onClick={resetForm} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                )}
                <button type="submit" className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 uppercase tracking-widest text-xs">
                  {editingItemId ? 'Salvar Alterações' : 'Cadastrar Item'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className={`${readOnly ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden`}>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Item / Fornecedor</th>
                <th className="px-6 py-4">Apresentação</th>
                <th className="px-6 py-4">Custo</th>
                <th className="px-6 py-4 text-center">Mínimo</th>
                {!readOnly && <th className="px-6 py-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(i => {
                const cfg = itemConfigs.find(c => c.itemId === i.id && c.monthIndex === selectedMonth) || { averageCost: 0, minStock: 0 };
                return (
                  <tr key={i.id} className={`hover:bg-gray-50/50 transition-colors ${editingItemId === i.id ? 'bg-emerald-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900 block uppercase tracking-tight">{i.name}</span>
                      {i.manufacturer && <span className="text-[10px] text-emerald-600 font-black uppercase tracking-widest opacity-70">{i.manufacturer}</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{i.unit} <span className="opacity-70">({i.dosage} doses)</span></td>
                    <td className="px-6 py-4 font-mono text-emerald-700 font-semibold">R$ {cfg.averageCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-700">{cfg.minStock}</td>
                    {!readOnly && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleEditClick(i)} 
                            className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                            title="Editar informações"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button 
                            onClick={() => setItemToDelete(i)} 
                            className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                            title="Excluir item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Confirmar Exclusão</h4>
            <p className="text-gray-500 text-sm mb-6 uppercase">Deseja remover permanentemente o item <span className="font-bold text-gray-800">{itemToDelete.name}</span>?</p>
            <div className="flex space-x-3">
              <button onClick={() => setItemToDelete(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={() => { onUpdateData(items.filter(it => it.id !== itemToDelete.id), itemConfigs.filter(it => it.itemId !== itemToDelete.id)); setItemToDelete(null); }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
