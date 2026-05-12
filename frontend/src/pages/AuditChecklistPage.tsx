// src/pages/AuditChecklistPage.tsx v3.1
import { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditsApi, auditItemsApi, evidenceApi, reportsApi, impactApi } from '../lib/api';
import { RISK_LABELS, RISK_COLORS, COMPLIANCE_LABELS, COMPLIANCE_COLORS, ACTION_LABELS, ACTION_COLORS, formatDate } from '../lib/helpers';

const AREAS_ALL = 'Tümü';

type ComplianceVal = 'UYGUN' | 'KISMI' | 'UYGUN_DEGIL' | '';

export default function AuditChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const location = useLocation();
  const highlightItemId = (location.state as any)?.highlightItemId;

  const [filterArea, setFilterArea] = useState(AREAS_ALL);
  const [filterCompliance, setFilterCompliance] = useState<ComplianceVal>('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterCritical, setFilterCritical] = useState(false);
  const [filterMissingDoc, setFilterMissingDoc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [lockConfirm, setLockConfirm] = useState(false);

  const { data: audit, isLoading } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => auditsApi.get(id!),
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['audit-items', id],
    queryFn: () => auditItemsApi.list(id!),
    enabled: !!id,
  });

  const { data: impactParams = [] } = useQuery({
    queryKey: ['impact-params'],
    queryFn: () => impactApi.list(),
    select: (d: any) => d.parameters || [],
  });

  const updateMut = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) => auditItemsApi.update(itemId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['audit-items', id] }); qc.invalidateQueries({ queryKey: ['audit', id] }); setEditingId(null); },
  });

  const lockMut = useMutation({
    mutationFn: () => auditsApi.lock(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['audit', id] }); setLockConfirm(false); },
  });

  const unlockMut = useMutation({
    mutationFn: () => auditsApi.unlock(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit', id] }),
  });

  const handleUpload = useCallback(async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingItemId(itemId);
    const fd = new FormData();
    Array.from(files).forEach(f => fd.append('files', f));
    fd.append('auditItemId', itemId);
    fd.append('auditId', id!);
    try {
      await evidenceApi.upload(fd, (pct) => setUploadProgress(p => ({ ...p, [itemId]: pct })));
      qc.invalidateQueries({ queryKey: ['audit-items', id] });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Yükleme hatası');
    } finally {
      setUploadingItemId(null);
      setUploadProgress(p => { const n = { ...p }; delete n[itemId]; return n; });
    }
  }, [id, qc]);

  if (isLoading) return <div className="p-8 text-center text-slate-400">Yükleniyor...</div>;
  if (!audit) return <div className="p-8 text-center text-red-500">Denetim bulunamadı.</div>;

  const isLocked = audit.isLocked || audit.status === 'KILITLI';
  const areas = [AREAS_ALL, ...Array.from(new Set((items as any[]).map((i: any) => i.auditArea)))];

  const filtered = (items as any[]).filter((i: any) => {
    if (filterArea !== AREAS_ALL && i.auditArea !== filterArea) return false;
    if (filterCompliance && i.compliance !== filterCompliance) return false;
    if (filterRisk && i.riskLevel !== filterRisk) return false;
    if (filterCritical && !i.isCritical) return false;
    if (filterMissingDoc && !i.isDocumentRequired) return false;
    if (filterMissingDoc && i.isDocumentRequired && i.evidenceFiles?.length > 0) return false;
    return true;
  });

  const stats = {
    total: (items as any[]).length,
    uygun: (items as any[]).filter((i: any) => i.compliance === 'UYGUN').length,
    kismi: (items as any[]).filter((i: any) => i.compliance === 'KISMI').length,
    uygunDegil: (items as any[]).filter((i: any) => i.compliance === 'UYGUN_DEGIL').length,
    noDoc: (items as any[]).filter((i: any) => i.isDocumentRequired && (!i.evidenceFiles || i.evidenceFiles.length === 0)).length,
    kritik: (items as any[]).filter((i: any) => ['YUKSEK','KRITIK'].includes(i.riskLevel || '')).length,
  };

  function startEdit(item: any) {
    if (isLocked) return;
    setEditingId(item.id);
    setEditForm({
      compliance: item.compliance || '',
      riskLevel: item.riskLevel || '',
      riskScore: item.riskScore ?? '',
      findingText: item.findingText || '',
      correctiveActionText: item.correctiveActionText || '',
      responsiblePerson: item.responsiblePerson || '',
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '',
      actionStatus: item.actionStatus || '',
      closureNote: item.closureNote || '',
      estimatedFinancialImpact: item.estimatedFinancialImpact ?? '',
      financialImpactMethod: item.financialImpactMethod || '',
      financialImpactNote: item.financialImpactNote || '',
      impactParameterId: item.impactParameterId || '',
      subcontractorNote: item.subcontractorNote || '',
    });
  }

  function saveEdit() {
    const data: any = { ...editForm };
    if (data.riskScore !== '') data.riskScore = parseInt(data.riskScore);
    else delete data.riskScore;
    if (data.estimatedFinancialImpact !== '') data.estimatedFinancialImpact = parseFloat(data.estimatedFinancialImpact);
    else data.estimatedFinancialImpact = null;
    if (!data.compliance) delete data.compliance;
    if (!data.riskLevel) delete data.riskLevel;
    if (!data.actionStatus) delete data.actionStatus;
    if (!data.dueDate) data.dueDate = null;
    if (!data.impactParameterId) data.impactParameterId = null;
    updateMut.mutate({ itemId: editingId!, data });
  }

  const groupedByArea: Record<string, any[]> = {};
  filtered.forEach((item: any) => {
    if (!groupedByArea[item.auditArea]) groupedByArea[item.auditArea] = [];
    groupedByArea[item.auditArea].push(item);
  });

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <button onClick={() => nav('/audits')} className="text-xs text-slate-400 hover:text-slate-600 mb-1">← Denetimlere Dön</button>
          <h1 className="text-xl font-bold text-slate-800">{audit.subcontractor?.name}</h1>
          <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
            <span>{audit.periodLabel}</span>
            {audit.template && <><span>•</span><span>{audit.template.name}</span></>}
            {audit.auditorName && <><span>•</span><span>Denetçi: {audit.auditorName}</span></>}
            {isLocked && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">🔒 Kilitli</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => nav(`/audits/${id}/summary`)} className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm hover:bg-slate-200">📊 Özet</button>
          <button onClick={() => nav('/reports', { state: { auditId: id } })} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-100">📄 Rapor</button>
          {!isLocked
            ? <button onClick={() => setLockConfirm(true)} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm hover:bg-amber-100">🔒 Kilitle</button>
            : <button onClick={() => unlockMut.mutate()} disabled={unlockMut.isPending} className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-sm hover:bg-purple-100">🔓 Revizyona Aç</button>
          }
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {[
          { l: 'Toplam', v: stats.total, c: 'text-slate-700' },
          { l: 'Uygun', v: stats.uygun, c: 'text-green-600' },
          { l: 'Kısmi', v: stats.kismi, c: 'text-amber-600' },
          { l: 'Uygun Değil', v: stats.uygunDegil, c: 'text-red-600' },
          { l: 'Eksik Belge', v: stats.noDoc, c: 'text-orange-600' },
          { l: 'Kritik/Yüksek', v: stats.kritik, c: 'text-red-700' },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-lg border border-slate-200 p-2.5 text-center">
            <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
            <div className="text-xs text-slate-500">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 flex flex-wrap gap-2 items-center">
        <select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
          {areas.map(a => <option key={a} value={a}>{a === AREAS_ALL ? `Tüm Alanlar (${stats.total})` : a}</option>)}
        </select>
        <select value={filterCompliance} onChange={e => setFilterCompliance(e.target.value as ComplianceVal)} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
          <option value="">Tüm Uyum</option>
          <option value="UYGUN">Uygun</option>
          <option value="KISMI">Kısmi</option>
          <option value="UYGUN_DEGIL">Uygun Değil</option>
        </select>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
          <option value="">Tüm Risk</option>
          <option value="DUSUK">Düşük</option>
          <option value="ORTA">Orta</option>
          <option value="YUKSEK">Yüksek</option>
          <option value="KRITIK">Kritik</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={filterCritical} onChange={e => setFilterCritical(e.target.checked)} className="accent-red-500" />
          Yalnız Kritik
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={filterMissingDoc} onChange={e => setFilterMissingDoc(e.target.checked)} className="accent-orange-500" />
          Eksik Belge
        </label>
        <span className="ml-auto text-xs text-slate-400">{filtered.length} madde gösteriliyor</span>
      </div>

      {/* Items */}
      {Object.entries(groupedByArea).map(([area, areaItems]) => (
        <div key={area} className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 text-sm">{area}</h3>
            <span className="text-xs text-slate-500">{areaItems.length} madde</span>
          </div>
          <div className="divide-y divide-slate-100">
            {areaItems.map((item: any) => {
              const isEditing = editingId === item.id;
              const isHighlight = highlightItemId === item.id;
              const hasDoc = item.evidenceFiles?.length > 0;
              const isUploading = uploadingItemId === item.id;

              return (
                <div key={item.id} id={`item-${item.id}`} className={`p-3 transition-colors ${isHighlight ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'hover:bg-slate-50'}`}>
                  {!isEditing ? (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-slate-700">{item.orderNo}. {item.controlSubject}</span>
                          {item.isCritical && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-medium rounded border border-red-200">KRİTİK</span>}
                        </div>
                        {item.legalBasis && <div className="text-xs text-slate-400 mb-1.5">{item.legalBasis}</div>}
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {item.compliance && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COMPLIANCE_COLORS[item.compliance] || 'bg-slate-100 text-slate-600'}`}>{COMPLIANCE_LABELS[item.compliance]}</span>}
                          {item.riskLevel && <span className={`px-2 py-0.5 rounded-full text-xs ${RISK_COLORS[item.riskLevel] || ''}`}>{RISK_LABELS[item.riskLevel]}{item.riskScore ? ` (${item.riskScore})` : ''}</span>}
                          {item.actionStatus && <span className={`px-2 py-0.5 rounded-full text-xs ${ACTION_COLORS[item.actionStatus] || ''}`}>{ACTION_LABELS[item.actionStatus]}</span>}
                          {item.isDocumentRequired && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${hasDoc ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600 font-medium'}`}>
                              {hasDoc ? `📎 ${item.evidenceFiles.length} belge` : '⚠ Belge bekleniyor'}
                            </span>
                          )}
                        </div>
                        {item.findingText && <div className="text-xs text-slate-600 mt-1 bg-amber-50 border border-amber-100 rounded px-2 py-1">💬 {item.findingText}</div>}
                        {item.correctiveActionText && <div className="text-xs text-slate-600 mt-1 bg-blue-50 border border-blue-100 rounded px-2 py-1">✦ {item.correctiveActionText}</div>}
                        {item.responsiblePerson && <div className="text-xs text-slate-500 mt-1">👤 {item.responsiblePerson} {item.dueDate && `| Son: ${formatDate(item.dueDate)}`}</div>}
                        {item.estimatedFinancialImpact && <div className="text-xs text-red-600 mt-1 font-medium">₺ Tahmini Etki: {Number(item.estimatedFinancialImpact).toLocaleString('tr-TR')} TL</div>}
                      </div>
                      {!isLocked && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => startEdit(item)} className="px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100">Düzenle</button>
                          <label className={`px-2.5 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs cursor-pointer hover:bg-slate-100 ${isUploading ? 'opacity-50' : ''}`}>
                            {isUploading ? `${uploadProgress[item.id] || 0}%` : '📎'}
                            <input type="file" multiple className="hidden" accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.zip,.txt,.csv"
                              onChange={e => handleUpload(item.id, e.target.files)} disabled={isUploading} />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Edit Form */
                    <div className="space-y-3">
                      <div className="font-medium text-sm text-slate-700 mb-2">{item.orderNo}. {item.controlSubject}</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Uyum Durumu</label>
                          <select value={editForm.compliance} onChange={e => setEditForm((p: any) => ({ ...p, compliance: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
                            <option value="">— Seçin —</option>
                            <option value="UYGUN">Uygun</option>
                            <option value="KISMI">Kısmi</option>
                            <option value="UYGUN_DEGIL">Uygun Değil</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Risk Seviyesi</label>
                          <select value={editForm.riskLevel} onChange={e => setEditForm((p: any) => ({ ...p, riskLevel: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
                            <option value="">— Seçin —</option>
                            <option value="DUSUK">Düşük</option>
                            <option value="ORTA">Orta</option>
                            <option value="YUKSEK">Yüksek</option>
                            <option value="KRITIK">Kritik</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Risk Puanı</label>
                          <input type="number" min={1} max={10} value={editForm.riskScore} onChange={e => setEditForm((p: any) => ({ ...p, riskScore: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Aksiyon Durumu</label>
                          <select value={editForm.actionStatus} onChange={e => setEditForm((p: any) => ({ ...p, actionStatus: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
                            <option value="">— Seçin —</option>
                            <option value="ACIK">Açık</option>
                            <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                            <option value="TAMAMLANDI">Tamamlandı</option>
                            <option value="GECIKTI">Gecikti</option>
                            <option value="IPTAL">İptal</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Bulgu Açıklaması</label>
                        <textarea value={editForm.findingText} onChange={e => setEditForm((p: any) => ({ ...p, findingText: e.target.value }))} rows={2} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300 resize-none" placeholder="Bulgular, uygunsuzluk açıklaması..." />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">Düzeltici Aksiyon</label>
                        <textarea value={editForm.correctiveActionText} onChange={e => setEditForm((p: any) => ({ ...p, correctiveActionText: e.target.value }))} rows={2} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300 resize-none" placeholder="Önerilen düzeltici aksiyon..." />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Sorumlu Kişi</label>
                          <input value={editForm.responsiblePerson} onChange={e => setEditForm((p: any) => ({ ...p, responsiblePerson: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300" placeholder="Ad Soyad..." />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Son Tarih</label>
                          <input type="date" value={editForm.dueDate} onChange={e => setEditForm((p: any) => ({ ...p, dueDate: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Tahmini Finansal Etki (TL)</label>
                          <input type="number" value={editForm.estimatedFinancialImpact} onChange={e => setEditForm((p: any) => ({ ...p, estimatedFinancialImpact: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300" placeholder="0.00" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Finansal Etki Notu</label>
                          <input value={editForm.financialImpactNote} onChange={e => setEditForm((p: any) => ({ ...p, financialImpactNote: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300" placeholder="Hesaplama yöntemi, varsayımlar..." />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Etki Parametresi</label>
                          <select value={editForm.impactParameterId} onChange={e => setEditForm((p: any) => ({ ...p, impactParameterId: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300">
                            <option value="">— Manuel giriş —</option>
                            {(impactParams as any[]).map((p: any) => (
                              <option key={p.id} value={p.id}>{p.institution} — {p.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {editForm.actionStatus === 'TAMAMLANDI' && (
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">Kapanış Notu</label>
                          <input value={editForm.closureNote} onChange={e => setEditForm((p: any) => ({ ...p, closureNote: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 ring-blue-300" />
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button onClick={saveEdit} disabled={updateMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                          {updateMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200">İptal</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <div className="text-3xl mb-2">🔍</div>
          <div>Filtre kriterlerine uyan madde bulunamadı.</div>
        </div>
      )}

      {/* Lock Confirm Modal */}
      {lockConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="font-bold text-slate-800 mb-2">🔒 Denetimi Kilitle</h3>
            <p className="text-sm text-slate-600 mb-4">Kilitleme sonrası checklist değiştirilemez, belgeler silinemez. Sadece yeni versiyon/not eklenebilir. Bu işlem hukuki kayıt güvenliği için gereklidir.</p>
            <div className="flex gap-2">
              <button onClick={() => lockMut.mutate()} disabled={lockMut.isPending} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
                {lockMut.isPending ? 'Kilitleniyor...' : '🔒 Kilitle'}
              </button>
              <button onClick={() => setLockConfirm(false)} className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
