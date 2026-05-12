// src/pages/ImpactPage.tsx v3.1
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { impactApi } from '../lib/api';

const INSTITUTIONS = ['SGK','VERGI','ISKUR','IS_HUKUKU','ISG','DIGER'];
const METHODS = [
  { key:'SABIT',           label:'Sabit Tutar' },
  { key:'KISI_BASI',       label:'Kişi Başı' },
  { key:'GUN_BASI',        label:'Gün Başı' },
  { key:'BELGE_BASI',      label:'Belge Başı' },
  { key:'ORAN_BAZI',       label:'Oran Bazlı (%)' },
  { key:'KULLANICI_GIRISI',label:'Kullanıcı Girişi' },
];
const INST_COLORS: Record<string,string> = { SGK:'bg-blue-100 text-blue-700', VERGI:'bg-purple-100 text-purple-700', ISKUR:'bg-green-100 text-green-700', IS_HUKUKU:'bg-orange-100 text-orange-700', ISG:'bg-red-100 text-red-700', DIGER:'bg-slate-100 text-slate-700' };

const fmt = (n: number | null | undefined) => n != null ? n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺' : '—';

export default function ImpactPage() {
  const qc = useQueryClient();
  const [filterInst, setFilterInst] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [selectedParam, setSelectedParam] = useState<any>(null);
  const [calcInputs, setCalcInputs] = useState({ personCount: 1, dayCount: 1, documentCount: 1, baseAmount: 0 });
  const [calcResult, setCalcResult] = useState<any>(null);
  const [form, setForm] = useState<any>({ name:'', institution:'SGK', legalReference:'', method:'SABIT', fixedAmount:'', perPersonAmount:'', dailyAmount:'', perDocAmount:'', ratePercent:'', minAmount:'', maxAmount:'', description:'', validFrom: new Date().toISOString().slice(0,10) });

  const { data: params = [], isLoading } = useQuery({ queryKey: ['impact', filterInst], queryFn: () => impactApi.list(filterInst ? { institution: filterInst } : {}) });

  const createMut = useMutation({ mutationFn: (d: any) => impactApi.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['impact'] }); setModalOpen(false); setForm({ name:'', institution:'SGK', legalReference:'', method:'SABIT', fixedAmount:'', perPersonAmount:'', dailyAmount:'', perDocAmount:'', ratePercent:'', minAmount:'', maxAmount:'', description:'', validFrom: new Date().toISOString().slice(0,10) }); } });
  const calcMut = useMutation({ mutationFn: (d: any) => impactApi.calculate(d), onSuccess: (r) => setCalcResult(r) });
  const toggleActiveMut = useMutation({ mutationFn: ({ id, isActive }: any) => impactApi.update(id, { isActive }), onSuccess: () => qc.invalidateQueries({ queryKey: ['impact'] }) });

  const handleCreate = () => {
    const payload: any = { name: form.name, institution: form.institution, legalReference: form.legalReference, method: form.method, description: form.description, validFrom: form.validFrom || undefined };
    if (form.fixedAmount) payload.fixedAmount = parseFloat(form.fixedAmount);
    if (form.perPersonAmount) payload.perPersonAmount = parseFloat(form.perPersonAmount);
    if (form.dailyAmount) payload.dailyAmount = parseFloat(form.dailyAmount);
    if (form.perDocAmount) payload.perDocAmount = parseFloat(form.perDocAmount);
    if (form.ratePercent) payload.ratePercent = parseFloat(form.ratePercent);
    if (form.minAmount) payload.minAmount = parseFloat(form.minAmount);
    if (form.maxAmount) payload.maxAmount = parseFloat(form.maxAmount);
    createMut.mutate(payload);
  };

  const openCalc = (p: any) => { setSelectedParam(p); setCalcResult(null); setCalcInputs({ personCount:1, dayCount:1, documentCount:1, baseAmount:0 }); setCalcOpen(true); };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Finansal Etki Motoru</h1>
          <p className="text-slate-500 text-sm mt-1">Mevzuat bazlı tahmini finansal etki parametreleri. Kesin ceza tutarı değildir.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Yeni Parametre</button>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
        ⚠️ <strong>Önemli:</strong> Bu modüldeki tüm hesaplamalar <strong>tahmini finansal risk</strong> göstergesidir. Kesin ceza miktarları yetkili kurum (SGK, Hazine, İŞKUR vb.) tarafından belirlenir. Tutarlar mevzuat değişikliklerine bağlı olarak güncellenmelidir.
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex gap-3 flex-wrap">
        <button onClick={() => setFilterInst('')} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!filterInst ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>Tümü</button>
        {INSTITUTIONS.map(inst => (
          <button key={inst} onClick={() => setFilterInst(filterInst === inst ? '' : inst)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterInst === inst ? 'bg-blue-600 text-white border-blue-600' : `${INST_COLORS[inst]} border-current/20 hover:opacity-80`}`}>{inst}</button>
        ))}
      </div>

      {/* Parameters Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Ceza / Etki Parametreleri <span className="text-slate-400 font-normal text-sm">({params.length})</span></h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
        ) : params.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Parametre bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500">
                <th className="text-left px-4 py-3 font-medium">Parametre Adı</th>
                <th className="text-left px-4 py-3 font-medium">Kurum</th>
                <th className="text-left px-4 py-3 font-medium">Yöntem</th>
                <th className="text-left px-4 py-3 font-medium">Yasal Dayanak</th>
                <th className="text-right px-4 py-3 font-medium">Tutar / Oran</th>
                <th className="text-center px-4 py-3 font-medium">Durum</th>
                <th className="text-center px-4 py-3 font-medium">İşlemler</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {params.map((p: any) => (
                  <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${!p.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INST_COLORS[p.institution] || 'bg-slate-100 text-slate-600'}`}>{p.institution}</span></td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{METHODS.find(m=>m.key===p.method)?.label || p.method}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{p.legalReference || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {p.method === 'ORAN_BAZI' ? `%${p.ratePercent}` : p.method === 'KISI_BASI' ? fmt(p.perPersonAmount) + '/kişi' : p.method === 'GUN_BASI' ? fmt(p.dailyAmount) + '/gün' : p.method === 'BELGE_BASI' ? fmt(p.perDocAmount) + '/belge' : fmt(p.fixedAmount)}
                    </td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.isActive ? 'Aktif' : 'Pasif'}</span></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        {p.method !== 'KULLANICI_GIRISI' && <button onClick={() => openCalc(p)} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100">₺ Hesapla</button>}
                        <button onClick={() => toggleActiveMut.mutate({ id: p.id, isActive: !p.isActive })} className="px-2 py-1 bg-slate-50 text-slate-600 rounded text-xs hover:bg-slate-100">{p.isActive ? 'Pasifleştir' : 'Aktifleştir'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Parameter Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-slate-700 mb-4">Yeni Parametre Ekle</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Parametre Adı *</label><input value={form.name} onChange={e=>setForm((p:any)=>({...p,name:e.target.value}))} placeholder="ör: Geç İşe Giriş Bildirgesi" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Kurum</label><select value={form.institution} onChange={e=>setForm((p:any)=>({...p,institution:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">{INSTITUTIONS.map(i=><option key={i}>{i}</option>)}</select></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Hesaplama Yöntemi</label><select value={form.method} onChange={e=>setForm((p:any)=>({...p,method:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">{METHODS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></div>
              <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Yasal Dayanak</label><input value={form.legalReference} onChange={e=>setForm((p:any)=>({...p,legalReference:e.target.value}))} placeholder="ör: 5510 m.102" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              {form.method === 'SABIT' && <div><label className="text-xs text-slate-500 mb-1 block">Sabit Tutar (₺)</label><input type="number" value={form.fixedAmount} onChange={e=>setForm((p:any)=>({...p,fixedAmount:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>}
              {form.method === 'KISI_BASI' && <div><label className="text-xs text-slate-500 mb-1 block">Kişi Başı Tutar (₺)</label><input type="number" value={form.perPersonAmount} onChange={e=>setForm((p:any)=>({...p,perPersonAmount:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>}
              {form.method === 'GUN_BASI' && <div><label className="text-xs text-slate-500 mb-1 block">Gün Başı Tutar (₺)</label><input type="number" value={form.dailyAmount} onChange={e=>setForm((p:any)=>({...p,dailyAmount:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>}
              {form.method === 'BELGE_BASI' && <div><label className="text-xs text-slate-500 mb-1 block">Belge Başı Tutar (₺)</label><input type="number" value={form.perDocAmount} onChange={e=>setForm((p:any)=>({...p,perDocAmount:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>}
              {form.method === 'ORAN_BAZI' && <div><label className="text-xs text-slate-500 mb-1 block">Oran (%)</label><input type="number" value={form.ratePercent} onChange={e=>setForm((p:any)=>({...p,ratePercent:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>}
              <div><label className="text-xs text-slate-500 mb-1 block">Alt Limit (₺)</label><input type="number" value={form.minAmount} onChange={e=>setForm((p:any)=>({...p,minAmount:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Üst Limit (₺)</label><input type="number" value={form.maxAmount} onChange={e=>setForm((p:any)=>({...p,maxAmount:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              <div><label className="text-xs text-slate-500 mb-1 block">Geçerlilik Başlangıcı</label><input type="date" value={form.validFrom} onChange={e=>setForm((p:any)=>({...p,validFrom:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>
              <div className="col-span-2"><label className="text-xs text-slate-500 mb-1 block">Açıklama</label><textarea value={form.description} onChange={e=>setForm((p:any)=>({...p,description:e.target.value}))} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none resize-none" /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCreate} disabled={!form.name || createMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Kaydet</button>
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200">İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* Calculator Modal */}
      {calcOpen && selectedParam && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-semibold text-slate-700 mb-1">₺ Tahmini Etki Hesapla</h3>
            <p className="text-xs text-slate-500 mb-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${INST_COLORS[selectedParam.institution]}`}>{selectedParam.institution}</span> — <span className="font-medium">{selectedParam.name}</span></p>
            <div className="space-y-3">
              {selectedParam.method === 'KISI_BASI' && <div><label className="text-xs text-slate-500 mb-1 block">Etkilenen Kişi Sayısı</label><input type="number" min="1" value={calcInputs.personCount} onChange={e=>setCalcInputs(p=>({...p,personCount:+e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>}
              {selectedParam.method === 'GUN_BASI' && <div><label className="text-xs text-slate-500 mb-1 block">Gün Sayısı</label><input type="number" min="1" value={calcInputs.dayCount} onChange={e=>setCalcInputs(p=>({...p,dayCount:+e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>}
              {selectedParam.method === 'BELGE_BASI' && <div><label className="text-xs text-slate-500 mb-1 block">Belge Sayısı</label><input type="number" min="1" value={calcInputs.documentCount} onChange={e=>setCalcInputs(p=>({...p,documentCount:+e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>}
              {selectedParam.method === 'ORAN_BAZI' && <div><label className="text-xs text-slate-500 mb-1 block">Baz Tutar (₺)</label><input type="number" min="0" value={calcInputs.baseAmount} onChange={e=>setCalcInputs(p=>({...p,baseAmount:+e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" /></div>}
            </div>
            <button onClick={() => calcMut.mutate({ parameterId: selectedParam.id, ...calcInputs })} disabled={calcMut.isPending} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">Hesapla</button>
            {calcResult && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="text-xs text-amber-600 font-medium mb-1">TAHMİNİ FİNANSAL ETKİ</div>
                <div className="text-2xl font-bold text-amber-800">{calcResult.estimated != null ? fmt(calcResult.estimated) : 'Kullanıcı girişi gerekli'}</div>
                <div className="text-xs text-amber-600 mt-1">{calcResult.legalReference}</div>
                <div className="text-xs text-slate-500 mt-2">{calcResult.note}</div>
              </div>
            )}
            <button onClick={() => { setCalcOpen(false); setCalcResult(null); }} className="mt-3 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 w-full">Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}
