// src/pages/TemplateEditorPage.tsx v3.1 — full working editor
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesApi, docTypesApi } from '../lib/api';

const AREAS = ['Hukuki Yapı','Alt İşv. Sözleşmesi','Muvazaa/Fiili Durum','İşe Giriş','İş Sözleşmeleri','Personel Özlük','Puantaj','Bordro','Ücret Ödemeleri','Banka Ödemeleri','Fazla Mesai','Hafta Tatili','UBGT','Yıllık İzin','Rapor/Eksik Gün','SGK Bildirimleri','SGK Tahakkuk','SGK Ödemeleri','SGK Borcu','Vergi/MPHB','Vergi Ödemeleri','BES/OKS','Yan Haklar','Prim/İkramiye','İSG','İş Kazası','Fesih Süreci','Kıdem/İhbar/Bakiye İzin','İbraname','Arabuluculuk/İkale','IPC/Ceza'];
const RISK_OPTS = [{v:'DUSUK',l:'Düşük',c:'text-slate-500'},{v:'ORTA',l:'Orta',c:'text-amber-600'},{v:'YUKSEK',l:'Yüksek',c:'text-orange-600'},{v:'KRITIK',l:'Kritik',c:'text-red-600'}];
const EMPTY_ITEM = { auditArea:'', controlSubject:'', legalBasis:'', requiredDocTypeId:'', isDocumentRequired:false, defaultRiskLevel:'ORTA', defaultRiskScore:3, isCritical:false, isActive:true, orderNo:0, defaultCorrective:'' };

export default function TemplateEditorPage() {
  const { id } = useParams<{id:string}>();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [editingId, setEditingId] = useState<string|null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [filterArea, setFilterArea] = useState('__all__');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<any>({ ...EMPTY_ITEM });

  const { data: template, isLoading } = useQuery({ queryKey:['template',id], queryFn:()=>templatesApi.get(id!), enabled:!!id });
  const { data: dtData } = useQuery({ queryKey:['doc-types'], queryFn:()=>docTypesApi.list() });
  const docTypes: any[] = (dtData as any)?.items || [];

  const updateItemMut = useMutation({
    mutationFn: ({iid,data}:{iid:string;data:any}) => templatesApi.updateItem(id!,iid,data),
    onSuccess: () => { qc.invalidateQueries({queryKey:['template',id]}); setEditingId(null); },
  });

  const addItemMut = useMutation({
    mutationFn: (d:any) => templatesApi.addItem(id!, d),
    onSuccess: () => { qc.invalidateQueries({queryKey:['template',id]}); setShowAddForm(false); setNewItem({...EMPTY_ITEM}); },
  });

  const deleteItemMut = useMutation({
    mutationFn: (iid:string) => templatesApi.deleteItem(id!,iid),
    onSuccess: () => qc.invalidateQueries({queryKey:['template',id]}),
  });

  if (isLoading) return <div className="p-8 text-center text-slate-400">Yükleniyor...</div>;
  if (!template) return <div className="p-8 text-center text-red-500">Şablon bulunamadı.</div>;

  const items: any[] = template.items || [];
  const areas = ['__all__', ...Array.from(new Set(items.map((i:any)=>i.auditArea)))];
  const filtered = filterArea==='__all__' ? items : items.filter((i:any)=>i.auditArea===filterArea);
  const activeCount = items.filter((i:any)=>i.isActive).length;

  function startEdit(item:any) {
    setEditingId(item.id);
    setEditForm({ auditArea:item.auditArea, controlSubject:item.controlSubject, legalBasis:item.legalBasis||'', requiredDocTypeId:item.requiredDocTypeId||'', isDocumentRequired:item.isDocumentRequired, defaultRiskLevel:item.defaultRiskLevel, defaultRiskScore:item.defaultRiskScore, isCritical:item.isCritical, isActive:item.isActive, orderNo:item.orderNo, defaultCorrective:item.defaultCorrective||'' });
  }

  const RLCOLORS: Record<string,string> = { DUSUK:'bg-slate-100 text-slate-500', ORTA:'bg-amber-100 text-amber-700', YUKSEK:'bg-orange-100 text-orange-700', KRITIK:'bg-red-100 text-red-700' };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={()=>nav('/templates')} className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 bg-slate-100 rounded-lg">← Şablonlar</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">{template.name}</h1>
          <p className="text-sm text-slate-500">{template.description} · {activeCount} aktif madde</p>
        </div>
        <button onClick={()=>setShowAddForm(p=>!p)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showAddForm ? '✕ İptal' : '+ Madde Ekle'}
        </button>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
          <h3 className="font-semibold text-blue-800 mb-3">Yeni Kontrol Maddesi</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Denetim Alanı *</label>
              <select value={newItem.auditArea} onChange={e=>setNewItem((p:any)=>({...p,auditArea:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300 bg-white">
                <option value="">— Alan seçin —</option>
                {AREAS.map(a=><option key={a} value={a}>{a}</option>)}
                <option value="__custom__">Özel alan girin...</option>
              </select>
              {newItem.auditArea==='__custom__' && <input value={newItem._customArea||''} onChange={e=>setNewItem((p:any)=>({...p,_customArea:e.target.value}))} placeholder="Alan adı..." className="w-full border border-slate-300 rounded px-2 py-2 text-sm mt-1 outline-none bg-white" />}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Yasal Dayanak</label>
              <input value={newItem.legalBasis} onChange={e=>setNewItem((p:any)=>({...p,legalBasis:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300 bg-white" placeholder="4857 m.41 vb..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Kontrol Konusu *</label>
              <input value={newItem.controlSubject} onChange={e=>setNewItem((p:any)=>({...p,controlSubject:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300 bg-white" placeholder="Kontrol edilecek konu..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">İstenen Belge</label>
              <select value={newItem.requiredDocTypeId} onChange={e=>setNewItem((p:any)=>({...p,requiredDocTypeId:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300 bg-white">
                <option value="">— Seçin —</option>
                {docTypes.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Risk Seviyesi</label>
              <select value={newItem.defaultRiskLevel} onChange={e=>setNewItem((p:any)=>({...p,defaultRiskLevel:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300 bg-white">
                {RISK_OPTS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Risk Puanı</label>
              <input type="number" min={1} max={10} value={newItem.defaultRiskScore} onChange={e=>setNewItem((p:any)=>({...p,defaultRiskScore:+e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sıra No</label>
              <input type="number" value={newItem.orderNo} onChange={e=>setNewItem((p:any)=>({...p,orderNo:+e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Düzeltici Aksiyon Önerisi</label>
              <input value={newItem.defaultCorrective} onChange={e=>setNewItem((p:any)=>({...p,defaultCorrective:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300 bg-white" />
            </div>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={newItem.isDocumentRequired} onChange={e=>setNewItem((p:any)=>({...p,isDocumentRequired:e.target.checked}))} className="accent-blue-600" />
              Belge Zorunlu
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={newItem.isCritical} onChange={e=>setNewItem((p:any)=>({...p,isCritical:e.target.checked}))} className="accent-red-500" />
              Kritik Madde
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>{
              const area = newItem.auditArea==='__custom__' ? newItem._customArea : newItem.auditArea;
              if(!area||!newItem.controlSubject) return alert('Alan ve kontrol konusu zorunlu');
              addItemMut.mutate({...newItem, auditArea:area, companyId:undefined, _customArea:undefined});
            }} disabled={addItemMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {addItemMut.isPending ? 'Ekleniyor...' : 'Madde Ekle'}
            </button>
            <button onClick={()=>{setShowAddForm(false);setNewItem({...EMPTY_ITEM});}} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50">İptal</button>
          </div>
        </div>
      )}

      {/* Area Filter Pills */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {areas.map(a=>(
          <button key={a} onClick={()=>setFilterArea(a)} className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${filterArea===a ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
            {a==='__all__' ? `Tümü (${items.length})` : a} {a!=='__all__' && `(${items.filter((i:any)=>i.auditArea===a).length})`}
          </button>
        ))}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left font-medium w-10">No</th>
                <th className="px-3 py-2.5 text-left font-medium w-28">Alan</th>
                <th className="px-3 py-2.5 text-left font-medium">Kontrol Konusu</th>
                <th className="px-3 py-2.5 text-left font-medium w-24">Yasal Dayanak</th>
                <th className="px-3 py-2.5 text-left font-medium w-28">Belge</th>
                <th className="px-3 py-2.5 text-center font-medium w-16">Risk</th>
                <th className="px-3 py-2.5 text-center font-medium w-12">Puan</th>
                <th className="px-3 py-2.5 text-center font-medium w-12">Krit.</th>
                <th className="px-3 py-2.5 text-center font-medium w-12">Belge</th>
                <th className="px-3 py-2.5 text-center font-medium w-12">Aktif</th>
                <th className="px-3 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item:any) => editingId===item.id ? (
                <tr key={item.id} className="bg-blue-50">
                  <td colSpan={11} className="px-3 py-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Alan</label>
                        <select value={editForm.auditArea} onChange={e=>setEditForm((p:any)=>({...p,auditArea:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none bg-white">
                          {AREAS.map(a=><option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Kontrol Konusu</label>
                        <input value={editForm.controlSubject} onChange={e=>setEditForm((p:any)=>({...p,controlSubject:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Yasal Dayanak</label>
                        <input value={editForm.legalBasis} onChange={e=>setEditForm((p:any)=>({...p,legalBasis:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">İstenen Belge</label>
                        <select value={editForm.requiredDocTypeId} onChange={e=>setEditForm((p:any)=>({...p,requiredDocTypeId:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none bg-white">
                          <option value="">—</option>
                          {docTypes.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Risk</label>
                        <select value={editForm.defaultRiskLevel} onChange={e=>setEditForm((p:any)=>({...p,defaultRiskLevel:e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none bg-white">
                          {RISK_OPTS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Puan</label>
                        <input type="number" min={1} max={10} value={editForm.defaultRiskScore} onChange={e=>setEditForm((p:any)=>({...p,defaultRiskScore:+e.target.value}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none bg-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-3">
                      {[{key:'isCritical',l:'Kritik'},{key:'isDocumentRequired',l:'Belge Zorunlu'},{key:'isActive',l:'Aktif'}].map(f=>(
                        <label key={f.key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={!!editForm[f.key]} onChange={e=>setEditForm((p:any)=>({...p,[f.key]:e.target.checked}))} className="accent-blue-600" />
                          {f.l}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>updateItemMut.mutate({iid:item.id,data:editForm})} disabled={updateItemMut.isPending} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                        {updateItemMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                      <button onClick={()=>setEditingId(null)} className="px-3 py-1.5 bg-white border border-slate-300 rounded text-sm hover:bg-slate-50">İptal</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.isActive ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-2.5 text-xs text-slate-400 font-mono">{item.orderNo}</td>
                  <td className="px-3 py-2.5 text-xs font-medium text-slate-600">{item.auditArea}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-700">
                    {item.isCritical && <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5 mb-0.5" />}
                    {item.controlSubject}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{item.legalBasis||'—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{item.requiredDocType?.name||'—'}</td>
                  <td className="px-3 py-2.5 text-center"><span className={`px-1.5 py-0.5 rounded text-xs ${RLCOLORS[item.defaultRiskLevel]||''}`}>{item.defaultRiskLevel}</span></td>
                  <td className="px-3 py-2.5 text-center text-xs font-mono text-slate-500">{item.defaultRiskScore}</td>
                  <td className="px-3 py-2.5 text-center text-xs">{item.isCritical ? <span className="text-red-500">●</span> : '—'}</td>
                  <td className="px-3 py-2.5 text-center text-xs">{item.isDocumentRequired ? <span className="text-orange-500">●</span> : '—'}</td>
                  <td className="px-3 py-2.5 text-center text-xs">{item.isActive ? <span className="text-green-500">●</span> : '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={()=>startEdit(item)} className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100">✎</button>
                      <button onClick={()=>{ if(confirm('Bu maddeyi pasife almak istediğinizden emin misiniz?')) deleteItemMut.mutate(item.id); }} className="px-2 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded text-xs hover:bg-red-50 hover:text-red-500 hover:border-red-200">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={11} className="text-center text-slate-400 py-8">Madde bulunamadı.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const RLCOLORS: Record<string,string> = { DUSUK:'bg-slate-100 text-slate-500', ORTA:'bg-amber-100 text-amber-700', YUKSEK:'bg-orange-100 text-orange-700', KRITIK:'bg-red-100 text-red-700' };
