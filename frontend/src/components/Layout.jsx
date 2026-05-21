import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FolderKanban, Users2, Target,
  UserCheck, Wallet, BarChart3, Settings2, LogOut, Menu, X, Mic,
} from 'lucide-react';

const navItems = [
  { to: '/',            label: 'Дашборд',    icon: LayoutDashboard, end: true },
  { to: '/projects',    label: 'Проекты',    icon: FolderKanban },
  { to: '/clients',     label: 'Клиенты',    icon: Users2 },
  { to: '/leads',       label: 'Лиды',       icon: Target },
  { to: '/employees',   label: 'Сотрудники', icon: UserCheck },
  { to: '/finance',     label: 'Финансы',    icon: Wallet },
  { to: '/analytics',   label: 'Аналитика',  icon: BarChart3 },
  { to: '/recordings',  label: 'Звонки',     icon: Mic },
  { to: '/settings',    label: 'Настройки',  icon: Settings2 },
];

function Avatar({ name, size = 8, className = '' }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colors = ['#76B900','#77216F','#0E8420','#006EAF','#AEA79F'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{ background: color, fontSize: size * 2 }}
    >
      {initials}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0F0F0F' }}>

      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col
        transition-transform duration-200
      `} style={{ background: '#080808', borderRight: '1px solid #212121' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 shrink-0" style={{ borderBottom: '1px solid #212121' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shrink-0"
            style={{ background: 'linear-gradient(135deg,#76B900,#77216F)' }}>
            <svg width="18" height="13" viewBox="0 0 36 26" fill="none">
              <path d="M2 2L9 24L18 8L27 24L34 2" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">WorkWork Studio</p>
            <p className="text-gray-600 text-xs mt-0.5">Управление студией</p>
          </div>
          <button className="ml-auto lg:hidden text-gray-500 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group relative
                ${isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}
              `}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary-600" />
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? 'bg-primary-600' : 'bg-white/5 group-hover:bg-white/10'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 shrink-0" style={{ borderTop: '1px solid #212121' }}>
          <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: '#0F0F0F' }}>
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'U')}&backgroundColor=76B900&fontFamily=Ubuntu&fontSize=38`}
              alt={user?.name}
              className="w-8 h-8 rounded-full shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-gray-600 text-xs truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} title="Выйти"
              className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden h-14 flex items-center px-4 gap-3 shrink-0"
          style={{ background: '#080808', borderBottom: '1px solid #212121' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu size={20} />
          </button>
          <span className="text-white font-semibold text-sm">Studio CRM</span>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
