// src/pages/CommunicationPage.tsx v3.1
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commApi, auditsApi, subApi } from '../lib/api';

const MAIL_TEMPLATES = [
  { key:'EKSIK_BELGE',  label:'Eksik Belge Bildirimi',     icon:'📋', color:'bg-red-50 border-red-200 text-red-700' },
  { key:'AKSIYON',      label:'Düzeltici Aksiyon Bildirimi',icon:'⚠️', color:'bg-orange-50 border-orange-200 text-orange-700' },
  { key:'SURE_ASIMI',   label:'Süre Aşımı Uyarısı',        icon:'⏰', color:'bg-amber-50 border-amber-200 text-amber-700' },
  { key:'RAPOR',        label:'Rapor Paylaşımı',            icon:'📄', color:'bg-blue-50 border-blue-200 text-blue-700' },
  { key:'KAPANIS',      label:'Kapanış/Teşekkür',          icon:'✅', color:'bg-green-50 border-green-200 text-green-700' },
];

export default function CommunicationPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'contacts'|'drafts'|'compose'>('contacts');
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ subcontractorId:'', name:'', title:'', email:'', phone:'', isPrimary:false });
  const [composeForm, setComposeForm] = useState({ templateType:'EKSIK_BELGE', auditId:'', contactId:'', toEmail:'' });
  const [editDraft, setEditDraft] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState('');

  const { data: contacts = [] } = useQuery({ queryKey: ['contacts'], queryFn: () => commApi.contacts() });
  const { data: drafts = [] } = useQuery({ queryKey: ['drafts'], queryFn: () => commApi.drafts() });
  const { data: audits = [] } = useQuery({ queryKey: ['audits'], queryFn: () => auditsApi.list() });
  const { data: subs = [] } = useQuery({ queryKey: ['subs'], queryFn: () => subApi.list() });

  const createContactMut = useMutation({ mutationFn: (d: any) => commApi.createContact(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setNewContactOpen(false); setContactForm({ subcontractorId:'', name:'', title:'', email:'', phone:'', isPrimary:false }); } });
  const generateMut = useMutation({ mutationFn: (d: any) => commApi.generateDraft(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['drafts'] }); setTab('drafts'); } });
  const updateDraftMut = useMutation({ mutationFn: ({ id, d }: any) => commApi.updateDraft(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['drafts'] }); setEditDraft(null); } });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopySuccess(id); setTimeout(() => setCopySuccess(''), 2000); });
  };

  const openMailto = (draft: any) => {
    const link = `mailto:${draft.toEmail || ''}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.bodyText)}`;
    window.open(link, '_blank');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">İletişim Merkezi</h1>
        <p className="text-slate-500 text-sm">Alt işveren kontak yönetimi, mail taslakları ve mailto entegrasyonu</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {[['contacts','👥 Kontaklar'], ['compose','✉ Taslak Oluştur'], ['drafts','📬 Taslaklar']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {/* Contacts Tab */}
      {tab === 'contacts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-700">Kontak Listesi ({contacts.length})</h2>
            <button onClick={() => setNewContactOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ Yeni Kontak</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((c: any) => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-slate-800">{c.name}</div>
                    {c.isPrimary && <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded font-medium">Birincil</span>}
                  </div>
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 text-sm font-bold">{c.name[0]}</div>
                </div>
                {c.title && <div className="text-xs text-slate-500 mb-2">{c.title}</div>}
                <div className="text-xs text-slate-400 mb-1">{c.subcontractor?.name}</div>
                {c.email && <div className="text-xs text-blue-600 truncate"><a href={`mailto:${c.email}`} className="hover:underline">✉ {c.email}</a></div>}
                {c.phone && <div className="text-xs text-slate-500">📞 {c.phone}</div>}
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="col-span-3 p-8 text-center text-slate-400">
                <div className="text-3xl mb-2">👥</div>
                <div>Henüz kontak eklenmemiş.</div>
              </div>
            )}
          </div>

          {newContactOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
                <h3 className="font-semibold text-slate-700 mb-4">Yeni Kontak</h3>
                <div className="space-y-3">
                  <div><label className="text-xs text-slate-500 mb-1 block">Alt İşveren</label>
                    <select value={contactForm.subcontractorId} onChange={e=>setContactForm(p=>({...p,subcontractorId:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                      <option value="">— Seçin —</option>
                      {subs.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  {[['name','Ad Soyad *'],['title','Ünvan'],['email','E-posta'],['phone','Telefon']].map(([k,l]) => (
                    <div key={k}><label className="text-xs text-slate-500 mb-1 block">{l}</label>
                      <input value={(contactForm as any)[k]} onChange={e=>setContactForm(p=>({...p,[k]:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200" />
                    </div>
                  ))}
                  <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={contactForm.isPrimary} onChange={e=>setContactForm(p=>({...p,isPrimary:e.target.checked}))} className="accent-blue-600" /> Birincil Kontak</label>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => createContactMut.mutate(contactForm)} disabled={!contactForm.name || createContactMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Kaydet</button>
                  <button onClick={() => setNewContactOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm">İptal</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compose Tab */}
      {tab === 'compose' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Mail Taslağı Oluştur</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-xs text-slate-500 mb-2 block font-medium">Şablon Türü *</label>
              <div className="space-y-2">
                {MAIL_TEMPLATES.map(mt => (
                  <label key={mt.key} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${composeForm.templateType === mt.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" value={mt.key} checked={composeForm.templateType === mt.key} onChange={() => setComposeForm(p=>({...p,templateType:mt.key}))} className="accent-blue-600" />
                    <span className="text-base">{mt.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{mt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500 mb-1 block">Denetim (otomatik doldurma için)</label>
                <select value={composeForm.auditId} onChange={e=>setComposeForm(p=>({...p,auditId:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">— Seçin —</option>
                  {audits.map((a: any) => <option key={a.id} value={a.id}>{a.subcontractor?.name} — {a.periodLabel}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">Alıcı Kontak</label>
                <select value={composeForm.contactId} onChange={e=>setComposeForm(p=>({...p,contactId:e.target.value}))} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">— Seçin —</option>
                  {contacts.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.subcontractor?.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-500 mb-1 block">E-posta (manuel)</label>
                <input type="email" value={composeForm.toEmail} onChange={e=>setComposeForm(p=>({...p,toEmail:e.target.value}))} placeholder="ornek@firma.com" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200" />
              </div>
            </div>
          </div>
          <button onClick={() => generateMut.mutate(composeForm)} disabled={generateMut.isPending} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {generateMut.isPending ? '⏳ Oluşturuluyor...' : '✉ Taslağı Oluştur'}
          </button>
          {generateMut.isSuccess && <p className="text-green-600 text-sm mt-2">✅ Taslak oluşturuldu. "Taslaklar" sekmesinden görüntüleyebilirsiniz.</p>}
        </div>
      )}

      {/* Drafts Tab */}
      {tab === 'drafts' && (
        <div>
          <h2 className="font-semibold text-slate-700 mb-4">Mail Taslakları ({drafts.length})</h2>
          {drafts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              <div className="text-3xl mb-2">📬</div>
              <div>Henüz taslak oluşturulmamış.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {drafts.map((d: any) => (
                <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  {editDraft?.id === d.id ? (
                    <div>
                      <div className="mb-2"><label className="text-xs text-slate-500">Konu</label><input value={editDraft.subject} onChange={e=>setEditDraft((p:any)=>({...p,subject:e.target.value}))} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm mt-1" /></div>
                      <div className="mb-2"><label className="text-xs text-slate-500">Alıcı E-posta</label><input value={editDraft.toEmail||''} onChange={e=>setEditDraft((p:any)=>({...p,toEmail:e.target.value}))} className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm mt-1" /></div>
                      <div className="mb-3"><label className="text-xs text-slate-500">İçerik</label><textarea value={editDraft.bodyText} onChange={e=>setEditDraft((p:any)=>({...p,bodyText:e.target.value}))} rows={10} className="w-full border border-slate-300 rounded px-3 py-2 text-sm mt-1 resize-none font-mono" /></div>
                      <div className="flex gap-2">
                        <button onClick={() => updateDraftMut.mutate({ id: d.id, d: { subject: editDraft.subject, bodyText: editDraft.bodyText, toEmail: editDraft.toEmail } })} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">Kaydet</button>
                        <button onClick={() => setEditDraft(null)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-sm">İptal</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm text-slate-800">{d.subject}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {d.toEmail && <span>✉ {d.toEmail}</span>}
                            {d.contact?.name && <span className="ml-2">👤 {d.contact.name}</span>}
                            {d.audit?.subcontractor?.name && <span className="ml-2">🏢 {d.audit.subcontractor.name} — {d.audit.periodLabel}</span>}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{new Date(d.createdAt).toLocaleString('tr-TR')} — {d.createdBy?.name} — {d.status === 'GONDERILDI' ? '✅ Gönderildi' : '📝 Taslak'}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${MAIL_TEMPLATES.find(m=>m.key===d.templateType)?.color || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{MAIL_TEMPLATES.find(m=>m.key===d.templateType)?.label || d.templateType}</span>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">{d.bodyText}</div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <button onClick={() => openMailto(d)} className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100">📧 Mailto ile Aç</button>
                        <button onClick={() => { copyToClipboard(d.bodyText, d.id + '-body'); }} className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs hover:bg-slate-100">{copySuccess === d.id + '-body' ? '✅ Kopyalandı' : '📋 Metni Kopyala'}</button>
                        <button onClick={() => setEditDraft({ ...d })} className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs hover:bg-slate-100">✏ Düzenle</button>
                        <button onClick={() => updateDraftMut.mutate({ id: d.id, d: { status: 'GONDERILDI' } })} className="px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded text-xs hover:bg-green-100">✅ Gönderildi İşaretle</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
