import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Terminal } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#1C1C1C' }}>
      {/* BG pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #E95420 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #77216F 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #E95420 0%, #77216F 100%)' }}>
            <Terminal size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Studio CRM</h1>
          <p className="text-gray-500 text-sm mt-1">Войдите для продолжения</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7" style={{ background: '#272727', border: '1px solid #3D3D3D' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email" className="input" placeholder="admin@studio.kz"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required
              />
            </div>
            <div>
              <label className="label">Пароль</label>
              <input
                type="password" className="input" placeholder="••••••••"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span>⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-base">
              <LogIn size={18} />
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-5 font-mono">
            admin@studio.kz / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
