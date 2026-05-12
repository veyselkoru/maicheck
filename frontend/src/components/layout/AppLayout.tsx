// src/components/layout/AppLayout.tsx v3.1
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../lib/api';

const NAV = [
  { to:'/dashboard',      label:'Dashboard',            icon:'▦', section:'ana' },
  { to:'/audits',         label:'Denetimler',           icon:'✓', section:'ana' },
  { to:'/findings',       label:'Bulgular',             icon:'⚑', section:'ana', alert:true },
  { to:'/actions',        label:'Aksiyonlar',           icon:'✦', section:'ana' },
  { to:'/templates',      label:'Denetim Şablonları',  icon:'⊞', section:'yapılandırma' },
  { to:'/document-types', label:'Evrak Kataloğu',       icon:'📄', section:'yapılandırma' },
  { to:'/evidence',       label:'Evrak Arşivi',         icon:'🗂', section:'yapılandırma' },
  { to:'/subcontractors', label:'Alt İşverenler',       icon:'⬡', section:'yapılandırma' },
  { to:'/reports',        label:'Raporlar',             icon:'⎙', section:'araçlar' },
  { to:'/impact',         label:'Finansal Etki Motoru', icon:'₺', section:'araçlar' },
  { to:'/communication',  label:'İletişim Merkezi',     icon:'✉', section:'araçlar' },
  { to:'/settings',       label:'Ayarlar',              icon:'⚙', section:'araçlar' },
];

export default function AppLayout() {
  const { user, setAuth, logout } = useAuthStore();
  const navigate = useNavigate();

  useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me().then((u:any) => { setAuth(localStorage.getItem('maicheck_token')!, u); return u; }),
    enabled: !user && !!localStorage.getItem('maicheck_token'),
  });

  const sections = [
    { key:'ana', label:'Ana Menü' },
    { key:'yapılandırma', label:'Yönetim' },
    { key:'araçlar', label:'Araçlar' },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-[232px] bg-[#0B1E3D] flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white text-xs font-bold font-mono shrink-0">mAi</div>
            <div>
              <div className="text-white text-sm font-bold tracking-tight">mAicheck</div>
              <div className="text-white/35 text-[9px] uppercase tracking-widest">Workforce Compliance v3.1</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {sections.map(sec => (
            <div key={sec.key} className="mb-3">
              <div className="px-4 py-1.5 text-[9px] font-semibold text-white/30 uppercase tracking-widest">{sec.label}</div>
              {NAV.filter(n => n.section === sec.key).map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-4 py-2 mx-2 rounded-md text-[13px] transition-colors ${
                      isActive ? 'bg-white/10 text-white font-medium' : 'text-white/55 hover:bg-white/5 hover:text-white/80'
                    }`}>
                  <span className="text-[15px] w-4 text-center shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/8">
          <div className="text-white/55 text-xs mb-2">{user?.name} <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] ml-1">{user?.role}</span></div>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">Çıkış Yap</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-[#F4F7FB]">
        <Outlet />
      </main>
    </div>
  );
}
