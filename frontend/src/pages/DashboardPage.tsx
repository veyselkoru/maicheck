// src/pages/DashboardPage.tsx v3.1
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../lib/api';

const TL_LABELS: Record<string, string>  = { green:'Düşük Risk', yellow:'Orta Risk', red:'Yüksek Risk' };
const TL_COLORS: Record<string, string>  = { green:'bg-green-100 text-green-700 border-green-200', yellow:'bg-amber-100 text-amber-700 border-amber-200', red:'bg-red-100 text-red-700 border-red-200' };
const TL_DOT: Record<string, string>     = { green:'bg-green-500', yellow:'bg-amber-500', red:'bg-red-500' };
const STATUS_LABELS: Record<string, string> = { BEKLIYOR:'Bekliyor', DEVAM_EDIYOR:'Devam Ediyor', TAMAMLANDI:'Tamamlandı', IPTAL:'İptal', KILITLI:'Kilitli 🔒' };
const STATUS_COLORS: Record<string, string> = { BEKLIYOR:'bg-slate-100 text-slate-600', DEVAM_EDIYOR:'bg-blue-100 text-blue-700', TAMAMLANDI:'bg-green-100 text-green-700', IPTAL:'bg-red-100 text-red-600', KILITLI:'bg-purple-100 text-purple-700' };

export default function DashboardPage() {
  const nav = useNavigate();
  const { data, isLoading, isError } = useQuery({ queryKey: ['dashboard'], queryFn: () => dashboardApi.get(), staleTime: 30_000 });

  if (isLoading) return <div className="p-8 text-center text-slate-400">Yükleniyor...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Dashboard yüklenemedi.</div>;
  if (!data) return null;

  const { totalSubcontractors, totalAudits, auditedThisMonth, globalStats, globalAreaStats, trafficLight, overdueActions, auditSummaries, subScores, currentPeriod } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Genel Uyum Durumu — {currentPeriod}</p>
        </div>
        <button onClick={() => nav('/audits')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all">+ Yeni Denetim</button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label:'Alt İşveren',     val:totalSubcontractors,   color:'text-blue-700',  route:'/subcontractors', filter:{} },
          { label:'Bu Ay Denetlenen',val:auditedThisMonth,      color:'text-blue-600',  route:'/audits', filter:{} },
          { label:'Risk Puanı',       val:globalStats.totalRisk, color:trafficLight==='red'?'text-red-600':trafficLight==='yellow'?'text-amber-600':'text-green-600', route:'/audits', filter:{} },
          { label:'Kritik/Yüksek',   val:globalStats.kritikYuksek,color:'text-red-600', route:'/findings', filter:{ riskLevel:'KRITIK' } },
          { label:'Uygun Değil',     val:globalStats.uygunDegil,color:'text-red-600',   route:'/findings', filter:{} },
          { label:'Eksik Belge',     val:globalStats.docMissing,color:'text-orange-600',route:'/evidence',  filter:{} },
          { label:'Gecikmiş Aksiyon',val:overdueActions,        color:'text-amber-600', route:'/actions', filter:{ status:'GECIKTI' } },
        ].map((k, i) => (
          <div key={i} onClick={() => nav(k.route, { state: k.filter })} className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group">
            <div className={`text-2xl font-bold ${k.color} group-hover:scale-105 transition-transform`}>{k.val}</div>
            <div className="text-xs text-slate-500 mt-1 leading-tight">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Traffic Light + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div onClick={() => nav('/audits')} className={`rounded-xl border p-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-all ${TL_COLORS[trafficLight] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          <div className="relative">
            <div className={`w-14 h-14 rounded-full ${TL_DOT[trafficLight] || 'bg-slate-400'} flex items-center justify-center text-white text-2xl`}>●</div>
          </div>
          <div>
            <div className="font-bold text-lg">{TL_LABELS[trafficLight] || 'Belirsiz'}</div>
            <div className="text-sm opacity-75">Genel Risk Trafik Işığı</div>
            <div className="text-xs opacity-60 mt-0.5">Tıklayın → Denetimler</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500 mb-3">UYUM DAĞILIMI</div>
          <div className="space-y-2">
            {[
              { label:'Uygun', val:globalStats.uygun, color:'bg-green-500' },
              { label:'Kısmi', val:globalStats.kismi, color:'bg-amber-500' },
              { label:'Uygun Değil', val:globalStats.uygunDegil, color:'bg-red-500' },
            ].map(s => {
              const total = globalStats.uygun + globalStats.kismi + globalStats.uygunDegil || 1;
              return (
                <div key={s.label} onClick={() => nav('/findings', { state: { compliance: s.label === 'Uygun' ? 'UYGUN' : s.label === 'Kısmi' ? 'KISMI' : 'UYGUN_DEGIL' } })} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded p-1 -m-1 transition-colors">
                  <div className="w-14 text-xs text-slate-500">{s.label}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2"><div className={`${s.color} h-2 rounded-full`} style={{ width:`${(s.val/total)*100}%` }} /></div>
                  <div className="text-xs font-medium text-slate-700 w-6 text-right">{s.val}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-medium text-slate-500 mb-3">HIZLI ERİŞİM</div>
          <div className="space-y-2">
            {[
              ['📋 Bulgular', '/findings'],
              ['✦ Aksiyonlar', '/actions'],
              ['⎙ Raporlar', '/reports'],
              ['₺ Finansal Etki', '/impact'],
              ['✉ İletişim', '/communication'],
            ].map(([label, route]) => (
              <button key={route} onClick={() => nav(route)} className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Area Risk Table */}
      {globalAreaStats?.filter((a: any) => a.totalRisk > 0).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 mb-6">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Alan Bazlı Risk Dağılımı</h2>
            <button onClick={() => nav('/findings')} className="text-xs text-blue-600 hover:underline">Tümünü Gör →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500">
                <th className="text-left px-4 py-2.5 font-medium">Denetim Alanı</th>
                <th className="text-right px-4 py-2.5 font-medium">Uygun Değil</th>
                <th className="text-right px-4 py-2.5 font-medium">Kritik/Yüksek</th>
                <th className="text-right px-4 py-2.5 font-medium">Risk Puanı</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {globalAreaStats.filter((a: any) => a.totalRisk > 0).slice(0, 10).map((area: any) => (
                  <tr key={area.area} onClick={() => nav('/findings', { state: { area: area.area } })} className="hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-2.5 text-slate-700">{area.area}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${area.uygunDegil > 0 ? 'text-red-500' : 'text-slate-400'}`}>{area.uygunDegil}</td>
                    <td className={`px-4 py-2.5 text-right ${area.kritikYuksek > 0 ? 'text-red-700 font-semibold' : 'text-slate-400'}`}>{area.kritikYuksek}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-700">{area.totalRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Current Period Audits */}
      {auditSummaries?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 mb-6">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Bu Dönem Denetimleri</h2>
            <button onClick={() => nav('/audits')} className="text-xs text-blue-600 hover:underline">Tümünü Gör →</button>
          </div>
          <div className="divide-y divide-slate-100">
            {auditSummaries.map((a: any) => (
              <div key={a.id} onClick={() => nav(`/audits/${a.id}/checklist`)} className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-slate-800">{a.subcontractor?.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{a.periodLabel} {a.periodType === 'RANGE' ? '(Dönem Aralığı)' : ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  {a.stats.uygunDegil > 0 && <span className="text-xs text-red-500 font-medium">{a.stats.uygunDegil} uygunsuz</span>}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TL_COLORS[a.trafficLight] || 'bg-slate-100 text-slate-600'}`}>{TL_LABELS[a.trafficLight]}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[a.status] || 'bg-slate-100 text-slate-600'}`}>{STATUS_LABELS[a.status] || a.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subcontractor Performance */}
      {subScores?.filter((s: any) => s.score !== null).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Alt İşveren Performans Skorları</h2>
            <button onClick={() => nav('/subcontractors')} className="text-xs text-blue-600 hover:underline">Tüm Alt İşverenler →</button>
          </div>
          <div className="divide-y divide-slate-100">
            {subScores.filter((s: any) => s.score !== null).sort((a: any, b: any) => b.score - a.score).map((s: any) => (
              <div key={s.id} onClick={() => nav('/audits', { state: { subId: s.id } })} className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between">
                <div className="font-medium text-sm text-slate-700">{s.name}</div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {s.trendAudits?.slice(0,3).reverse().map((t: any, i: number) => (
                      <span key={i} className={`w-2.5 h-2.5 rounded-full ${t.tl === 'green' ? 'bg-green-400' : t.tl === 'yellow' ? 'bg-amber-400' : 'bg-red-400'}`} title={t.periodLabel} />
                    ))}
                  </div>
                  <div className="text-sm font-bold" style={{ color: s.score >= 80 ? '#22c55e' : s.score >= 60 ? '#f59e0b' : '#ef4444' }}>{s.score}</div>
                  <div className="w-16 bg-slate-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width:`${s.score}%`, background: s.score>=80?'#22c55e':s.score>=60?'#f59e0b':'#ef4444' }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
