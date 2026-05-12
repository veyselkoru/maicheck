// src/pages/AuditSummaryPage.tsx v3.1
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { auditsApi, reportsApi } from '../lib/api';
import { RISK_LABELS, RISK_COLORS } from '../lib/helpers';

const TL: Record<string,{bg:string;dot:string;text:string;label:string}> = {
  green:  { bg:'bg-emerald-50 border border-emerald-200', dot:'bg-emerald-500', text:'text-emerald-700', label:'YEŞİL — Genel Uyum (0–25)' },
  yellow: { bg:'bg-amber-50 border border-amber-200',     dot:'bg-amber-500',   text:'text-amber-700',   label:'SARI — İzleme Gerekli (26–60)' },
  red:    { bg:'bg-red-50 border border-red-200',         dot:'bg-red-500',     text:'text-red-700',     label:'KIRMIZI — Acil Aksiyon (61+)' },
};

export default function AuditSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { data, isLoading, isError } = useQuery({ queryKey: ['audit-summary', id], queryFn: () => auditsApi.summary(id!) });

  if (isLoading) return <div className="p-8 text-center text-slate-400">Yükleniyor...</div>;
  if (isError || !data) return <div className="p-8 text-center text-red-500">Özet yüklenemedi.</div>;

  const { audit, subcontractor, stats: s, areaStats, trafficLight: tl, nonCompliant, kismi } = data;
  const tlCfg = TL[tl] || TL.yellow;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button onClick={() => nav(`/audits/${id}/checklist`)} className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm hover:bg-slate-200">← Checklist</button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Denetim Özeti</h1>
          <p className="text-sm text-slate-500">{subcontractor?.name} · {audit?.periodLabel}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => nav('/reports', { state: { auditId: id } })} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm hover:bg-blue-100">📄 Rapor Oluştur</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        {[
          { l:'Toplam', v:s.total, c:'text-slate-700' },
          { l:'Uygun', v:s.uygun, c:'text-green-600' },
          { l:'Kısmi', v:s.kismi, c:'text-amber-600' },
          { l:'Uygun Değil', v:s.uygunDegil, c:'text-red-600' },
          { l:'Kritik/Yüksek', v:s.kritikYuksek, c:'text-orange-600' },
          { l:'Risk Puanı', v:s.totalRisk, c:'text-red-700 font-bold' },
        ].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${k.c}`}>{k.v}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.l}</div>
          </div>
        ))}
      </div>

      {/* Traffic Light */}
      <div className={`rounded-xl p-4 mb-5 flex items-center gap-4 ${tlCfg.bg}`}>
        <div className={`w-12 h-12 rounded-full ${tlCfg.dot} flex items-center justify-center text-white text-xl flex-shrink-0`}>●</div>
        <div>
          <div className={`font-bold text-lg ${tlCfg.text}`}>{tlCfg.label}</div>
          <div className={`text-sm ${tlCfg.text} opacity-75`}>Toplam Risk Puanı: {s.totalRisk}</div>
        </div>
      </div>

      {/* Area Stats */}
      {areaStats?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 mb-5 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Alan Bazlı Risk Dağılımı</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-medium">Alan</th>
                <th className="text-right px-4 py-2.5 font-medium">Toplam</th>
                <th className="text-right px-4 py-2.5 font-medium">Uygun</th>
                <th className="text-right px-4 py-2.5 font-medium">Kısmi</th>
                <th className="text-right px-4 py-2.5 font-medium">Uygun Değil</th>
                <th className="text-right px-4 py-2.5 font-medium">Risk Puanı</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {areaStats.map((a: any) => (
                  <tr key={a.area} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{a.area}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{a.total}</td>
                    <td className="px-4 py-2.5 text-right text-green-600">{a.uygun}</td>
                    <td className="px-4 py-2.5 text-right text-amber-600">{a.kismi}</td>
                    <td className={`px-4 py-2.5 text-right ${a.uygunDegil > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>{a.uygunDegil}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-700">{a.totalRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Non-Compliant Items */}
      {nonCompliant?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 mb-5 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Uygun Olmayan Maddeler ({nonCompliant.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {nonCompliant.slice(0, 15).map((item: any) => (
              <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700">{item.controlSubject}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{item.auditArea}</div>
                  {item.findingText && <div className="text-xs text-amber-700 mt-1">{item.findingText}</div>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {item.riskLevel && <span className={`px-2 py-0.5 rounded text-xs ${RISK_COLORS[item.riskLevel] || ''}`}>{RISK_LABELS[item.riskLevel]}</span>}
                  {item.riskScore && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{item.riskScore}p</span>}
                </div>
              </div>
            ))}
            {nonCompliant.length > 15 && <div className="px-4 py-3 text-xs text-slate-400 text-center">+{nonCompliant.length - 15} madde daha...</div>}
          </div>
        </div>
      )}

      {/* Partial Items */}
      {kismi?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Kısmi Uyumlu Maddeler ({kismi.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {kismi.slice(0, 10).map((item: any) => (
              <div key={item.id} className="px-4 py-3">
                <div className="text-sm font-medium text-slate-700">{item.controlSubject}</div>
                <div className="text-xs text-slate-400">{item.auditArea}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
