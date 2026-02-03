
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

const OrderManagement: React.FC<OrderManagementProps> = ({ items, orders, onAddOrder, onUpdateOrder, onDeleteOrder, readOnly }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
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

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Nova Solicitação de Itens</h3>
          <form onSubmit={handleCreateOrder} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="text" value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Ex: Pedido Janeiro" className="border rounded-lg p-3" required />
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="border rounded-lg p-3" required />
            </div>
            {formItems.map((fi, idx) => (
              <div key={idx} className="flex space-x-2 items-end">
                <select value={fi.itemId} onChange={(e) => { const n = [...formItems]; n[idx].itemId = e.target.value; setFormItems(n); }} className="flex-1 border rounded-lg p-2.5">
                  <option value="">Selecione...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input type="number" value={fi.quantity} onChange={(e) => { const n = [...formItems]; n[idx].quantity = e.target.value; setFormItems(n); }} placeholder="Qtd" className="w-24 border rounded-lg p-2.5" />
                <button type="button" onClick={() => setFormItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev)} className="p-2 text-red-500">Remover</button>
              </div>
            ))}
            <button type="button" onClick={() => setFormItems([...formItems, { itemId: '', quantity: '' }])} className="text-emerald-600 font-bold">+ Adicionar Item</button>
            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold">Confirmar Solicitação</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
            <tr><th className="px-6 py-4">Solicitação</th><th className="px-6 py-4">Itens</th><th className="px-6 py-4">Previsão</th><th className="px-6 py-4">Status</th>{!readOnly && <th className="px-6 py-4 text-right">Ações</th>}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.slice().reverse().map(o => (
              <tr key={o.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-bold">{o.requestName}</td>
                <td className="px-6 py-4">{o.items.length} item(ns)</td>
                <td className="px-6 py-4">{o.expectedDate}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${o.status === OrderStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>{o.status}</span></td>
                {!readOnly && (
                  <td className="px-6 py-4 text-right space-x-2">
                    {o.status === OrderStatus.PENDING && <button onClick={() => { setSelectedOrder(o); setIsModalOpen(true); }} className="text-emerald-600 underline">Receber</button>}
                    <button onClick={() => onDeleteOrder(o.id)} className="text-red-400">Excluir</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg p-8 rounded-3xl">
            <h4 className="text-xl font-bold mb-4">Receber Pedido: {selectedOrder.requestName}</h4>
            <div className="space-y-4 mb-6">
              {selectedOrder.items.map(item => (
                <div key={item.itemId} className="space-y-2 border-b pb-2">
                  <p className="font-bold">{items.find(i => i.id === item.itemId)?.name}</p>
                  <input type="text" placeholder="Lote" onChange={(e) => setReceiptData(prev => ({...prev, [item.itemId]: {...prev[item.itemId], batch: e.target.value, date: selectedOrder.expectedDate}}))} className="w-full border p-2 rounded" />
                  <input type="date" placeholder="Validade" onChange={(e) => setReceiptData(prev => ({...prev, [item.itemId]: {...prev[item.itemId], expiry: e.target.value}}))} className="w-full border p-2 rounded" />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2">Cancelar</button>
              <button onClick={() => { onUpdateOrder({...selectedOrder, status: OrderStatus.RECEIVED, items: selectedOrder.items.map(i => ({...i, batchNumber: receiptData[i.itemId]?.batch, actualDate: receiptData[i.itemId]?.date, expiryDate: receiptData[i.itemId]?.expiry}))}); setIsModalOpen(false); }} className="bg-emerald-600 text-white px-4 py-2 rounded">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
