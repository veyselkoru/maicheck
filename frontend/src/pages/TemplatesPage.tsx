// src/pages/TemplatesPage.tsx v3.0
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { templatesApi } from '../lib/api';
import type { AuditTemplate } from '../types';

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', purpose:'', sectorTag:'' });

  const { data:templates=[], isLoading } = useQuery<AuditTemplate[]>({ queryKey:['templates'], queryFn:templatesApi.list });

  const create = useMutation({
    mutationFn: () => templatesApi.create(form),
    onSuccess: () => { qc.invalidateQueries({queryKey:['templates']}); setCreating(false); setForm({name:'',description:'',purpose:'',sectorTag:''}); },
  });

  const clone = useMutation({
    mutationFn: (id:string) => templatesApi.clone(id),
    onSuccess: () => qc.invalidateQueries({queryKey:['templates']}),
  });

  const toggleActive = useMutation({
    mutationFn: ({id,isActive}:{id:string;isActive:boolean}) => templatesApi.update(id,{isActive}),
    onSuccess: () => qc.invalidateQueries({queryKey:['templates']}),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Denetim Şablonları</h1><p className="page-sub">Checklist şablonlarını yönetin ve özelleştirin</p></div>
        <button className="btn btn-primary" onClick={()=>setCreating(true)}>+ Yeni Şablon</button>
      </div>

      {creating && (
        <div className="card card-body mb-5">
          <h3 className="font-bold text-sm mb-3">Yeni Şablon</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Şablon Adı *</label>
              <input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Örn: Özel SGK Denetimi" />
            </div>
            <div className="col-span-2">
              <label className="label">Açıklama</label>
              <input className="input" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} />
            </div>
            <div>
              <label className="label">Kullanım Amacı</label>
              <input className="input" value={form.purpose} onChange={e=>setForm(p=>({...p,purpose:e.target.value}))} placeholder="Aylık denetim, özel kontrol..." />
            </div>
            <div>
              <label className="label">Sektör / Tip</label>
              <input className="input" value={form.sectorTag} onChange={e=>setForm(p=>({...p,sectorTag:e.target.value}))} placeholder="Genel, Temizlik, Güvenlik..." />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary" disabled={!form.name||create.isPending} onClick={()=>create.mutate()}>Oluştur</button>
            <button className="btn btn-secondary" onClick={()=>setCreating(false)}>İptal</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && <div className="col-span-3 flex justify-center py-10"><div className="w-6 h-6 border-2 border-slate-200 border-t-brand rounded-full animate-spin"/></div>}
        {templates.map((t:AuditTemplate) => (
          <div key={t.id} className={`card ${t.isDefault?'border-brand/30 bg-blue-50/30':''} ${!t.isActive?'opacity-60':''}`}>
            <div className="card-body">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-sm truncate">{t.name}</div>
                  {t.sectorTag && <div className="text-xs text-slate-400 mt-0.5">{t.sectorTag}</div>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {t.isDefault && <span className="badge badge-blue text-[10px]">Varsayılan</span>}
                  {!t.isActive && <span className="badge badge-gray text-[10px]">Pasif</span>}
                </div>
              </div>
              {t.description && <p className="text-xs text-slate-500 mb-3 leading-relaxed">{t.description}</p>}
              <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                <span className="font-semibold text-slate-600">{t._count?.items ?? 0} madde</span>
                {t._count?.audits !== undefined && <span>· {t._count.audits} denetimde kullanıldı</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Link to={`/templates/${t.id}`} className="btn btn-primary btn-xs">✎ Düzenle</Link>
                <button className="btn btn-secondary btn-xs" onClick={()=>clone.mutate(t.id)} disabled={clone.isPending}>📋 Kopyala</button>
                {!t.isDefault && (
                  <button className="btn btn-secondary btn-xs" onClick={()=>toggleActive.mutate({id:t.id,isActive:!t.isActive})}>
                    {t.isActive?'Pasife Al':'Aktife Al'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!isLoading && templates.length === 0 && (
          <div className="col-span-3 text-center py-10 text-slate-400">Henüz şablon bulunmuyor.</div>
        )}
      </div>
    </div>
  );
}
