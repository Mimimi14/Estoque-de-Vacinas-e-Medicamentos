
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const Support: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchMyInquiries();
  }, []);

  const fetchMyInquiries = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setHistory(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { error: insertError } = await supabase.from('inquiries').insert({
        user_id: user.id,
        full_name: fullName,
        email: user.email,
        subject: subject,
        message: message
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setFullName('');
      setSubject('');
      setMessage('');
      fetchMyInquiries();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-emerald-50">
        <h2 className="text-2xl font-bold text-emerald-900 mb-2">Suporte e Dúvidas</h2>
        <p className="text-gray-500 mb-8">Utilize este canal para reportar problemas, solicitar novos itens no catálogo ou tirar dúvidas sobre o controle de estoque.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Como devemos chamá-lo?"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assunto / Categoria</label>
              <select 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                required
              >
                <option value="">Selecione um assunto...</option>
                <option value="Dúvida Técnica">Dúvida Técnica</option>
                <option value="Erro no Sistema">Erro no Sistema (Bug)</option>
                <option value="Sugestão / Melhoria">Sugestão / Melhoria</option>
                <option value="Novo Item no Catálogo">Novo Item no Catálogo</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sua Mensagem / Detalhamento</label>
            <textarea 
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva aqui sua necessidade em detalhes..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              required
            ></textarea>
          </div>

          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
          {success && <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            Solicitação enviada com sucesso! Nossa equipe analisará em breve.
          </div>}

          <button 
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-100 flex items-center disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar Solicitação'}
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </form>
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-emerald-50 overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="text-lg font-bold text-emerald-900">Suas Solicitações Anteriores</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map((h) => (
              <div key={h.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-gray-800">{h.subject}</div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                    h.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                    h.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {h.status === 'pending' ? 'Pendente' : h.status === 'resolved' ? 'Resolvido' : 'Em Análise'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{h.message}</p>
                <span className="text-[10px] text-gray-400 font-medium">Enviado em: {new Date(h.created_at).toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
