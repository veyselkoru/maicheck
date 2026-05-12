// src/pages/AuditsPage.tsx v3.1
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auditsApi, subApi, templatesApi } from '../lib/api';

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const YEARS = [2023, 2024, 2025, 2026, 2027];
const TL: Record<string,string> = { green:'🟢', yellow:'🟡', red:'🔴' };
const ST_COLORS: Record<string,string> = { BEKLIYOR:'bg-slate-100 text-slate-600', DEVAM_EDIYOR:'bg-blue-100 text-blue-700', TAMAMLANDI:'bg-green-100 text-green-700', IPTAL:'bg-red-100 text-red-600', KILITLI:'bg-purple-100 text-purple-700' };
const ST_LABELS: Record<string,string> = { BEKLIYOR:'Bekliyor', DEVAM_EDIYOR:'Devam Ediyor', TAMAMLANDI:'Tamamlandı', IPTAL:'İptal', KILITLI:'Kilitli 🔒' };

const now = new Date();

export default function AuditsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterSub, setFilterSub] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({
    subcontractorId: '', templateId: '', periodType: 'SINGLE',
    periodMonth: now.getMonth() + 1, periodYear: now.getFullYear(),
    startMonth: now.getMonth() + 1, startYear: now.getFullYear(),
    endMonth: now.getMonth() + 1, endYear: now.getFullYear(),
    auditorName: '',
  });

  const { data: audits = [], isLoading } = useQuery({ queryKey: ['audits', filterSub, filterStatus], queryFn: () => auditsApi.list({ ...(filterSub ? { subId: filterSub } : {}), ...(filterStatus ? { status: filterStatus } : {}) }) });
  const { data: subs = [] } = useQuery({ queryKey: ['subs'], queryFn: () => subApi.list() });
  const { data: templates = [] } = useQuery({ queryKey: ['templates'], queryFn: () => templatesApi.list() });

  const createMut = useMutation({
    mutationFn: (d: any) => auditsApi.create(d),
    onSuccess: (audit) => { qc.invalidateQueries({ queryKey: ['audits'] }); setModalOpen(false); nav(`/audits/${audit.id}/checklist`); },
  });

  const lockMut = useMutation({ mutationFn: (id: string) => auditsApi.lock(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['audits'] }) });
  const unlockMut = useMutation({ mutationFn: (id: string) => auditsApi.unlock(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['audits'] }) });

  const handleCreate = () => {
    const payload: any = { subcontractorId: form.subcontractorId, templateId: form.templateId, periodType: form.periodType, auditorName: form.auditorName };
    if (form.periodType === 'SINGLE') { payload.periodMonth = form.periodMonth; payload.periodYear = form.periodYear; }
    else { payload.startMonth = form.startMonth; payload.startYear = form.startYear; payload.endMonth = form.endMonth; payload.endYear = form.endYear; }
    createMut.mutate(payload);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Denetimler</h1>
          <p className="text-slate-500 text-sm">Alt işveren denetimlerini yönetin ve takip edin</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Yeni Denetim</button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 flex gap-3 flex-wrap">
        <select value={filterSub} onChange={e => setFilterSub(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none">
          <option value="">Tüm Alt İşverenler</option>
          {subs.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none">
          <option value="">Tüm Durumlar</option>
          {Object.entries(ST_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {(filterSub || filterStatus) && <button onClick={() => { setFilterSub(''); setFilterStatus(''); }} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">✕ Filtreyi Temizle</button>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {isLoading ? <div className="p-8 text-center text-slate-400">Yükleniyor...</div> :
        audits.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="text-4xl mb-2">✓</div>
            <div>Henüz denetim oluşturulmamış.</div>
            <button onClick={() => setModalOpen(true)} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">+ İlk Denetimi Oluştur</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500">
                <th className="text-left px-4 py-3 font-medium">Alt İşveren</th>
                <th className="text-left px-4 py-3 font-medium">Dönem</th>
                <th className="text-center px-4 py-3 font-medium">Risk</th>
                <th className="text-right px-4 py-3 font-medium">Uygun Değil</th>
                <th className="text-right px-4 py-3 font-medium">Kritik/Yüksek</th>
                <th className="text-center px-4 py-3 font-medium">Durum</th>
                <th className="text-center px-4 py-3 font-medium">İşlemler</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {audits.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{a.subcontractor?.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{a.template?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{a.periodLabel}</div>
                      {a.periodType === 'RANGE' && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Dönem Aralığı</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span title={`Risk: ${a.stats?.totalRisk}`}>{TL[a.trafficLight] || '—'} {a.stats?.totalRisk || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-500">{a.stats?.uygunDegil || 0}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700">{a.stats?.kritikYuksek || 0}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ST_COLORS[a.status] || 'bg-slate-100 text-slate-600'}`}>{ST_LABELS[a.status] || a.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center flex-wrap">
                        <button onClick={() => nav(`/audits/${a.id}/checklist`)} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100">Checklist</button>
                        <button onClick={() => nav(`/audits/${a.id}/summary`)} className="px-2 py-1 bg-slate-50 text-slate-600 rounded text-xs hover:bg-slate-100">Özet</button>
                        {a.isLocked
                          ? <button onClick={() => unlockMut.mutate(a.id)} className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs hover:bg-orange-100">🔓 Aç</button>
                          : <button onClick={() => { if (confirm('Denetimi kilitlemek istediğinizden emin misiniz?')) lockMut.mutate(a.id); }} className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100">🔒 Kilitle</button>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-700 mb-4 text-lg">Yeni Denetim Oluştur</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">Alt İşveren *</label>
                <select value={form.subcontractorId} onChange={e => setForm(p => ({ ...p, subcontractorId: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200">
                  <option value="">— Seçin —</option>
                  {subs.filter((s: any) => s.isActive).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block font-medium">Denetim Şablonu *</label>
                <select value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200">
                  <option value="">— Seçin —</option>
                  {templates.filter((t: any) => t.isActive).map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t._count?.items || 0} madde)</option>)}
                </select>
              </div>

              {/* Period Type */}
              <div>
                <label className="text-xs text-slate-500 mb-2 block font-medium">Dönem Türü *</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer ${form.periodType === 'SINGLE' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" value="SINGLE" checked={form.periodType === 'SINGLE'} onChange={() => setForm(p => ({ ...p, periodType: 'SINGLE' }))} className="accent-blue-600" />
                    <div><div className="text-sm font-medium">Tek Dönem</div><div className="text-xs text-slate-500">Tek ay/yıl</div></div>
                  </label>
                  <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer ${form.periodType === 'RANGE' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" value="RANGE" checked={form.periodType === 'RANGE'} onChange={() => setForm(p => ({ ...p, periodType: 'RANGE' }))} className="accent-blue-600" />
                    <div><div className="text-sm font-medium">Dönem Aralığı</div><div className="text-xs text-slate-500">Birden fazla ay</div></div>
                  </label>
                </div>
              </div>

              {/* Period inputs */}
              {form.periodType === 'SINGLE' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Ay</label>
                    <select value={form.periodMonth} onChange={e => setForm(p => ({ ...p, periodMonth: +e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                      {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Yıl</label>
                    <select value={form.periodYear} onChange={e => setForm(p => ({ ...p, periodYear: +e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                      {YEARS.map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Başlangıç Ay</label>
                      <select value={form.startMonth} onChange={e => setForm(p => ({ ...p, startMonth: +e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                        {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Başlangıç Yıl</label>
                      <select value={form.startYear} onChange={e => setForm(p => ({ ...p, startYear: +e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                        {YEARS.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Bitiş Ay</label>
                      <select value={form.endMonth} onChange={e => setForm(p => ({ ...p, endMonth: +e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                        {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Bitiş Yıl</label>
                      <select value={form.endYear} onChange={e => setForm(p => ({ ...p, endYear: +e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                        {YEARS.map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Period preview */}
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                    📅 {MONTHS[form.startMonth-1]} {form.startYear} – {MONTHS[form.endMonth-1]} {form.endYear}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Denetçi Adı</label>
                <input value={form.auditorName} onChange={e => setForm(p => ({ ...p, auditorName: e.target.value }))} placeholder="Denetçi adını girin..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleCreate} disabled={!form.subcontractorId || !form.templateId || createMut.isPending} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {createMut.isPending ? 'Oluşturuluyor...' : 'Denetim Oluştur'}
              </button>
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200">İptal</button>
            </div>
            {createMut.isError && <p className="text-red-500 text-sm mt-2">Hata: {(createMut.error as any)?.response?.data?.message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
