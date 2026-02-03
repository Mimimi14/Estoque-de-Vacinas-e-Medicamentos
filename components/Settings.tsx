
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

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const Settings: React.FC<SettingsProps> = ({ items, itemConfigs, selectedMonth, setSelectedMonth, onUpdateData, readOnly }) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [cost, setCost] = useState('');
  const [min, setMin] = useState('');
  const [dosage, setDosage] = useState('');
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault(); if (readOnly) return;
    const id = crypto.randomUUID();
    const newItem = { id, name, unit, dosage: parseFloat(dosage) };
    const nConfigs = [...itemConfigs];
    for (let m=0; m<12; m++) nConfigs.push({ itemId: id, monthIndex: m, averageCost: parseFloat(cost), minStock: parseInt(min) });
    onUpdateData([...items, newItem], nConfigs);
    setName(''); setUnit(''); setCost(''); setMin(''); setDosage('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 flex items-center justify-between">
        <h2 className="text-xl font-bold text-emerald-900">Catálogo de Itens</h2>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-bold">
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!readOnly && (
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-emerald-50 h-fit">
            <h3 className="font-bold mb-4">Cadastrar Novo Item</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="w-full border p-2.5 rounded-lg" required />
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unidade" className="w-full border p-2.5 rounded-lg" required />
              <input type="number" value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Doses/Unid" className="w-full border p-2.5 rounded-lg" required />
              <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Custo Unitário" className="w-full border p-2.5 rounded-lg" required />
              <input type="number" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Mínimo" className="w-full border p-2.5 rounded-lg" required />
              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">Cadastrar</button>
            </form>
          </div>
        )}

        <div className={`${readOnly ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white rounded-2xl border overflow-hidden`}>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
              <tr><th className="px-6 py-4">Item</th><th className="px-6 py-4">Apresentação</th><th className="px-6 py-4">Custo</th><th className="px-6 py-4 text-center">Mínimo</th>{!readOnly && <th className="px-6 py-4 text-center">Ações</th>}</tr>
            </thead>
            <tbody className="divide-y">
              {items.map(i => {
                const cfg = itemConfigs.find(c => c.itemId === i.id && c.monthIndex === selectedMonth) || {averageCost:0, minStock:0};
                return (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold">{i.name}</td>
                    <td className="px-6 py-4">{i.unit} ({i.dosage} doses)</td>
                    <td className="px-6 py-4 font-mono">R$ {cfg.averageCost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">{cfg.minStock}</td>
                    {!readOnly && <td className="px-6 py-4 text-center"><button onClick={() => setItemToDelete(i)} className="text-red-400">Excluir</button></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-8 rounded-2xl max-w-xs text-center">
            <h4 className="font-bold mb-4">Excluir {itemToDelete.name}?</h4>
            <div className="flex space-x-2">
              <button onClick={() => setItemToDelete(null)} className="flex-1 py-2 bg-gray-100 rounded">Cancelar</button>
              <button onClick={() => { onUpdateData(items.filter(it => it.id !== itemToDelete.id), itemConfigs.filter(it => it.itemId !== itemToDelete.id)); setItemToDelete(null); }} className="flex-1 py-2 bg-red-600 text-white rounded">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
