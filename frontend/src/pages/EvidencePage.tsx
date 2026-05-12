// src/pages/EvidencePage.tsx v3.1 — drag-drop upload + archive
import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { evidenceApi, subApi, docTypesApi, auditsApi } from '../lib/api';
import { formatFileSize, formatDate } from '../lib/helpers';

const ACCEPTED = '.pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.zip,.eml,.msg,.txt,.csv,.json';

export default function EvidencePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [queueFiles, setQueueFiles] = useState<Array<{ file:File; id:string; progress:number; status:'pending'|'uploading'|'done'|'error'; error?:string }>>([]);
  const [uploadAuditId, setUploadAuditId] = useState('');
  const [uploadDocTypeId, setUploadDocTypeId] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [filters, setFilters] = useState({ subId:'', docTypeId:'', area:'', filename:'', page:1 });

  const { data: subs=[] } = useQuery({ queryKey:['subs'], queryFn:subApi.list });
  const { data: dtData } = useQuery({ queryKey:['doc-types'], queryFn:()=>docTypesApi.list() });
  const { data: audits=[] } = useQuery({ queryKey:['audits'], queryFn:()=>auditsApi.list() });
  const docTypes = (dtData as any)?.items || [];

  const q = Object.fromEntries(Object.entries(filters).filter(([k,v])=>v!==''&&v!==1&&k!=='page'));
  const { data, isLoading } = useQuery({ queryKey:['evidence-archive',filters], queryFn:()=>evidenceApi.archive({...q,page:filters.page}) });

  const addFiles = useCallback((files: FileList|File[]) => {
    const arr = Array.from(files).map(f=>({ file:f, id:`${Date.now()}-${Math.random()}`, progress:0, status:'pending' as const }));
    setQueueFiles(p=>[...p,...arr]);
    setShowPanel(true);
  }, []);

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files.length>0) addFiles(e.dataTransfer.files); };

  const uploadAll = async () => {
    if (!uploadAuditId) { alert('Denetim seçin'); return; }
    for (const uf of queueFiles.filter(f=>f.status==='pending'||f.status==='error')) {
      setQueueFiles(p=>p.map(x=>x.id===uf.id?{...x,status:'uploading'}:x));
      try {
        const fd=new FormData();
        fd.append('files',uf.file);
        fd.append('auditId',uploadAuditId);
        if(uploadDocTypeId) fd.append('documentTypeId',uploadDocTypeId);
        if(uploadDesc) fd.append('description',uploadDesc);
        await evidenceApi.upload(fd,(pct)=>setQueueFiles(p=>p.map(x=>x.id===uf.id?{...x,progress:pct}:x)));
        setQueueFiles(p=>p.map(x=>x.id===uf.id?{...x,status:'done',progress:100}:x));
      } catch(e:any) {
        setQueueFiles(p=>p.map(x=>x.id===uf.id?{...x,status:'error',error:e.response?.data?.message||'Hata'}:x));
      }
    }
    qc.invalidateQueries({ queryKey:['evidence-archive'] });
  };

  const EXT_ICONS: Record<string,string> = { pdf:'📕',xlsx:'📗',xls:'📗',docx:'📘',doc:'📘',png:'🖼',jpg:'🖼',jpeg:'🖼',zip:'🗜',txt:'📄',csv:'📊',json:'📋',eml:'✉',msg:'✉' };
  const extIcon = (name:string) => EXT_ICONS[name.split('.').pop()?.toLowerCase()||''] || '📄';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Evrak Arşivi</h1>
          <p className="text-slate-500 text-sm">{(data as any)?.total ?? 0} belge</p>
        </div>
        <button onClick={()=>setShowPanel(p=>!p)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          {showPanel ? '✕ Kapat' : '⬆ Belge Yükle'}
        </button>
      </div>

      {showPanel && (
        <div className="bg-white rounded-xl border border-slate-200 mb-5 p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Belge Yükleme</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Denetim *</label>
              <select value={uploadAuditId} onChange={e=>setUploadAuditId(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300">
                <option value="">— Denetim seçin —</option>
                {(audits as any[]).map((a:any)=><option key={a.id} value={a.id}>{a.subcontractor?.name} — {a.periodLabel}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Belge Türü</label>
              <select value={uploadDocTypeId} onChange={e=>setUploadDocTypeId(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300">
                <option value="">— Seçin —</option>
                {(docTypes as any[]).map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Açıklama</label>
              <input value={uploadDesc} onChange={e=>setUploadDesc(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-2 text-sm outline-none focus:ring-1 ring-blue-300" placeholder="Belge açıklaması..." />
            </div>
          </div>
          <div
            onDragOver={e=>{e.preventDefault();setIsDragging(true);}}
            onDragLeave={()=>setIsDragging(false)}
            onDrop={handleDrop}
            onClick={()=>document.getElementById('ev-file-input')?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging?'border-blue-400 bg-blue-50':'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
          >
            <div className="text-3xl mb-2">📁</div>
            <div className="text-sm font-medium text-slate-600">Dosyaları buraya sürükleyin veya tıklayın</div>
            <div className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX, JPG, PNG, ZIP, EML — Çoklu seçim</div>
            <input id="ev-file-input" type="file" multiple accept={ACCEPTED} className="hidden" onChange={e=>{if(e.target.files) addFiles(e.target.files); e.target.value='';}} />
          </div>
          {queueFiles.length > 0 && (
            <div className="mt-4">
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {queueFiles.map(uf=>(
                  <div key={uf.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                    <span>{extIcon(uf.file.name)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{uf.file.name}</div>
                      <div className="text-xs text-slate-400">{formatFileSize(uf.file.size)}</div>
                      {uf.status==='uploading' && <div className="mt-1 bg-slate-200 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{width:`${uf.progress}%`}}/></div>}
                      {uf.status==='error' && <div className="text-xs text-red-500">{uf.error}</div>}
                    </div>
                    <span className="flex-shrink-0">
                      {uf.status==='done'&&<span className="text-green-500">✓</span>}
                      {uf.status==='uploading'&&<span className="text-xs text-blue-500">{uf.progress}%</span>}
                      {uf.status==='error'&&<span className="text-red-400">✗</span>}
                      {uf.status!=='uploading'&&<button onClick={()=>setQueueFiles(p=>p.filter(x=>x.id!==uf.id))} className="ml-2 text-slate-300 hover:text-red-400">✕</button>}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={uploadAll} disabled={!uploadAuditId||queueFiles.every(f=>f.status==='done')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  ⬆ Yükle ({queueFiles.filter(f=>f.status==='pending'||f.status==='error').length} dosya)
                </button>
                <button onClick={()=>{setQueueFiles(p=>p.filter(x=>x.status!=='done'));}} className="px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200">Tamamlananları Temizle</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label:'Alt İşveren', type:'select', key:'subId', options:(subs as any[]).map((s:any)=>({v:s.id,l:s.name})) },
            { label:'Belge Türü', type:'select', key:'docTypeId', options:(docTypes as any[]).map((d:any)=>({v:d.id,l:d.name})) },
            { label:'Denetim Alanı', type:'input', key:'area', placeholder:'Alan adında ara...' },
            { label:'Dosya Adı', type:'input', key:'filename', placeholder:'Dosya adında ara...' },
          ].map(f=>(
            <div key={f.key}>
              <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
              {f.type==='select' ? (
                <select value={(filters as any)[f.key]} onChange={e=>setFilters(p=>({...p,[f.key]:e.target.value,page:1}))} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none">
                  <option value="">Tümü</option>
                  {(f.options||[]).map((o:any)=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ) : (
                <input value={(filters as any)[f.key]} onChange={e=>setFilters(p=>({...p,[f.key]:e.target.value,page:1}))} placeholder={f.placeholder} className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Archive Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium">Dosya</th>
                <th className="text-left px-4 py-3 font-medium">Belge Türü</th>
                <th className="text-left px-4 py-3 font-medium">Alt İşveren</th>
                <th className="text-left px-4 py-3 font-medium">Denetim Alanı</th>
                <th className="text-left px-4 py-3 font-medium">Boyut</th>
                <th className="text-left px-4 py-3 font-medium">Yükleyen</th>
                <th className="text-left px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {((data as any)?.files||[]).map((f:any)=>(
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{extIcon(f.originalFilename)}</span>
                        <div><div className="font-medium">{f.originalFilename}</div><div className="text-xs text-slate-400 uppercase">{f.extension}</div></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{f.documentType?.name||'—'}</td>
                    <td className="px-4 py-3">{f.subcontractor?.name||'—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{f.auditItem?.auditArea||'—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatFileSize(f.fileSize)}</td>
                    <td className="px-4 py-3 text-xs">{f.uploadedBy?.name||'—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(f.uploadedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <a href={evidenceApi.downloadUrl(f.id)} className="px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded text-xs hover:bg-slate-100" download>⬇</a>
                        {f.auditId && <button onClick={()=>nav(`/audits/${f.auditId}/checklist`)} className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-100">→</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {((data as any)?.files||[]).length===0&&<tr><td colSpan={8} className="text-center text-slate-400 py-10">Belge bulunamadı.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {data && (data as any).pages>1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{(data as any).total} belge</span>
            <div className="flex gap-2">
              {filters.page>1&&<button onClick={()=>setFilters(p=>({...p,page:p.page-1}))} className="px-3 py-1.5 bg-slate-100 rounded hover:bg-slate-200">← Önceki</button>}
              {filters.page<(data as any).pages&&<button onClick={()=>setFilters(p=>({...p,page:p.page+1}))} className="px-3 py-1.5 bg-slate-100 rounded hover:bg-slate-200">Sonraki →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
