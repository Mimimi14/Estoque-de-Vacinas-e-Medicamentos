
import React from 'react';
import { ViewType } from '../types';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'inventory', label: 'Estoque', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { id: 'orders', label: 'Gestão de Pedidos', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'fiscal', label: 'Custos Fiscais', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'settings', label: 'Configurações', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.426-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'support', label: 'Suporte / Dúvidas', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  return (
    <nav className={`fixed left-0 top-0 h-full w-64 bg-emerald-900 text-white shadow-xl z-20 border-r border-emerald-800 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 h-full flex flex-col">
        {/* Cabeçalho alinhado à esquerda para dar espaço ao ícone na direita */}
        <div className="relative flex items-center justify-start mb-10 min-h-[64px] pl-2">
          <div className="text-left">
            <span className="font-bold text-[11px] leading-[1.3] tracking-[0.15em] uppercase text-white block">
              ESTOQUE DE<br/>VACINAS E<br/>MEDICAMENTOS
            </span>
          </div>
          
          {/* Botão posicionado na extremidade direita (Seta Azul) */}
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute right-0 p-2 hover:bg-emerald-800 rounded-lg text-emerald-100 transition-colors"
            title="Ocultar Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor"/>
              <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor"/>
              <rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <ul className="space-y-2 flex-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => {
                  setActiveView(item.id as ViewType);
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeView === item.id ? 'bg-emerald-700 text-white shadow-lg' : 'text-emerald-100/80 hover:bg-emerald-800/80 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                <span className="font-semibold text-sm">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        
        <div className="pt-6 border-t border-emerald-800 mt-6 text-center">
          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest opacity-50 italic">Gestão de Insumos Críticos</p>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
