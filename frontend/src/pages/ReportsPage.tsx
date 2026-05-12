// src/pages/ReportsPage.tsx v3.1
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditsApi, reportsApi } from '../lib/api';

const REPORT_TYPES = [
  { key: 'DETAYLI',        label: 'Detaylı Denetim Raporu',  desc: '8 bölüm: taraf bilgileri, alan risk tablosu, tüm uygunsuzluklar, evrak durumu, aksiyon planı, imza alanları' },
  { key: 'YONETICI_OZETI', label: 'Yönetici Özeti Raporu',   desc: 'En kritik 10 bulgu, risk özeti, performans değerlendirmesi, aksiyon önerileri' },
];

export default function ReportsPage() {
  const qc = useQueryClient();
  const [selectedAudit, setSelectedAudit] = useState('');
  const [selectedType, setSelectedType] = useState<'DETAYLI' | 'YONETICI_OZETI'>('DETAYLI');
  const [notes, setNotes] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [noteModalReport, setNoteModalReport] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');

  const { data: audits = [] } = useQuery({ queryKey: ['audits'], queryFn: () => auditsApi.list() });
  const { data: reports = [], isLoading } = useQuery({ queryKey: ['reports-all'], queryFn: () => reportsApi.list() });

  const generateMut = useMutation({
    mutationFn: (d: any) => reportsApi.generate(d),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reports-all'] });
      setCurrentReport(data);
      setPreviewHtml(data.htmlContent || '');
      setPreviewOpen(true);
    },
  });
  const addNoteMut = useMutation({
    mutationFn: ({ id, d }: any) => reportsApi.addNote(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports-all'] }); setNoteModalReport(null); setNoteContent(''); },
  });

  const handleGenerate = () => {
    if (!selectedAudit) return alert('Lütfen bir denetim seçin');
    generateMut.mutate({ auditId: selectedAudit, reportType: selectedType, notes: notes.filter(Boolean) });
  };

  const selectedInfo = audits.find((a: any) => a.id === selectedAudit);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Raporlar</h1>
        <p className="text-slate-500 text-sm">Denetim raporlarını oluştur, önizle, Word/DOCX olarak indir</p>
      </div>

      {/* Generator Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
        <h2 className="font-semibold text-slate-700 mb-4">🆕 Yeni Rapor Oluştur</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Denetim *</label>
            <select value={selectedAudit} onChange={e => setSelectedAudit(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 ring-blue-200 outline-none">
              <option value="">— Denetim seçin —</option>
              {audits.map((a: any) => (
                <option key={a.id} value={a.id}>[{a.isLocked ? '🔒' : a.status}] {a.subcontractor?.name} — {a.periodLabel}</option>
              ))}
            </select>
            {selectedInfo && (
              <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-600">
                <span className="font-medium">{selectedInfo.subcontractor?.name}</span> — {selectedInfo.periodLabel}
                {selectedInfo.stats && <> — Uygun Değil: <span className="text-red-500 font-medium">{selectedInfo.stats.uygunDegil}</span> | Risk: <span className="font-medium">{selectedInfo.stats.totalRisk}</span></>}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Rapor Türü *</label>
            <div className="space-y-2">
              {REPORT_TYPES.map(rt => (
                <label key={rt.key} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${selectedType === rt.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <input type="radio" value={rt.key} checked={selectedType === rt.key} onChange={() => setSelectedType(rt.key as any)} className="mt-0.5 accent-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-700">{rt.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{rt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">Kullanıcı Notları <span className="text-slate-400">(rapora eklenecek)</span></label>
          <div className="flex gap-2">
            <input value={noteInput} onChange={e => setNoteInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && noteInput.trim()) { setNotes(p => [...p, noteInput.trim()]); setNoteInput(''); }}} placeholder="Not ekleyip Enter'a basın..." className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 ring-blue-200" />
            <button onClick={() => { if (noteInput.trim()) { setNotes(p => [...p, noteInput.trim()]); setNoteInput(''); }}} className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-sm hover:bg-slate-200">Ekle</button>
          </div>
          {notes.map((n, i) => (
            <div key={i} className="flex items-center gap-2 mt-1.5 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 text-sm">
              <span className="flex-1 text-amber-800">{n}</span>
              <button onClick={() => setNotes(p => p.filter((_,x) => x !== i))} className="text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>
          ))}
        </div>

        <button onClick={handleGenerate} disabled={!selectedAudit || generateMut.isPending} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
          {generateMut.isPending ? '⏳ Oluşturuluyor...' : '▶ Raporu Oluştur'}
        </button>
        {generateMut.isError && <p className="text-red-500 text-sm mt-2">❌ {(generateMut.error as any)?.response?.data?.message || 'Rapor oluşturulamadı'}</p>}
      </div>

      {/* Fresh result banner */}
      {currentReport && !generateMut.isPending && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-green-700">✅ Rapor hazır: {currentReport.title}</div>
            <div className="text-sm text-green-600">Versiyon {currentReport.versionNo} — {new Date(currentReport.generatedAt).toLocaleString('tr-TR')}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setPreviewOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">👁 HTML Önizle</button>
            <a href={reportsApi.htmlUrl(currentReport.reportId)} target="_blank" className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700">🔗 Yeni Sekme</a>
            {currentReport.docxPath ? (
              <a href={reportsApi.docxUrl(currentReport.reportId)} className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800">⬇ DOCX İndir</a>
            ) : <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm border border-slate-200">DOCX (sunucu kurulumuna bağlı)</span>}
          </div>
        </div>
      )}

      {/* HTML Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="font-semibold text-slate-700">📄 Rapor Önizlemesi</h3>
              <div className="flex gap-2">
                {currentReport && <>
                  <a href={reportsApi.htmlUrl(currentReport.reportId)} target="_blank" className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">Yeni Sekmede Aç</a>
                  {currentReport.docxPath && <a href={reportsApi.docxUrl(currentReport.reportId)} className="px-3 py-1.5 bg-slate-700 text-white rounded text-sm">⬇ DOCX</a>}
                </>}
                <button onClick={() => setPreviewOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded text-sm hover:bg-slate-200">✕ Kapat</button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe srcDoc={previewHtml} className="w-full h-full border-0" title="Rapor" sandbox="allow-same-origin" />
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">📋 Rapor Geçmişi</h2>
          <span className="text-xs text-slate-400">{reports.length} rapor</span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="text-3xl mb-2">📄</div>
            <div>Henüz rapor oluşturulmamış.</div>
            <div className="text-sm mt-1">Yukarıdan bir denetim seçerek başlayın.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((r: any) => (
              <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm text-slate-700">{r.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                    <span>{r.reportType === 'DETAYLI' ? '📄 Detaylı' : '📋 Yönetici Özeti'}</span>
                    <span>•</span>
                    <span>{r.audit?.subcontractor?.name}</span>
                    <span>•</span>
                    <span>{r.audit?.periodLabel}</span>
                    <span>•</span>
                    <span>v{r.versions?.[0]?.versionNo ?? 1}</span>
                    {r._count?.notes > 0 && <><span>•</span><span className="text-amber-500">{r._count.notes} not</span></>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{new Date(r.generatedAt).toLocaleString('tr-TR')} — {r.generatedBy?.name}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => window.open(reportsApi.htmlUrl(r.id), '_blank')} className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100">👁 Önizle</button>
                  {r.versions?.[0]?.docxPath && <a href={reportsApi.docxUrl(r.id)} className="px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs hover:bg-slate-100">⬇ DOCX</a>}
                  <button onClick={() => { setNoteModalReport(r.id); setCurrentReport({ reportId: r.id }); setNoteModalReport(r.id); }} className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-xs hover:bg-amber-100">📝 Not Ekle</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Modal */}
      {noteModalReport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <h3 className="font-semibold text-slate-700 mb-3">📝 Rapor Notu Ekle</h3>
            <p className="text-xs text-slate-500 mb-3">Sistem alanları kilitlidir. Sadece kullanıcı notları eklenebilir.</p>
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Notunuzu girin..." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm h-28 resize-none outline-none focus:ring-2 ring-blue-200" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => addNoteMut.mutate({ id: noteModalReport, d: { noteContent } })} disabled={!noteContent.trim() || addNoteMut.isPending} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">Kaydet</button>
              <button onClick={() => { setNoteModalReport(null); setNoteContent(''); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
