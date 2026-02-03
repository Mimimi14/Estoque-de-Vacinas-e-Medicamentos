
import React, { useState } from 'react';
import { supabase } from '../supabase';

interface AuthProps {
  onLoginSuccess: (isReadOnly: boolean) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLoginSuccess(readOnlyMode);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Cadastro realizado! Agora você pode fazer login.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-emerald-600 p-8 text-white text-center">
          <div className="flex justify-center mb-4">
            <svg viewBox="0 0 100 100" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg">
              <path fill="#e30613" d="M50,88.5 C50,88.5 10,62 10,35.5 C10,17 26.5,10 40,10 C46.5,10 50,13.5 50,16.5 C50,13.5 53.5,10 60,10 C73.5,10 90,17 90,35.5 C90,62 50,88.5 50,88.5 Z"/>
              <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="900">Ad'oro</text>
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Controle de Estoque</h2>
          <p className="text-emerald-100 text-sm mt-1">Gestão de Vacinas e Medicamentos 2026</p>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
            {isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}
          </h3>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail Corporativo</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                required
              />
            </div>

            {isLogin && (
              <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 cursor-pointer select-none" onClick={() => setReadOnlyMode(!readOnlyMode)}>
                <input 
                  type="checkbox" 
                  checked={readOnlyMode} 
                  onChange={() => {}} 
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300"
                />
                <div>
                  <p className="text-xs font-bold text-emerald-900">Acessar em Modo Leitura</p>
                  <p className="text-[10px] text-emerald-600">Apenas visualização, sem permissão para alterar dados.</p>
                </div>
              </div>
            )}

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold border border-red-100">{error}</div>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-100 flex items-center justify-center disabled:opacity-50"
            >
              {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : (isLogin ? 'Entrar no Sistema' : 'Finalizar Cadastro')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
              {isLogin ? 'Ainda não tem conta? Cadastre-se' : 'Já possui conta? Faça Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
