
import React, { useState } from 'react';
import { Item, Order, OrderStatus, OrderItem } from '../types';

interface OrderManagementProps {
  items: Item[];
  orders: Order[];
  onAddOrder: (o: Order) => void;
  onUpdateOrder: (o: Order) => void;
  onDeleteOrder: (orderId: string) => void;
}

const OrderManagement: React.FC<OrderManagementProps> = ({ items, orders, onAddOrder, onUpdateOrder, onDeleteOrder }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  
  const [requestName, setRequestName] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [formItems, setFormItems] = useState<{ itemId: string; quantity: string }[]>([
    { itemId: '', quantity: '' }
  ]);

  const [receiptData, setReceiptData] = useState<Record<string, { date: string; batch: string; expiry: string }>>({});

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const pluralizeUnit = (unit: string, quantity: number) => {
    if (!unit) return '';
    if (quantity <= 1) return unit;
    
    const lowerUnit = unit.toLowerCase();
    if (lowerUnit.endsWith('a') || lowerUnit.endsWith('o') || lowerUnit.endsWith('e')) {
      return `${unit}s`;
    }
    if (lowerUnit.endsWith('l')) {
      return unit.slice(0, -1) + 'is';
    }
    if (lowerUnit.endsWith('r') || lowerUnit.endsWith('z')) {
      return `${unit}es`;
    }
    return `${unit}s`;
  };

  const handleAddItemRow = () => {
    setFormItems([...formItems, { itemId: '', quantity: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter((_, i) => i !== index));
    }
  };

  const handleUpdateItemRow = (index: number, field: 'itemId' | 'quantity', value: string) => {
    const next = [...formItems];
    next[index][field] = value;
    setFormItems(next);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestName || !expectedDate) return;
    
    const validItems = formItems.filter(fi => fi.itemId && fi.quantity);
    if (validItems.length === 0) return;

    const order: Order = {
      id: crypto.randomUUID(),
      requestName: requestName,
      expectedDate: expectedDate,
      status: OrderStatus.PENDING,
      items: validItems.map(vi => ({
        itemId: vi.itemId,
        quantity: parseInt(vi.quantity)
      }))
    };

    onAddOrder(order);
    setRequestName('');
    setExpectedDate('');
    setFormItems([{ itemId: '', quantity: '' }]);
  };

  const openReceiptModal = (order: Order) => {
    setSelectedOrder(order);
    const initialData: Record<string, { date: string; batch: string; expiry: string }> = {};
    
    order.items.forEach(item => {
      initialData[item.itemId] = {
        date: order.expectedDate,
        batch: '',
        expiry: ''
      };
    });
    
    setReceiptData(initialData);
    setIsModalOpen(true);
  };

  const handleUpdateReceiptItem = (itemId: string, field: 'date' | 'batch' | 'expiry', value: string) => {
    setReceiptData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const handleConfirmReceipt = () => {
    if (!selectedOrder) return;
    
    const updated: Order = {
      ...selectedOrder,
      status: OrderStatus.RECEIVED,
      items: selectedOrder.items.map(item => ({
        ...item,
        actualDate: receiptData[item.itemId].date,
        batchNumber: receiptData[item.itemId].batch,
        expiryDate: receiptData[item.itemId].expiry
      }))
    };

    onUpdateOrder(updated);
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const confirmDelete = () => {
    if (orderToDelete) {
      onDeleteOrder(orderToDelete.id);
      setOrderToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Creation Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Nova Solicitação de Itens
        </h3>
        <form onSubmit={handleCreateOrder} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Identificação / Nome da Solicitação</label>
              <input 
                type="text"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                placeholder="Ex: Ceva Janeiro/26"
                className="w-full bg-emerald-50/30 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Data Prevista para Chegada</label>
              <input 
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Lista de Itens</label>
                <button 
                  type="button" 
                  onClick={handleAddItemRow}
                  className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  Adicionar outro Item
                </button>
             </div>
             
             <div className="space-y-3">
               {formItems.map((formItem, index) => (
                 <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end bg-gray-50/50 p-3 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-1">
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Medicamento / Vacina</label>
                      <select 
                        value={formItem.itemId}
                        onChange={(e) => handleUpdateItemRow(index, 'itemId', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      >
                        <option value="">Selecione...</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name} {i.manufacturer ? `(${i.manufacturer})` : ''}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Quantidade (Unid)</label>
                      <input 
                        type="number"
                        value={formItem.quantity}
                        onChange={(e) => handleUpdateItemRow(index, 'quantity', e.target.value)}
                        placeholder="0"
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button 
                        type="button"
                        onClick={() => handleRemoveItemRow(index)}
                        disabled={formItems.length === 1}
                        className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                 </div>
               ))}
             </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-100 flex items-center justify-center text-base"
          >
            {formItems.length > 1 ? 'Confirmar Solicitação em Lote' : 'Confirmar Solicitação'}
          </button>
        </form>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-6 py-4">Solicitação</th>
              <th className="px-6 py-4">Itens / Lote / Validade</th>
              <th className="px-6 py-4">Previsão</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.slice().reverse().map(order => (
              <tr key={order.id} className="hover:bg-gray-50/50 transition-all align-top">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{order.requestName}</div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">ID: {order.id.slice(0, 8)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-2">
                    {order.items.map((oi, idx) => {
                      const item = items.find(i => i.id === oi.itemId);
                      return (
                        <div key={idx} className="flex flex-col">
                          <div className="flex items-center space-x-1">
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-100">
                              {item?.name} ({oi.quantity} {pluralizeUnit(item?.unit || '', oi.quantity)})
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-1 pl-1">
                            {item?.manufacturer && (
                              <span className="bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100 text-[9px] text-emerald-800 font-bold uppercase">
                                Fab: {item.manufacturer}
                              </span>
                            )}
                            
                            {order.status === OrderStatus.RECEIVED && oi.batchNumber && (
                              <div className="flex items-center space-x-2 text-[9px] text-gray-400 font-medium">
                                <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">Lote: <span className="text-gray-600 font-bold">{oi.batchNumber}</span></span>
                                <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">Val: <span className="text-gray-600 font-bold">{formatDate(oi.expiryDate)}</span></span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium">{formatDate(order.expectedDate)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    order.status === OrderStatus.PENDING 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    {order.status === OrderStatus.PENDING && (
                      <button 
                        onClick={() => openReceiptModal(order)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-800 underline underline-offset-4 decoration-emerald-200"
                      >
                        Confirmar Recebimento
                      </button>
                    )}
                    {order.status === OrderStatus.RECEIVED && (
                      <span className="text-[10px] text-gray-400 flex items-center font-semibold">
                        <svg className="w-3.5 h-3.5 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        Efetivado
                      </span>
                    )}
                    <button 
                      onClick={() => setOrderToDelete(order)}
                      className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 max-h-[90vh] flex flex-col">
              <div className="bg-emerald-600 p-8 text-white flex-shrink-0">
                <div className="flex justify-between items-start">
                   <div>
                      <h4 className="text-2xl font-bold">Efetivação de Recebimento</h4>
                      <p className="text-emerald-100 opacity-90 text-sm mt-1">Solicitação: <span className="font-bold">{selectedOrder.requestName}</span></p>
                   </div>
                   <button 
                     onClick={() => setIsModalOpen(false)} 
                     className="bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full transition-colors flex items-center justify-center"
                   >
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                 {selectedOrder.items.map((item, idx) => {
                   const itemData = items.find(i => i.id === item.itemId);
                   const currentReceipt = receiptData[item.itemId];
                   const isExpectedDate = currentReceipt?.date === selectedOrder.expectedDate;

                   return (
                     <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                           <div className="flex items-center">
                              <span className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-sm mr-3 font-bold">{idx + 1}</span>
                              <div>
                                <h5 className="font-bold text-gray-800">{itemData?.name}</h5>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{itemData?.manufacturer || 'Sem Fabricante'}</p>
                              </div>
                           </div>
                           <span className="text-xs font-bold text-emerald-600 bg-white px-3 py-1 rounded-lg border border-emerald-100">
                             Qtd Solicitada: {item.quantity} {pluralizeUnit(itemData?.unit || '', item.quantity)}
                           </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1 relative">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Data Real de Chegada</label>
                              <div className="relative">
                                <input 
                                  type="date"
                                  value={currentReceipt?.date}
                                  onChange={(e) => handleUpdateReceiptItem(item.itemId, 'date', e.target.value)}
                                  className={`w-full border rounded-xl p-3 text-sm outline-none transition-all shadow-sm ${
                                    isExpectedDate 
                                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/10 text-emerald-900 font-bold' 
                                      : 'bg-white border-gray-200 focus:ring-1 focus:ring-emerald-500'
                                  }`}
                                />
                                {isExpectedDate && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                  </div>
                                )}
                              </div>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Nº do Lote / Partida</label>
                              <input 
                                type="text"
                                placeholder="LOTE-123X"
                                value={currentReceipt?.batch}
                                onChange={(e) => handleUpdateReceiptItem(item.itemId, 'batch', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm uppercase font-bold"
                              />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Data de Validade</label>
                              <input 
                                type="date"
                                value={currentReceipt?.expiry}
                                onChange={(e) => handleUpdateReceiptItem(item.itemId, 'expiry', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                              />
                           </div>
                        </div>
                     </div>
                   );
                 })}
              </div>

              <div className="p-8 border-t border-gray-100 flex-shrink-0 flex justify-end space-x-4 bg-gray-50/50">
                  <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl transition-all">Cancelar</button>
                  <button 
                    onClick={handleConfirmReceipt} 
                    className="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center"
                  >
                    {selectedOrder.items.length > 1 ? 'Confirmar Recebimento do Lote' : 'Confirmar Recebimento'}
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
             <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                   <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </div>
                <div>
                   <h4 className="text-2xl font-bold text-gray-900">Excluir Solicitação?</h4>
                   <p className="text-gray-500 mt-2">Deseja remover permanentemente a solicitação <span className="font-bold text-gray-800">"{orderToDelete.requestName}"</span>?</p>
                </div>
                <div className="flex space-x-3 pt-4">
                   <button onClick={() => setOrderToDelete(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all">Manter</button>
                   <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-100">Excluir</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
