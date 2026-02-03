
import React, { useState } from 'react';
import { Item, ItemMonthlyConfig } from '../types';

interface SettingsProps {
  items: Item[];
  itemConfigs: ItemMonthlyConfig[];
  selectedMonth: number;
  setSelectedMonth: (m: number) => void;
  onUpdateData: (items: Item[], configs: ItemMonthlyConfig[]) => void;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const Settings: React.FC<SettingsProps> = ({ items, itemConfigs, selectedMonth, setSelectedMonth, onUpdateData }) => {
  // Add New Item State
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [unit, setUnit] = useState('');
  const [cost, setCost] = useState('');
  const [min, setMin] = useState('');
  const [dosage, setDosage] = useState('');
  
  // Modals State
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  
  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editManufacturer, setEditManufacturer] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editMin, setEditMin] = useState('');
  const [editDosage, setEditDosage] = useState('');

  const getItemConfig = (itemId: string, month: number) => {
    return itemConfigs.find(c => c.itemId === itemId && c.monthIndex === month) || {
      itemId,
      monthIndex: month,
      averageCost: 0,
      minStock: 0
    };
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !unit || !cost || !min || !dosage) return;

    const itemId = crypto.randomUUID();
    const newItem: Item = {
      id: itemId,
      name,
      manufacturer,
      unit,
      dosage: parseFloat(dosage)
    };

    const newConfigs: ItemMonthlyConfig[] = [];
    for (let m = 0; m < 12; m++) {
      newConfigs.push({
        itemId,
        monthIndex: m,
        averageCost: parseFloat(cost),
        minStock: parseInt(min)
      });
    }

    onUpdateData([...items, newItem], [...itemConfigs, ...newConfigs]);
    setName('');
    setManufacturer('');
    setUnit('');
    setCost('');
    setMin('');
    setDosage('');
  };

  const openEditModal = (item: Item) => {
    const config = getItemConfig(item.id, selectedMonth);
    setItemToEdit(item);
    setEditName(item.name);
    setEditManufacturer(item.manufacturer || '');
    setEditUnit(item.unit);
    setEditCost(config.averageCost.toString());
    setEditMin(config.minStock.toString());
    setEditDosage(item.dosage.toString());
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToEdit || !editName || !editUnit || !editCost || !editMin || !editDosage) return;

    const updatedItems = items.map(i => i.id === itemToEdit.id ? {
      ...i,
      name: editName,
      manufacturer: editManufacturer,
      unit: editUnit,
      dosage: parseFloat(editDosage)
    } : i);

    const updatedConfigs = itemConfigs.map(c => 
      c.itemId === itemToEdit.id && c.monthIndex === selectedMonth 
        ? { ...c, averageCost: parseFloat(editCost), minStock: parseInt(editMin) }
        : c
    );

    onUpdateData(updatedItems, updatedConfigs);
    setItemToEdit(null);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      const updatedItems = items.filter(i => i.id !== itemToDelete.id);
      const updatedConfigs = itemConfigs.filter(c => c.itemId !== itemToDelete.id);
      onUpdateData(updatedItems, updatedConfigs);
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 flex items-center justify-between">
        <h2 className="text-xl font-bold text-emerald-900">Configurações do Catálogo</h2>
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-gray-400 uppercase">Editar Mês:</label>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-lg p-2 outline-none font-bold"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cadastrar Novo Item</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Nome do Medicamento/Vacina</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Innovax ND"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Fabricante</label>
                <input 
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="Ex: MSD, CEVA, BI"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500 font-medium uppercase"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Apresentação (Unidade)</label>
                <input 
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Ex: Ampola, Frasco, Caixa"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Dosagem (Doses por Unidade)</label>
                <input 
                  type="number"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="Ex: 4000"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Custo Unitário (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Estoque Mínimo</label>
                  <input 
                    type="number"
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                    placeholder="Ex: 2000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all mt-4"
              >
                Adicionar ao Catálogo
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
               <h3 className="text-lg font-bold text-gray-900">Itens Ativos - {MONTHS[selectedMonth]}</h3>
               <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">{items.length} Itens</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Unid / Dose</th>
                    <th className="px-6 py-4">Custo Unid</th>
                    <th className="px-6 py-4">Custo Dose</th>
                    <th className="px-6 py-4 text-center">Mínimo</th>
                    <th className="px-6 py-4 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => {
                    const config = getItemConfig(item.id, selectedMonth);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-800">{item.name}</div>
                          <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{item.manufacturer || '---'}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          {item.unit} / <span className="text-emerald-600 font-bold">{item.dosage} doses</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-bold">R$ {config.averageCost.toFixed(2)}</td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-emerald-700">R$ {(config.averageCost / item.dosage).toFixed(4)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-bold text-[10px]">{config.minStock}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button 
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="text-emerald-400 hover:text-emerald-600 transition-colors p-2 rounded-lg hover:bg-emerald-50"
                              title="Editar Item para este mês"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              type="button"
                              onClick={() => setItemToDelete(item)}
                              className="text-red-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
                              title="Excluir do Catálogo (Global)"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Edit Item Modal */}
        {itemToEdit && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-emerald-100 animate-in fade-in zoom-in duration-200">
              <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-bold">Editar Item - {MONTHS[selectedMonth]}</h4>
                  <p className="text-emerald-100 text-sm opacity-90">Atualize as informações para este mês específico.</p>
                </div>
                <button onClick={() => setItemToEdit(null)} className="hover:bg-emerald-700 p-1 rounded-lg transition-colors">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l18 18" /></svg>
                </button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Nome do Item (Global)</label>
                      <input 
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Fabricante (Global)</label>
                      <input 
                        type="text"
                        value={editManufacturer}
                        onChange={(e) => setEditManufacturer(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-emerald-500 font-bold uppercase"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Apresentação (Global)</label>
                      <input 
                        type="text"
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Dosagem (Global)</label>
                      <input 
                        type="number"
                        value={editDosage}
                        onChange={(e) => setEditDosage(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-emerald-600 uppercase">Custo Unitário em {MONTHS[selectedMonth]}</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={editCost}
                        onChange={(e) => setEditCost(e.target.value)}
                        className="w-full bg-emerald-50 border border-emerald-100 rounded-lg p-3 outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-emerald-600 uppercase">Mínimo em {MONTHS[selectedMonth]}</label>
                      <input 
                        type="number"
                        value={editMin}
                        onChange={(e) => setEditMin(e.target.value)}
                        className="w-full bg-emerald-50 border border-emerald-100 rounded-lg p-3 outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t border-gray-50 flex space-x-3">
                  <button 
                    type="button"
                    onClick={() => setItemToEdit(null)}
                    className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-200"
                  >
                    Salvar para {MONTHS[selectedMonth]}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {itemToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-150">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Confirmar Exclusão</h4>
                <p className="text-gray-600 text-sm mb-6">
                  Deseja excluir <strong>"{itemToDelete.name}"</strong>? Esta ação removerá o item de TODOS os meses.
                </p>
                <div className="flex space-x-3">
                  <button onClick={() => setItemToDelete(null)} className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm">Não, manter</button>
                  <button onClick={confirmDelete} className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors text-sm shadow-lg shadow-red-100">Sim, excluir</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
