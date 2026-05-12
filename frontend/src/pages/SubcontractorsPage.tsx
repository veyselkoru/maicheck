// src/pages/SubcontractorsPage.tsx v3.0
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subApi } from '../lib/api';
import type { Subcontractor } from '../types';

export default function SubcontractorsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name:'', taxNumber:'', sgkSicilNo:'', workArea:'', responsiblePerson:'', email:'', phone:'', contractStart:'', contractEnd:'' });
  const { data:subs=[], isLoading } = useQuery<Subcontractor[]>({ queryKey:['subcontractors'], queryFn:subApi.list });
  const create = useMutation({ mutationFn:()=>subApi.create(form), onSuccess:()=>{ qc.invalidateQueries({queryKey:['subcontractors']}); setCreating(false); setForm({name:'',taxNumber:'',sgkSicilNo:'',workArea:'',responsiblePerson:'',email:'',phone:'',contractStart:'',contractEnd:''}); } });
  const del = useMutation({ mutationFn:(id:string)=>subApi.delete(id), onSuccess:()=>qc.invalidateQueries({queryKey:['subcontractors']}) });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="page-title">Alt İşverenler</h1><p className="page-sub">{subs.length} kayıtlı alt işveren</p></div>
        <button className="btn btn-primary" onClick={()=>setCreating(true)}>+ Yeni Alt İşveren</button>
      </div>
      {creating && (
        <div className="card card-body mb-5">
          <h3 className="font-bold text-sm mb-3">Yeni Alt İşveren</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label">Firma Adı *</label><input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
            <div><label className="label">Vergi No</label><input className="input" value={form.taxNumber} onChange={e=>setForm(p=>({...p,taxNumber:e.target.value}))} /></div>
            <div><label className="label">SGK Sicil No</label><input className="input" value={form.sgkSicilNo} onChange={e=>setForm(p=>({...p,sgkSicilNo:e.target.value}))} /></div>
            <div><label className="label">Çalışma Alanı</label><input className="input" value={form.workArea} onChange={e=>setForm(p=>({...p,workArea:e.target.value}))} /></div>
            <div><label className="label">Yetkili Kişi</label><input className="input" value={form.responsiblePerson} onChange={e=>setForm(p=>({...p,responsiblePerson:e.target.value}))} /></div>
            <div><label className="label">E-posta</label><input className="input" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></div>
            <div><label className="label">Telefon</label><input className="input" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} /></div>
            <div><label className="label">Sözleşme Başlangıç</label><input className="input" type="date" value={form.contractStart} onChange={e=>setForm(p=>({...p,contractStart:e.target.value}))} /></div>
            <div><label className="label">Sözleşme Bitiş</label><input className="input" type="date" value={form.contractEnd} onChange={e=>setForm(p=>({...p,contractEnd:e.target.value}))} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary btn-sm" disabled={!form.name||create.isPending} onClick={()=>create.mutate()}>Kaydet</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>setCreating(false)}>İptal</button>
          </div>
        </div>
      )}
      <div className="card">
        {isLoading ? <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-slate-200 border-t-brand rounded-full animate-spin"/></div> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Firma Adı</th><th>SGK Sicil No</th><th>Çalışma Alanı</th><th>Yetkili</th><th>E-posta</th><th>Denetimler</th><th>Sözleşme Bitiş</th><th></th></tr></thead>
              <tbody>
                {subs.map(s=>(
                  <tr key={s.id}>
                    <td><div className="font-semibold">{s.name}</div>{s.taxNumber&&<div className="text-xs text-slate-400">VN: {s.taxNumber}</div>}</td>
                    <td className="text-xs font-mono text-slate-500">{s.sgkSicilNo||'—'}</td>
                    <td className="text-sm">{s.workArea||'—'}</td>
                    <td className="text-sm">{s.responsiblePerson||'—'}</td>
                    <td className="text-xs text-slate-500">{s.email||'—'}</td>
                    <td>{(s._count?.audits??0)>0?<span className="badge badge-blue text-xs">{s._count!.audits} denetim</span>:<span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="text-xs text-slate-500">{s.contractEnd?new Date(s.contractEnd).toLocaleDateString('tr-TR'):'—'}</td>
                    <td><button className="btn btn-secondary btn-xs text-red-500 hover:text-red-700" onClick={()=>window.confirm(`${s.name} silinsin mi?`)&&del.mutate(s.id)}>✕</button></td>
                  </tr>
                ))}
                {subs.length===0&&<tr><td colSpan={8} className="text-center text-slate-400 py-10">Alt işveren bulunamadı.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
