
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
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const OrderManagement: React.FC<OrderManagementProps> = ({ items, orders, onAddOrder, onUpdateOrder, onDeleteOrder, readOnly }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [requestName, setRequestName] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [formItems, setFormItems] = useState<{ itemId: string; quantity: string }[]>([{ itemId: '', quantity: '' }]);
  const [receiptData, setReceiptData] = useState<Record<string, { date: string; batch: string; expiry: string }>>({});

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault(); if (readOnly) return;
    const valid = formItems.filter(f => f.itemId && f.quantity);
    if (!requestName || !expectedDate || valid.length === 0) return;
    onAddOrder({ id: crypto.randomUUID(), requestName, expectedDate, status: OrderStatus.PENDING, items: valid.map(v => ({ itemId: v.itemId, quantity: parseInt(v.quantity) })) });
    setRequestName(''); setExpectedDate(''); setFormItems([{ itemId: '', quantity: '' }]);
  };

  const handleOpenReceipt = (order: Order) => {
    setSelectedOrder(order);
    const initialReceipt: Record<string, { date: string; batch: string; expiry: string }> = {};
    order.items.forEach(item => {
      initialReceipt[item.itemId] = { date: order.expectedDate, batch: '', expiry: '' };
    });
    setReceiptData(initialReceipt);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Nova Solicitação de Itens</h3>
          <form onSubmit={handleCreateOrder} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Identificação da Solicitação</label>
                <input type="text" value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Ex: Pedido Janeiro" className="w-full border rounded-xl p-3 outline-none focus:border-emerald-500" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Previsão de Entrega</label>
                <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-full border rounded-xl p-3 outline-none focus:border-emerald-500" required />
              </div>
            </div>
            {formItems.map((fi, idx) => (
              <div key={idx} className="flex space-x-2 items-end bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Item</label>
                  <select value={fi.itemId} onChange={(e) => { const n = [...formItems]; n[idx].itemId = e.target.value; setFormItems(n); }} className="w-full border rounded-lg p-2.5 outline-none focus:border-emerald-500">
                    <option value="">Selecione um item...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="w-32 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Quantidade</label>
                  <input type="number" value={fi.quantity} onChange={(e) => { const n = [...formItems]; n[idx].quantity = e.target.value; setFormItems(n); }} placeholder="0" className="w-full border rounded-lg p-2.5 outline-none focus:border-emerald-500" />
                </div>
                <button type="button" onClick={() => setFormItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remover item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setFormItems([...formItems, { itemId: '', quantity: '' }])} className="text-emerald-600 font-bold flex items-center text-xs uppercase tracking-widest hover:text-emerald-700">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              Adicionar Item
            </button>
            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all uppercase tracking-widest text-sm">Confirmar Solicitação</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
            <tr><th className="px-6 py-4">Solicitação</th><th className="px-6 py-4">Itens</th><th className="px-6 py-4">Previsão</th><th className="px-6 py-4">Status</th>{!readOnly && <th className="px-6 py-4 text-right">Ações</th>}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.slice().reverse().map(o => (
              <tr key={o.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-bold text-gray-900 uppercase">{o.requestName}</td>
                <td className="px-6 py-4 font-medium text-gray-600">{o.items.length} item(ns)</td>
                <td className="px-6 py-4 font-mono text-xs">{formatDateBR(o.expectedDate)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${o.status === OrderStatus.PENDING ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    {o.status}
                  </span>
                </td>
                {!readOnly && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-4">
                      {o.status === OrderStatus.PENDING && (
                        <button onClick={() => handleOpenReceipt(o)} className="text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                          Confirmar Recebimento
                        </button>
                      )}
                      <button onClick={() => onDeleteOrder(o.id)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all" title="Excluir solicitação">
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
          <div className="bg-white w-full max-w-2xl p-0 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-emerald-900 p-8 flex justify-between items-center text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-1">Recebimento de Pedido</p>
                <h4 className="text-xl font-black uppercase tracking-tight">{selectedOrder.requestName}</h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-emerald-800 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
              {selectedOrder.items.map(item => {
                const itemDetails = items.find(i => i.id === item.itemId);
                return (
                  <div key={item.itemId} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <h5 className="font-black text-emerald-900 uppercase tracking-tight">{itemDetails?.name}</h5>
                      <span className="text-[10px] font-bold text-gray-400 uppercase bg-white px-2 py-1 rounded-lg border">Qtd: {item.quantity}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Data Efetiva</label>
                        <input type="date" value={receiptData[item.itemId]?.date || ''} onChange={(e) => setReceiptData(prev => ({...prev, [item.itemId]: {...prev[item.itemId], date: e.target.value}}))} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Lote</label>
                        <input type="text" placeholder="Número do Lote" value={receiptData[item.itemId]?.batch || ''} onChange={(e) => setReceiptData(prev => ({...prev, [item.itemId]: {...prev[item.itemId], batch: e.target.value}}))} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-emerald-500 uppercase font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Validade</label>
                        <input type="date" value={receiptData[item.itemId]?.expiry || ''} onChange={(e) => setReceiptData(prev => ({...prev, [item.itemId]: {...prev[item.itemId], expiry: e.target.value}}))} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end space-x-4">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase text-xs tracking-widest">Cancelar</button>
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
                className="bg-emerald-600 text-white px-10 py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all uppercase text-xs tracking-widest"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
