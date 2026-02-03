import React from 'react';
import { HistoryEntry } from '../types';

interface HistoryLogProps {
  history: HistoryEntry[];
  clearHistory: () => void;
}

const HistoryLog: React.FC<HistoryLogProps> = ({ history, clearHistory }) => {
  const getTypeBadge = (type: HistoryEntry['type']) => {
    switch (type) {
      case 'INVENTORY': return 'bg-blue-100 text-blue-700';
      case 'ORDER': return 'bg-emerald-100 text-emerald-700';
      case 'CATALOG': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-emerald-900">Rastreabilidade e Histórico</h2>
          <p className="text-sm text-gray-500">Registro completo de auditoria para fins de controle e conformidade.</p>
        </div>
        <button 
          onClick={() => { if(confirm('Limpar histórico permanentemente?')) clearHistory(); }}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs hover:bg-red-100 transition-colors"
        >
          Limpar Registros
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden">
        {history.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-gray-400 italic">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Ação</th>
                  <th className="px-6 py-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs whitespace-nowrap">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${getTypeBadge(entry.type)}`}>
                        {entry.type === 'INVENTORY' ? 'Estoque' : entry.type === 'ORDER' ? 'Pedido' : 'Catálogo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-800">{entry.action}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {entry.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryLog;