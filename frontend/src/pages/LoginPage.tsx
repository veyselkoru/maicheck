// src/pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@maicheck.com');
  const [password, setPassword] = useState('maicheck123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setAuth(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1E3D] to-[#142850] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand rounded-2xl mb-4">
            <span className="text-white font-bold font-mono text-lg">mAi</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">mAicheck</h1>
          <p className="text-white/40 text-sm mt-1">Alt İşveren Denetim Platformu</p>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-800 mb-5">Giriş Yap</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">E-posta</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">Şifre</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</div>}
            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-1">
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 font-semibold mb-1">Demo Hesaplar:</p>
            <p className="text-xs text-slate-500">admin@maicheck.com / maicheck123</p>
            <p className="text-xs text-slate-500">denetci@maicheck.com / maicheck123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
