// src/pages/DocumentTypesPage.tsx v3.0
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { docTypesApi } from '../lib/api';
import type { DocumentType } from '../types';

export default function DocumentTypesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name:'', code:'', category:'Bordro', description:'', defaultRequired:false, retentionMonths:84, maxFileSizeMb:100 });

  const { data, isLoading } = useQuery({ queryKey:['doc-types'], queryFn:()=>docTypesApi.list() });
  const items: DocumentType[] = data?.items || [];
  const grouped: Record<string,DocumentType[]> = data?.grouped || {};

  const create = useMutation({
    mutationFn: () => docTypesApi.create(form),
    onSuccess: () => { qc.invalidateQueries({queryKey:['doc-types']}); setCreating(false); setForm({name:'',code:'',category:'Bordro',description:'',defaultRequired:false,retentionMonths:84,maxFileSizeMb:100}); },
  });

  const CATS = ['Bordro','SGK','Vergi','Fesih','İSG','Diğer'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Evrak Kataloğu</h1><p className="page-sub">Belge türlerini yönetin — {items.length} belge türü kayıtlı</p></div>
        <button className="btn btn-primary" onClick={()=>setCreating(true)}>+ Yeni Belge Türü</button>
      </div>

      {creating && (
        <div className="card card-body mb-5">
          <h3 className="font-bold text-sm mb-3">Yeni Belge Türü</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Belge Adı *</label><input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
            <div><label className="label">Belge Kodu *</label><input className="input" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="PUANTAJ, SGK_ODEME..." /></div>
            <div><label className="label">Kategori *</label>
              <select className="select" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                {CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Saklama Süresi (Ay)</label><input className="input" type="number" value={form.retentionMonths} onChange={e=>setForm(p=>({...p,retentionMonths:+e.target.value}))} /></div>
            <div className="col-span-2"><label className="label">Açıklama</label><input className="input" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} /></div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" checked={form.defaultRequired} onChange={e=>setForm(p=>({...p,defaultRequired:e.target.checked}))} className="rounded" />
              <label className="text-sm">Varsayılan olarak zorunlu</label>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary btn-sm" disabled={!form.name||!form.code||create.isPending} onClick={()=>create.mutate()}>Oluştur</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>setCreating(false)}>İptal</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-slate-200 border-t-brand rounded-full animate-spin"/></div>
      ) : (
        <div className="space-y-5">
          {CATS.map(cat => {
            const catItems = grouped[cat] || [];
            if (catItems.length === 0) return null;
            return (
              <div key={cat} className="card">
                <div className="card-header">
                  <h3 className="card-title">{cat} Belgeleri</h3>
                  <span className="badge badge-blue text-xs">{catItems.length} tür</span>
                </div>
                <div className="table-wrap">
                  <table className="tbl">
                    <thead><tr><th>Belge Adı</th><th>Kod</th><th>Zorunlu</th><th>Saklama</th><th>Aktif</th></tr></thead>
                    <tbody>
                      {catItems.map((d:DocumentType)=>(
                        <tr key={d.id}>
                          <td className="font-medium">{d.name}</td>
                          <td className="font-mono text-xs text-slate-500">{d.code}</td>
                          <td>{d.defaultRequired?<span className="badge badge-red text-xs">Zorunlu</span>:<span className="text-slate-400 text-xs">Opsiyonel</span>}</td>
                          <td className="text-xs text-slate-500">{(d as any).retentionMonths??84} ay</td>
                          <td>{d.isActive?<span className="badge badge-green text-xs">Aktif</span>:<span className="badge badge-gray text-xs">Pasif</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
