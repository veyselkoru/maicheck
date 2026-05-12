// src/pages/SettingsPage.tsx v3.1 — logo upload + company settings
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi, subApi } from '../lib/api';

export default function SettingsPage() {
  const qc = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string|null>(null);
  const [logoFile, setLogoFile] = useState<File|null>(null);
  const [saved, setSaved] = useState(false);

  const { data: company, isLoading } = useQuery({ queryKey:['company-me'], queryFn:()=>companiesApi.me() });

  const uploadLogoMut = useMutation({
    mutationFn: (f:File) => companiesApi.uploadLogo(f),
    onSuccess: () => { qc.invalidateQueries({queryKey:['company-me']}); setSaved(true); setTimeout(()=>setSaved(false),3000); },
  });

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  if (isLoading) return <div className="p-8 text-center text-slate-400">Yükleniyor...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Ayarlar</h1>
        <p className="text-slate-500 text-sm">Şirket bilgileri ve rapor markalama ayarları</p>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">✅ Değişiklikler kaydedildi.</div>
      )}

      {/* Company Logo */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <h2 className="font-semibold text-slate-700 mb-1">Asıl İşveren Logosu</h2>
        <p className="text-xs text-slate-500 mb-4">Raporlarda sol üst köşede görünür. PNG, JPG veya SVG (max 2MB)</p>

        <div className="flex items-start gap-5">
          <div className="w-32 h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
            {preview || company?.logoPath ? (
              <img src={preview || `/uploads/${company?.logoPath}`} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
            ) : (
              <div className="text-slate-400 text-3xl">🏢</div>
            )}
          </div>
          <div>
            <input ref={logoInputRef} type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" onChange={handleLogoChange} />
            <button onClick={()=>logoInputRef.current?.click()} className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm hover:bg-slate-200 mb-2 block">
              📁 Logo Seç
            </button>
            {logoFile && (
              <div className="mb-2">
                <div className="text-xs text-slate-500">Seçilen: {logoFile.name}</div>
                <button onClick={()=>uploadLogoMut.mutate(logoFile)} disabled={uploadLogoMut.isPending} className="mt-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {uploadLogoMut.isPending ? 'Yükleniyor...' : '⬆ Yükle'}
                </button>
              </div>
            )}
            {company?.logoPath && !logoFile && (
              <div className="text-xs text-green-600">✅ Logo yüklü</div>
            )}
            <div className="text-xs text-slate-400 mt-1">Raporlarda: Sol — mAiTechs — Sağ (alt işveren)</div>
          </div>
        </div>
      </div>

      {/* Platform Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <h2 className="font-semibold text-slate-700 mb-3">Platform Bilgileri</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Şirket</span>
            <span className="font-medium text-slate-700">{company?.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Vergi No</span>
            <span className="text-slate-700">{company?.taxNumber || '—'}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Plan</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">{company?.plan}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Rapor Alt Bilgisi</span>
            <span className="text-slate-600 italic text-xs">mAicheck by mAiTechs Smart Solutions</span>
          </div>
        </div>
      </div>

      {/* Demo Users */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 mb-3">Demo Hesaplar</h2>
        <div className="space-y-2">
          {[
            { email:'admin@maicheck.com', role:'Admin', color:'bg-red-100 text-red-700' },
            { email:'denetci@maicheck.com', role:'Denetçi', color:'bg-blue-100 text-blue-700' },
            { email:'yonetici@maicheck.com', role:'Yönetici', color:'bg-purple-100 text-purple-700' },
          ].map(u=>(
            <div key={u.email} className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-mono text-xs">{u.email}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">maicheck123</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${u.color}`}>{u.role}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-400">Şifre değişimi şu aşamada devre dışıdır.</div>
      </div>
    </div>
  );
}
