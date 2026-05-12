// src/pages/ActionsPage.tsx v3.1
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { actionsApi, subApi } from '../lib/api';
import { ACTION_LABELS, ACTION_COLORS, formatDate } from '../lib/helpers';

export default function ActionsPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const locationState = (useLocation().state || {}) as any;
  const [filters, setFilters] = useState({ status: locationState.status||'', subId:'', page:1 });
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: subs=[] } = useQuery({ queryKey:['subs'], queryFn:subApi.list });
  const q = Object.fromEntries(Object.entries(filters).filter(([k,v])=>v!==''&&v!==1&&k!=='page'));
  const { data, isLoading } = useQuery({
    queryKey: ['actions', filters],
    queryFn: () => actionsApi.list({...q, page:filters.page}),
  });

  const updateMut = useMutation({
    mutationFn: ({id,data}:any) => actionsApi.update(id,data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['actions']}); setEditItem(null); },
  });

  const actions: any[] = (data as any)?.actions || [];
  const total: number = (data as any)?.total || 0;

  const today = new Date();
  function isOverdue(a: any) { return a.dueDate && new Date(a.dueDate) < today && a.status !== 'TAMAMLANDI' && a.status !== 'IPTAL'; }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-800">Aksiyonlar</h1>
        <p className="text-slate-500 text-sm">{total} aksiyon</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Durum</label>
            <select value={filters.status} onChange={e=>setFilters(p=>({...p,status:e.target.value,page:1}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none">
              <option value="">Tümü</option>
              <option value="ACIK">Açık</option>
              <option value="DEVAM_EDIYOR">Devam Ediyor</option>
              <option value="TAMAMLANDI">Tamamlandı</option>
              <option value="GECIKTI">Gecikti</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Alt İşveren</label>
            <select value={filters.subId} onChange={e=>setFilters(p=>({...p,subId:e.target.value,page:1}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none">
              <option value="">Tümü</option>
              {(subs as any[]).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={()=>setFilters({status:'GECIKTI',subId:'',page:1})} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded text-sm hover:bg-red-100">
              ⚠ Gecikmiş Aksiyonlar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
        ) : actions.length===0 ? (
          <div className="p-12 text-center text-slate-400"><div className="text-3xl mb-2">✦</div><div>Aksiyon bulunamadı.</div></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {actions.map((a:any) => (
              <div key={a.id} className={`p-4 hover:bg-slate-50 transition-colors ${isOverdue(a)?'border-l-4 border-red-400':''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${ACTION_COLORS[a.status]||''}`}>{ACTION_LABELS[a.status]}</span>
                      {isOverdue(a) && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">⚠ Gecikmiş</span>}
                    </div>
                    <div className="font-medium text-slate-800 text-sm mb-0.5">{a.actionText}</div>
                    <div className="flex gap-3 text-xs text-slate-400 flex-wrap">
                      {a.finding?.audit?.subcontractor?.name && <span>🏢 {a.finding.audit.subcontractor.name}</span>}
                      {a.responsiblePerson && <span>👤 {a.responsiblePerson}</span>}
                      {a.dueDate && <span className={`${isOverdue(a)?'text-red-500 font-medium':''}`}>🗓 Son: {formatDate(a.dueDate)}</span>}
                      {a.closedAt && <span className="text-green-500">✓ Kapatıldı: {formatDate(a.closedAt)}</span>}
                    </div>
                    {a.closureNote && <div className="mt-1 text-xs text-slate-500 bg-green-50 border border-green-100 rounded px-2 py-1">Kapanış: {a.closureNote}</div>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={()=>{ setEditItem(a); setEditForm({ status:a.status, responsiblePerson:a.responsiblePerson||'', dueDate:a.dueDate?a.dueDate.slice(0,10):'', closureNote:a.closureNote||'' }); }} className="px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100">Düzenle</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {data && (data as any).pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{total} aksiyon</span>
            <div className="flex gap-2">
              {filters.page>1&&<button onClick={()=>setFilters(p=>({...p,page:p.page-1}))} className="px-3 py-1.5 bg-slate-100 rounded hover:bg-slate-200">← Önceki</button>}
              {filters.page<(data as any).pages&&<button onClick={()=>setFilters(p=>({...p,page:p.page+1}))} className="px-3 py-1.5 bg-slate-100 rounded hover:bg-slate-200">Sonraki →</button>}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-bold text-slate-800 mb-4">Aksiyon Düzenle</h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">{editItem.actionText}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Durum</label>
                  <select value={editForm.status} onChange={e=>setEditForm((p:any)=>({...p,status:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none">
                    <option value="ACIK">Açık</option>
                    <option value="DEVAM_EDIYOR">Devam Ediyor</option>
                    <option value="TAMAMLANDI">Tamamlandı</option>
                    <option value="GECIKTI">Gecikti</option>
                    <option value="IPTAL">İptal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Son Tarih</label>
                  <input type="date" value={editForm.dueDate} onChange={e=>setEditForm((p:any)=>({...p,dueDate:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sorumlu Kişi</label>
                <input value={editForm.responsiblePerson} onChange={e=>setEditForm((p:any)=>({...p,responsiblePerson:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none" />
              </div>
              {editForm.status==='TAMAMLANDI' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kapanış Notu</label>
                  <textarea value={editForm.closureNote} onChange={e=>setEditForm((p:any)=>({...p,closureNote:e.target.value}))} rows={2} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none resize-none" />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={()=>updateMut.mutate({id:editItem.id,data:{...editForm,dueDate:editForm.dueDate||null}})} disabled={updateMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {updateMut.isPending ? 'Kaydediliyor...' : 'Güncelle'}
                </button>
                <button onClick={()=>setEditItem(null)} className="px-4 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">İptal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
