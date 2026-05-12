// src/pages/FindingsPage.tsx v3.1 — full interactive
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { findingsApi, subApi, auditsApi } from '../lib/api';
import { RISK_LABELS, RISK_COLORS, COMPLIANCE_LABELS, COMPLIANCE_COLORS, ACTION_LABELS, ACTION_COLORS, formatDate } from '../lib/helpers';

const SEV_LABELS: Record<string,string> = { DUSUK:'Düşük', ORTA:'Orta', YUKSEK:'Yüksek', KRITIK:'Kritik' };
const SEV_COLORS: Record<string,string> = { DUSUK:'bg-slate-100 text-slate-500', ORTA:'bg-amber-100 text-amber-700', YUKSEK:'bg-orange-100 text-orange-700', KRITIK:'bg-red-100 text-red-700 font-semibold' };

export default function FindingsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const locationState = (useLocation().state || {}) as any;

  const [filters, setFilters] = useState({
    subId: locationState.subId || '',
    auditId: locationState.auditId || '',
    severity: locationState.riskLevel === 'KRITIK' ? 'KRITIK' : '',
    status: locationState.status || '',
    area: locationState.area || '',
    compliance: locationState.compliance || '',
    hasDoc: '',
    page: 1,
  });

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({
    auditId: '', title: '', description: '', severity: 'ORTA',
    estimatedFinancialImpact: '', financialImpactNote: '',
  });
  const [editForm, setEditForm] = useState<any>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newActionText, setNewActionText] = useState('');
  const [newActionResponsible, setNewActionResponsible] = useState('');

  const { data: subs = [] } = useQuery({ queryKey: ['subs'], queryFn: subApi.list });
  const { data: audits = [] } = useQuery({ queryKey: ['audits'], queryFn: () => auditsApi.list() });

  const q = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v !== '' && v !== 1 && k !== 'page'));
  const { data, isLoading } = useQuery({
    queryKey: ['findings', filters],
    queryFn: () => findingsApi.list({ ...q, page: filters.page }),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => findingsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['findings'] }); setShowModal(false); setForm({ auditId:'', title:'', description:'', severity:'ORTA', estimatedFinancialImpact:'', financialImpactNote:'' }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => findingsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['findings'] }); setEditItem(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => findingsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['findings'] }),
  });

  const addActionMut = useMutation({
    mutationFn: ({ fid, data }: any) => findingsApi.update(fid, data), // we re-use update since actions are in finding
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['findings'] }); setNewActionText(''); setNewActionResponsible(''); },
  });

  const findings: any[] = data?.findings || [];
  const total: number = data?.total || 0;

  function openEdit(f: any) {
    setEditItem(f);
    setEditForm({ title: f.title, description: f.description || '', severity: f.severity, status: f.status, estimatedFinancialImpact: f.estimatedFinancialImpact ?? '', financialImpactNote: f.financialImpactNote || '' });
  }

  function handleCreate() {
    if (!form.auditId) return alert('Denetim seçin');
    if (!form.title.trim()) return alert('Başlık girin');
    const d: any = { ...form };
    if (d.estimatedFinancialImpact !== '') d.estimatedFinancialImpact = parseFloat(d.estimatedFinancialImpact); else delete d.estimatedFinancialImpact;
    createMut.mutate(d);
  }

  function handleUpdate() {
    if (!editItem) return;
    const d: any = { ...editForm };
    if (d.estimatedFinancialImpact !== '') d.estimatedFinancialImpact = parseFloat(d.estimatedFinancialImpact); else d.estimatedFinancialImpact = null;
    updateMut.mutate({ id: editItem.id, data: d });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bulgular</h1>
          <p className="text-slate-500 text-sm">{total} bulgu</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Bulgu Ekle</button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Alt İşveren</label>
            <select value={filters.subId} onChange={e => setFilters(p => ({ ...p, subId: e.target.value, page: 1 }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
              <option value="">Tümü</option>
              {(subs as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Uyum Durumu</label>
            <select value={filters.compliance} onChange={e => setFilters(p => ({ ...p, compliance: e.target.value, page: 1 }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
              <option value="">Tümü</option>
              <option value="UYGUN">Uygun</option>
              <option value="KISMI">Kısmi</option>
              <option value="UYGUN_DEGIL">Uygun Değil</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Önem Derecesi</label>
            <select value={filters.severity} onChange={e => setFilters(p => ({ ...p, severity: e.target.value, page: 1 }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
              <option value="">Tümü</option>
              <option value="DUSUK">Düşük</option>
              <option value="ORTA">Orta</option>
              <option value="YUKSEK">Yüksek</option>
              <option value="KRITIK">Kritik</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Durum</label>
            <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value, page: 1 }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
              <option value="">Tümü</option>
              <option value="ACIK">Açık</option>
              <option value="DEVAM_EDIYOR">Devam Ediyor</option>
              <option value="TAMAMLANDI">Tamamlandı</option>
              <option value="GECIKTI">Gecikti</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Alan</label>
            <input value={filters.area} onChange={e => setFilters(p => ({ ...p, area: e.target.value, page: 1 }))} placeholder="Alan adı..." className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Belge</label>
            <select value={filters.hasDoc} onChange={e => setFilters(p => ({ ...p, hasDoc: e.target.value, page: 1 }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
              <option value="">Tümü</option>
              <option value="true">Belgeli</option>
              <option value="false">Belgesiz</option>
            </select>
          </div>
        </div>
        {Object.values(filters).some(v => v !== '' && v !== 1) && (
          <button onClick={() => setFilters({ subId:'', auditId:'', severity:'', status:'', area:'', compliance:'', hasDoc:'', page:1 })} className="mt-2 text-xs text-blue-600 hover:underline">Filtreleri Temizle</button>
        )}
      </div>

      {/* Findings List */}
      <div className="bg-white rounded-xl border border-slate-200">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
        ) : findings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="text-3xl mb-2">📋</div>
            <div>Bulgu bulunamadı.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {findings.map((f: any) => (
              <div key={f.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${SEV_COLORS[f.severity] || ''}`}>{SEV_LABELS[f.severity]}</span>
                      {f.auditItem?.compliance && <span className={`px-2 py-0.5 rounded-full text-xs ${COMPLIANCE_COLORS[f.auditItem.compliance] || ''}`}>{COMPLIANCE_LABELS[f.auditItem.compliance]}</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${ACTION_COLORS[f.status] || ''}`}>{ACTION_LABELS[f.status]}</span>
                      {f.estimatedFinancialImpact && <span className="text-xs text-red-600 font-medium">₺{Number(f.estimatedFinancialImpact).toLocaleString('tr-TR')}</span>}
                    </div>
                    <div className="font-medium text-slate-800 text-sm mb-0.5">{f.title}</div>
                    {f.description && <div className="text-xs text-slate-500 mb-1">{f.description}</div>}
                    <div className="flex gap-3 text-xs text-slate-400 flex-wrap">
                      {f.audit?.subcontractor?.name && <span>🏢 {f.audit.subcontractor.name}</span>}
                      {f.audit?.periodLabel && <span>📅 {f.audit.periodLabel}</span>}
                      {f.auditItem?.auditArea && <span>📁 {f.auditItem.auditArea}</span>}
                      {f.auditItem?.responsiblePerson && <span>👤 {f.auditItem.responsiblePerson}</span>}
                      {f.auditItem?.dueDate && <span>🗓 Son: {formatDate(f.auditItem.dueDate)}</span>}
                    </div>
                    {/* Corrective Actions */}
                    {f.correctiveActions?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {f.correctiveActions.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs bg-blue-50 rounded px-2 py-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${ACTION_COLORS[a.status] || ''}`}>{ACTION_LABELS[a.status]}</span>
                            <span className="text-slate-600 flex-1">{a.actionText}</span>
                            {a.responsiblePerson && <span className="text-slate-400">— {a.responsiblePerson}</span>}
                            {a.dueDate && <span className="text-slate-400">{formatDate(a.dueDate)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {f.auditId && f.auditItemId && (
                      <button onClick={() => nav(`/audits/${f.auditId}/checklist`, { state: { highlightItemId: f.auditItemId } })} className="px-2.5 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs hover:bg-slate-100" title="Checklist'e Git">→ Checklist</button>
                    )}
                    <button onClick={() => openEdit(f)} className="px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100">Düzenle</button>
                    <button onClick={() => { if (confirm('Bu bulguyu silmek istediğinizden emin misiniz?')) deleteMut.mutate(f.id); }} className="px-2.5 py-1.5 bg-red-50 text-red-500 border border-red-200 rounded text-xs hover:bg-red-100">Sil</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Toplam {total} bulgu</span>
            <div className="flex gap-2">
              {filters.page > 1 && <button onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))} className="px-3 py-1.5 bg-slate-100 rounded hover:bg-slate-200">← Önceki</button>}
              <span className="px-3 py-1.5">Sayfa {filters.page}/{data.pages}</span>
              {filters.page < data.pages && <button onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))} className="px-3 py-1.5 bg-slate-100 rounded hover:bg-slate-200">Sonraki →</button>}
            </div>
          </div>
        )}
      </div>

      {/* New Finding Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <h3 className="font-bold text-slate-800 mb-4">+ Yeni Bulgu</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Denetim *</label>
                <select value={form.auditId} onChange={e => setForm((p: any) => ({ ...p, auditId: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300">
                  <option value="">— Denetim seçin —</option>
                  {(audits as any[]).map((a: any) => <option key={a.id} value={a.id}>{a.subcontractor?.name} — {a.periodLabel}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Başlık *</label>
                <input value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300" placeholder="Bulgu başlığı..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Açıklama</label>
                <textarea value={form.description} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} rows={3} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300 resize-none" placeholder="Detaylı açıklama..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Önem Derecesi</label>
                  <select value={form.severity} onChange={e => setForm((p: any) => ({ ...p, severity: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300">
                    <option value="DUSUK">Düşük</option>
                    <option value="ORTA">Orta</option>
                    <option value="YUKSEK">Yüksek</option>
                    <option value="KRITIK">Kritik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tahmini Etki (TL)</label>
                  <input type="number" value={form.estimatedFinancialImpact} onChange={e => setForm((p: any) => ({ ...p, estimatedFinancialImpact: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300" placeholder="0" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleCreate} disabled={createMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {createMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">İptal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5">
            <h3 className="font-bold text-slate-800 mb-4">Bulgu Düzenle</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Başlık *</label>
                <input value={editForm.title} onChange={e => setEditForm((p: any) => ({ ...p, title: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Açıklama</label>
                <textarea value={editForm.description} onChange={e => setEditForm((p: any) => ({ ...p, description: e.target.value }))} rows={3} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Önem</label>
                  <select value={editForm.severity} onChange={e => setEditForm((p: any) => ({ ...p, severity: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300">
                    <option value="DUSUK">Düşük</option>
                    <option value="ORTA">Orta</option>
                    <option value="YUKSEK">Yüksek</option>
                    <option value="KRITIK">Kritik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Durum</label>
                  <select value={editForm.status} onChange={e => setEditForm((p: any) => ({ ...p, status: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300">
                    <option value="ACIK">Açık</option>
                    <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                    <option value="TAMAMLANDI">Tamamlandı</option>
                    <option value="GECIKTI">Gecikti</option>
                    <option value="IPTAL">İptal</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tahmini Etki (TL)</label>
                  <input type="number" value={editForm.estimatedFinancialImpact} onChange={e => setEditForm((p: any) => ({ ...p, estimatedFinancialImpact: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Etki Notu</label>
                  <input value={editForm.financialImpactNote} onChange={e => setEditForm((p: any) => ({ ...p, financialImpactNote: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleUpdate} disabled={updateMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {updateMut.isPending ? 'Kaydediliyor...' : 'Güncelle'}
                </button>
                <button onClick={() => setEditItem(null)} className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">İptal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
