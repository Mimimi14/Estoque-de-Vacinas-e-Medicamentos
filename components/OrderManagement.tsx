
import React, { useState } from 'react';
import { Item, Order, OrderStatus, OrderItem } from '../types';

interface OrderManagementProps {
  items: Item[];
  orders: Order[];
  onAddOrder: (o: Order) => void;
  onUpdateOrder: (o: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  readOnly?: boolean;
}

const formatDateBR = (dateStr: string | undefined) => {
  if (!dateStr) return '---';
  const parts = dateStr.split('-');
  if (parts.length === 2) {
    const [year, month] = parts;
    return `${month}/${year}`;
  }
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const OrderManagement: React.FC<OrderManagementProps> = ({ items, orders, onAddOrder, onUpdateOrder, onDeleteOrder, readOnly }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  
  const [requestName, setRequestName] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [formItems, setFormItems] = useState<{ itemId: string; quantity: string }[]>([{ itemId: '', quantity: '' }]);
  const [receiptData, setReceiptData] = useState<Record<string, { date: string; batch: string; expiry: string }>>({});

  const handleCreateOrUpdateOrder = (e: React.FormEvent) => {
    e.preventDefault(); if (readOnly) return;
    const valid = formItems.filter(f => f.itemId && f.quantity);
    if (!requestName || !expectedDate || valid.length === 0) return;
    
    const existingOrder = orders.find(o => o.id === editingOrderId);
    const orderData: Order = { 
      id: editingOrderId || crypto.randomUUID(), 
      requestName, 
      expectedDate, 
      status: existingOrder ? existingOrder.status : OrderStatus.PENDING, 
      items: valid.map(v => {
        const existingItem = existingOrder?.items.find(ei => ei.itemId === v.itemId);
        return { 
          itemId: v.itemId, 
          quantity: parseInt(v.quantity),
          actualDate: existingItem?.actualDate,
          batchNumber: existingItem?.batchNumber,
          expiryDate: existingItem?.expiryDate
        };
      }) 
    };

    if (editingOrderId) {
      onUpdateOrder(orderData);
      setEditingOrderId(null);
    } else {
      onAddOrder(orderData);
    }
    
    setRequestName(''); setExpectedDate(''); setFormItems([{ itemId: '', quantity: '' }]);
  };

  const handleEditClick = (order: Order) => {
    setEditingOrderId(order.id);
    setRequestName(order.requestName);
    setExpectedDate(order.expectedDate);
    setFormItems(order.items.map(i => ({ itemId: i.itemId, quantity: i.quantity.toString() })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReceipt = (order: Order) => {
    setSelectedOrder(order);
    const initialReceipt: Record<string, { date: string; batch: string; expiry: string }> = {};
    order.items.forEach(item => {
      initialReceipt[item.itemId] = { 
        date: item.actualDate || order.expectedDate, 
        batch: item.batchNumber || '', 
        expiry: item.expiryDate || '' 
      };
    });
    setReceiptData(initialReceipt);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 animate-in fade-in duration-300">
          <h3 className="text-lg font-bold text-gray-900 mb-6 uppercase tracking-tight flex items-center">
            {editingOrderId ? (
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            ) : (
              <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {editingOrderId ? 'Editar Solicitação de Itens' : 'Nova Solicitação de Itens'}
          </h3>
          <form onSubmit={handleCreateOrUpdateOrder} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Identificação da Solicitação</label>
                <input type="text" value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Ex: Pedido Janeiro" className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-emerald-500 font-medium" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Previsão de Entrega</label>
                <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-emerald-500 font-medium" required />
              </div>
            </div>
            {formItems.map((fi, idx) => (
              <div key={idx} className="flex space-x-2 items-end bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Item</label>
                  <select value={fi.itemId} onChange={(e) => { const n = [...formItems]; n[idx].itemId = e.target.value; setFormItems(n); }} className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-emerald-500 font-medium">
                    <option value="">Selecione um item...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.manufacturer || 'N/A'})</option>)}
                  </select>
                </div>
                <div className="w-32 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Quantidade</label>
                  <input type="number" value={fi.quantity} onChange={(e) => { const n = [...formItems]; n[idx].quantity = e.target.value; setFormItems(n); }} placeholder="0" className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:border-emerald-500 font-medium" />
                </div>
                <button type="button" onClick={() => setFormItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
            <div className="flex gap-4">
              <button type="button" onClick={() => setFormItems([...formItems, { itemId: '', quantity: '' }])} className="text-emerald-600 font-bold flex items-center text-xs uppercase tracking-widest hover:text-emerald-700">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Adicionar Item
              </button>
              {editingOrderId && (
                <button type="button" onClick={() => { setEditingOrderId(null); setRequestName(''); setExpectedDate(''); setFormItems([{ itemId: '', quantity: '' }]); }} className="text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600">
                  Cancelar Edição
                </button>
              )}
            </div>
            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all uppercase tracking-widest text-sm">
              {editingOrderId ? 'Salvar Alterações' : 'Confirmar Solicitação'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
            <tr>
              <th className="px-6 py-4">Solicitação</th>
              <th className="px-6 py-4">Itens / Fornecedor</th>
              <th className="px-6 py-4 text-center">Lote / Validade</th>
              <th className="px-6 py-4 text-center">Status</th>
              {!readOnly && <th className="px-6 py-4 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.slice().reverse().map(o => (
              <tr key={o.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900 uppercase tracking-tight">{o.requestName}</div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">Previsão: {formatDateBR(o.expectedDate)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-3">
                    {o.items.map(oi => {
                      const item = items.find(i => i.id === oi.itemId);
                      return (
                        <div key={oi.itemId} className="flex flex-col">
                          <span className="font-bold text-emerald-950 uppercase text-xs leading-tight">{item?.name}</span>
                          <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest opacity-80">
                            {item?.manufacturer || 'N/A'} - {oi.quantity} {item?.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="space-y-3">
                    {o.items.map(oi => (
                      <div key={oi.itemId} className="flex flex-col items-center">
                        <span className="text-[10px] font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mb-0.5 min-w-[60px]">
                          {oi.batchNumber || '---'}
                        </span>
                        <span className={`text-[9px] font-bold ${oi.expiryDate ? 'text-gray-700' : 'text-gray-300'}`}>
                          {oi.expiryDate ? formatDateBR(oi.expiryDate) : 'Pendente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${o.status === OrderStatus.PENDING ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    {o.status}
                  </span>
                </td>
                {!readOnly && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Seta Azul: Mostrar apenas em Pendentes */}
                      {o.status === OrderStatus.PENDING && (
                        <button 
                          onClick={() => handleEditClick(o)} 
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Editar solicitação"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      
                      {/* Seta Vermelha: Edição de dados do pedido/recebimento */}
                      <button 
                        onClick={() => handleOpenReceipt(o)} 
                        className={`p-1.5 rounded-lg transition-all ${o.status === OrderStatus.PENDING ? 'text-emerald-500 bg-emerald-50 border border-emerald-100' : 'text-emerald-600 hover:bg-emerald-50'}`} 
                        title={o.status === OrderStatus.PENDING ? "Receber Pedido" : "Editar Dados de Recebimento"}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>

                      <button onClick={() => onDeleteOrder(o.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl p-0 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 bg-emerald-800/10 text-emerald-900 hover:bg-emerald-800/20 rounded-full transition-colors z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="bg-emerald-900 p-10 pb-12 flex items-center text-white">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mr-6">
                 <svg className="w-6 h-6 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-1">
                  {selectedOrder.status === OrderStatus.RECEIVED ? 'Ajustar Dados de Recebimento' : 'Recebimento de Pedido'}
                </p>
                <h4 className="text-2xl font-black uppercase tracking-tight">{selectedOrder.requestName}</h4>
              </div>
            </div>
            
            <div className="p-10 -mt-6 bg-white rounded-t-[3rem] space-y-8 max-h-[60vh] overflow-y-auto">
              {selectedOrder.items.map(item => {
                const itemDetails = items.find(i => i.id === item.itemId);
                return (
                  <div key={item.itemId} className="bg-gray-50/80 p-6 rounded-[2rem] border border-gray-100 space-y-5">
                    <div className="flex justify-between items-center border-b border-gray-200/60 pb-4">
                      <div className="flex items-center">
                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full mr-3"></div>
                        <div>
                          <h5 className="font-black text-emerald-900 uppercase tracking-tight text-base leading-tight">{itemDetails?.name}</h5>
                          <p className="text-[9px] text-emerald-600 font-bold uppercase">{itemDetails?.manufacturer || 'N/A'}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-emerald-700 uppercase bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">Qtd: {item.quantity}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Data Real</label>
                        <input type="date" value={receiptData[item.itemId]?.date || ''} onChange={(e) => setReceiptData(prev => ({...prev, [item.itemId]: {...prev[item.itemId], date: e.target.value}}))} className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-xs outline-none focus:border-emerald-500 font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Partida (Lote)</label>
                        <input type="text" placeholder="Lote" value={receiptData[item.itemId]?.batch || ''} onChange={(e) => setReceiptData(prev => ({...prev, [item.itemId]: {...prev[item.itemId], batch: e.target.value}}))} className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-xs outline-none focus:border-emerald-500 uppercase font-black" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Vencimento</label>
                        <input 
                          type="month" 
                          value={receiptData[item.itemId]?.expiry || ''} 
                          onChange={(e) => setReceiptData(prev => ({...prev, [item.itemId]: {...prev[item.itemId], expiry: e.target.value}}))} 
                          className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-xs outline-none focus:border-emerald-500 font-bold" 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-10 bg-gray-50 border-t border-gray-100 flex justify-end items-center space-x-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase text-[10px] tracking-[0.2em]">Cancelar</button>
              <button 
                onClick={() => { 
                  onUpdateOrder({
                    ...selectedOrder, 
                    status: OrderStatus.RECEIVED, 
                    items: selectedOrder.items.map(i => ({
                      ...i, 
                      batchNumber: receiptData[i.itemId]?.batch, 
                      actualDate: receiptData[i.itemId]?.date, 
                      expiryDate: receiptData[i.itemId]?.expiry
                    }))
                  }); 
                  setIsModalOpen(false); 
                }} 
                className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all uppercase text-xs tracking-widest"
              >
                Salvar Dados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
