"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/reports/reports.router.ts v3.1
// Full HTML preview + DOCX export — real data, no placeholders
const express_1 = require("express");
const zod_1 = require("zod");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const risk_service_1 = require("../risk/risk.service");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
const REPORT_DIR = path_1.default.join(process.cwd(), 'uploads', 'reports');
if (!fs_1.default.existsSync(REPORT_DIR))
    fs_1.default.mkdirSync(REPORT_DIR, { recursive: true });
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
// ─── DATA BUILDER ────────────────────────────────────────────────────────────
async function buildReportData(auditId, companyId) {
    const audit = await prisma_1.default.audit.findFirst({
        where: { id: auditId, companyId },
        include: {
            company: true,
            subcontractor: true,
            template: { select: { name: true } },
            items: {
                orderBy: { orderNo: 'asc' },
                include: {
                    evidenceFiles: { where: { status: 'active' }, include: { documentType: { select: { name: true } } } },
                    requiredDocType: { select: { name: true, code: true } },
                    correctiveActions: true,
                    findings: true,
                },
            },
            findings: { include: { correctiveActions: true } },
        },
    });
    if (!audit)
        throw (0, auth_guard_1.createError)('Denetim bulunamadı', 404);
    const stats = (0, risk_service_1.calcAuditStats)(audit.items);
    const areaStats = (0, risk_service_1.calcAreaStats)(audit.items);
    const tl = (0, risk_service_1.getTrafficLight)(stats.totalRisk);
    const nonCompliant = audit.items.filter(i => i.compliance === 'UYGUN_DEGIL');
    const kismi = audit.items.filter(i => i.compliance === 'KISMI');
    const uygun = audit.items.filter(i => i.compliance === 'UYGUN');
    const docMissing = audit.items.filter(i => i.isDocumentRequired && i.evidenceFiles.length === 0);
    const docPresent = audit.items.filter(i => i.isDocumentRequired && i.evidenceFiles.length > 0);
    const openActions = audit.items.filter(i => i.actionStatus === 'ACIK');
    const overdueActions = audit.items.filter(i => i.dueDate && i.actionStatus && !['TAMAMLANDI', 'IPTAL'].includes(i.actionStatus) && new Date(i.dueDate) < new Date());
    return { audit, stats, areaStats, tl, nonCompliant, kismi, uygun, docMissing, docPresent, openActions, overdueActions };
}
// ─── HTML GENERATORS ─────────────────────────────────────────────────────────
function tlColor(tl) { return tl === 'green' ? '#22c55e' : tl === 'yellow' ? '#f59e0b' : '#ef4444'; }
function tlText(tl) { return tl === 'green' ? 'DÜŞÜK RİSK' : tl === 'yellow' ? 'ORTA RİSK' : 'YÜKSEK RİSK'; }
function rlColor(rl) { return rl === 'KRITIK' ? '#dc2626' : rl === 'YUKSEK' ? '#ea580c' : rl === 'ORTA' ? '#f59e0b' : '#22c55e'; }
function compLabel(c) { return c === 'UYGUN' ? 'Uygun' : c === 'KISMI' ? 'Kısmi' : c === 'UYGUN_DEGIL' ? 'Uygun Değil' : '—'; }
function rlLabel(rl) { return rl === 'KRITIK' ? 'Kritik' : rl === 'YUKSEK' ? 'Yüksek' : rl === 'ORTA' ? 'Orta' : rl === 'DUSUK' ? 'Düşük' : '—'; }
function fmtDate(d) { if (!d)
    return '—'; return new Date(d).toLocaleDateString('tr-TR'); }
function pct(a, b) { if (b === 0)
    return '0'; return ((a / b) * 100).toFixed(1); }
function compliancePct(stats) {
    const evaluated = stats.uygun + stats.kismi + stats.uygunDegil;
    if (evaluated === 0)
        return '—';
    return `%${pct(stats.uygun, evaluated)}`;
}
function genDetailedHtml(d, companyLogoPath, subLogoPath, userNotes) {
    const { audit, stats, areaStats, tl, nonCompliant, kismi, docMissing, docPresent } = d;
    const evaluated = stats.uygun + stats.kismi + stats.uygunDegil;
    const riskPct = tl;
    const areaRows = areaStats.slice(0, 20).map(a => `
    <tr>
      <td>${a.area}</td>
      <td style="color:${a.uygunDegil > 0 ? '#ef4444' : '#22c55e'}; font-weight:600">${a.uygunDegil}</td>
      <td style="color:${a.kritikYuksek > 0 ? '#ef4444' : '#555'}">${a.kritikYuksek}</td>
      <td style="font-weight:600">${a.totalRisk}</td>
    </tr>`).join('');
    const nonCompRows = nonCompliant.slice(0, 50).map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#fef2f2'}">
      <td>${i + 1}</td>
      <td><span style="background:#fef2f2;color:#dc2626;padding:1px 5px;border-radius:3px;font-size:11px">${item.auditArea}</span></td>
      <td style="font-size:12px">${item.controlSubject}</td>
      <td style="font-size:11px;color:#666">${item.legalBasis || '—'}</td>
      <td><span style="background:${rlColor(item.riskLevel)};color:#fff;padding:1px 6px;border-radius:3px;font-size:11px">${rlLabel(item.riskLevel)}</span></td>
      <td style="font-size:11px">${item.findingText || '—'}</td>
      <td style="font-size:11px;color:#1d4ed8">${item.correctiveActionText || '—'}</td>
      <td style="font-size:11px">${item.responsiblePerson || '—'}</td>
      <td style="font-size:11px">${fmtDate(item.dueDate)}</td>
    </tr>`).join('');
    const docRows = [...docMissing.map(i => ({ ...i, hasDoc: false })), ...docPresent.map(i => ({ ...i, hasDoc: true }))].map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
      <td>${item.auditArea}</td>
      <td style="font-size:12px">${item.requiredDocType?.name || item.requiredDocNameSnapshot || '—'}</td>
      <td style="color:${item.hasDoc ? '#22c55e' : '#ef4444'};font-weight:600">${item.hasDoc ? '✓ Mevcut' : '✗ Eksik'}</td>
    </tr>`).join('');
    const noteBlocks = userNotes.length > 0 ? userNotes.map(n => `<div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 14px;margin:8px 0;font-size:13px">${n}</div>`).join('') : '<p style="color:#888;font-style:italic">Kullanıcı notu eklenmemiş.</p>';
    const logoLeft = companyLogoPath ? `<img src="${companyLogoPath}" style="height:40px;object-fit:contain" alt="${audit.company.name}">` : `<span style="font-weight:700;font-size:14px">${audit.company.name}</span>`;
    const logoRight = subLogoPath ? `<img src="${subLogoPath}" style="height:40px;object-fit:contain" alt="${audit.subcontractor.name}">` : `<span style="font-weight:700;font-size:14px">${audit.subcontractor.name}</span>`;
    return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin:0; padding:0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size:13px; background:#fff; }
  .page { max-width: 940px; margin: 0 auto; padding: 30px; }
  h1 { font-size:22px; color:#1e293b; } h2 { font-size:16px; color:#1e40af; margin:24px 0 10px; border-bottom:2px solid #dbeafe; padding-bottom:6px; } h3 { font-size:13px; color:#374151; margin:12px 0 6px; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin:10px 0; }
  th { background:#1e40af; color:#fff; padding:6px 8px; text-align:left; font-weight:600; font-size:11px; }
  td { padding:5px 8px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
  .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:14px 0; }
  .stat-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center; }
  .stat-num { font-size:24px; font-weight:700; }
  .stat-lbl { font-size:10px; color:#64748b; margin-top:2px; }
  .tl-badge { display:inline-block; padding:6px 16px; border-radius:20px; color:#fff; font-weight:700; font-size:13px; }
  .cover { background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%); color:#fff; border-radius:12px; padding:36px; margin-bottom:28px; }
  .cover-logo { display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.1); border-radius:8px; padding:12px 16px; margin-bottom:20px; }
  .cover-title { font-size:26px; font-weight:700; margin:10px 0 4px; }
  .cover-sub { font-size:14px; opacity:0.85; }
  .cover-meta { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:16px; font-size:12px; }
  .meta-item { background:rgba(255,255,255,0.1); border-radius:6px; padding:8px; }
  .meta-lbl { opacity:0.7; font-size:10px; } .meta-val { font-weight:600; }
  .section { margin-bottom:28px; }
  .footer { margin-top:40px; border-top:1px solid #e2e8f0; padding-top:12px; text-align:center; font-size:10px; color:#94a3b8; }
  @media print { body { background:#fff; } .page { padding:15px; } }
</style>
</head><body>
<div class="page">

<!-- COVER -->
<div class="cover">
  <div class="cover-logo">
    <div>${logoLeft}</div>
    <div style="text-align:center;font-size:11px;opacity:0.8">mAicheck<br>Workforce Compliance OS</div>
    <div>${logoRight}</div>
  </div>
  <div class="cover-title">Detaylı Denetim Raporu</div>
  <div class="cover-sub">${audit.title || audit.subcontractor.name + ' — ' + audit.periodLabel}</div>
  <div class="cover-meta">
    <div class="meta-item"><div class="meta-lbl">ASİL İŞVEREN</div><div class="meta-val">${audit.company.name}</div></div>
    <div class="meta-item"><div class="meta-lbl">ALT İŞVEREN</div><div class="meta-val">${audit.subcontractor.name}</div></div>
    <div class="meta-item"><div class="meta-lbl">DENETİM DÖNEMİ</div><div class="meta-val">${audit.periodLabel}</div></div>
    <div class="meta-item"><div class="meta-lbl">DENETÇİ</div><div class="meta-val">${audit.auditorName || '—'}</div></div>
    <div class="meta-item"><div class="meta-lbl">RAPOR TARİHİ</div><div class="meta-val">${fmtDate(new Date())}</div></div>
    <div class="meta-item"><div class="meta-lbl">ŞABLON</div><div class="meta-val">${audit.template?.name || '—'}</div></div>
  </div>
</div>

<!-- EXECUTIVE SNAPSHOT -->
<div class="section">
  <h2>1. Özet Risk Değerlendirmesi</h2>
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
    <span class="tl-badge" style="background:${tlColor(tl)}">${tlText(tl)}</span>
    <span style="font-size:14px">Toplam Risk Puanı: <strong>${stats.totalRisk}</strong></span>
    <span style="font-size:14px">Uygunluk Oranı: <strong>${compliancePct(stats)}</strong></span>
  </div>
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-num">${stats.total}</div><div class="stat-lbl">Toplam Kontrol</div></div>
    <div class="stat-box"><div class="stat-num" style="color:#22c55e">${stats.uygun}</div><div class="stat-lbl">Uygun</div></div>
    <div class="stat-box"><div class="stat-num" style="color:#f59e0b">${stats.kismi}</div><div class="stat-lbl">Kısmi Uygun</div></div>
    <div class="stat-box"><div class="stat-num" style="color:#ef4444">${stats.uygunDegil}</div><div class="stat-lbl">Uygun Değil</div></div>
    <div class="stat-box"><div class="stat-num" style="color:#dc2626">${stats.kritikYuksek}</div><div class="stat-lbl">Kritik/Yüksek Risk</div></div>
    <div class="stat-box"><div class="stat-num" style="color:#ea580c">${stats.docMissing}</div><div class="stat-lbl">Eksik Belge</div></div>
    <div class="stat-box"><div class="stat-num" style="color:#f59e0b">${stats.actionOverdue}</div><div class="stat-lbl">Gecikmiş Aksiyon</div></div>
    <div class="stat-box"><div class="stat-num">${evaluated}</div><div class="stat-lbl">Değerlendirilen</div></div>
  </div>
</div>

<!-- COMPANY INFO -->
<div class="section">
  <h2>2. Taraf Bilgileri</h2>
  <table>
    <tr><th colspan="4">Asıl İşveren</th></tr>
    <tr><td><b>Unvan</b></td><td>${audit.company.name}</td><td><b>Vergi No</b></td><td>${audit.company.taxNumber || '—'}</td></tr>
    <tr><td><b>E-posta</b></td><td>${audit.company.email || '—'}</td><td><b>Adres</b></td><td>${audit.company.address || '—'}</td></tr>
  </table>
  <table style="margin-top:10px">
    <tr><th colspan="4">Alt İşveren</th></tr>
    <tr><td><b>Unvan</b></td><td>${audit.subcontractor.name}</td><td><b>Vergi No</b></td><td>${audit.subcontractor.taxNumber || '—'}</td></tr>
    <tr><td><b>SGK Sicil No</b></td><td>${audit.subcontractor.sgkSicilNo || '—'}</td><td><b>Faaliyet Alanı</b></td><td>${audit.subcontractor.workArea || '—'}</td></tr>
    <tr><td><b>Sorumlu Kişi</b></td><td>${audit.subcontractor.responsiblePerson || '—'}</td><td><b>İletişim</b></td><td>${audit.subcontractor.email || '—'}</td></tr>
  </table>
</div>

<!-- AREA RISK TABLE -->
<div class="section">
  <h2>3. Alan Bazlı Risk Dağılımı</h2>
  <table>
    <thead><tr><th>Denetim Alanı</th><th>Uygun Değil</th><th>Kritik/Yüksek</th><th>Risk Puanı</th></tr></thead>
    <tbody>${areaRows}</tbody>
  </table>
</div>

<!-- NON-COMPLIANT ITEMS -->
<div class="section">
  <h2>4. Uygun Olmayan Kontrol Maddeleri (${nonCompliant.length})</h2>
  ${nonCompliant.length === 0 ? '<p style="color:#22c55e;font-weight:600">✓ Bu denetimde uygun olmayan madde tespit edilmemiştir.</p>' : `
  <table>
    <thead><tr><th>#</th><th>Alan</th><th>Kontrol Konusu</th><th>Yasal Dayanak</th><th>Risk</th><th>Bulgu</th><th>Düzeltici Aksiyon</th><th>Sorumlu</th><th>Son Tarih</th></tr></thead>
    <tbody>${nonCompRows}</tbody>
  </table>`}
</div>

<!-- PARTIAL ITEMS -->
<div class="section">
  <h2>5. Kısmi Uygun Maddeler (${kismi.length})</h2>
  ${kismi.length === 0 ? '<p style="color:#888;font-style:italic">Kısmi uygun madde bulunmamaktadır.</p>' : `
  <table>
    <thead><tr><th>#</th><th>Alan</th><th>Kontrol Konusu</th><th>Bulgu</th><th>Aksiyon</th></tr></thead>
    <tbody>${kismi.map((i, n) => `<tr style="background:${n % 2 === 0 ? '#fff' : '#fffbeb'}"><td>${n + 1}</td><td style="font-size:11px">${i.auditArea}</td><td style="font-size:12px">${i.controlSubject}</td><td style="font-size:11px">${i.findingText || '—'}</td><td style="font-size:11px;color:#1d4ed8">${i.correctiveActionText || '—'}</td></tr>`).join('')}</tbody>
  </table>`}
</div>

<!-- DOCUMENT STATUS -->
<div class="section">
  <h2>6. Evrak Bazlı Eksiklik Listesi</h2>
  <p style="font-size:12px;color:#555;margin-bottom:8px">Zorunlu belge gerektiren kontrol maddelerinin belge durumu:</p>
  <table>
    <thead><tr><th>Denetim Alanı</th><th>Belge Türü</th><th>Durum</th></tr></thead>
    <tbody>${docRows || '<tr><td colspan="3" style="text-align:center;color:#888">Belge gerektiren madde değerlendirilmemiş.</td></tr>'}</tbody>
  </table>
</div>

<!-- ACTION PLAN -->
<div class="section">
  <h2>7. Düzeltici Aksiyon Planı</h2>
  <table>
    <thead><tr><th>#</th><th>Alan</th><th>Aksiyon</th><th>Sorumlu</th><th>Son Tarih</th><th>Durum</th></tr></thead>
    <tbody>${d.audit.items.filter(i => i.correctiveActionText).map((i, n) => `
      <tr style="background:${n % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td>${n + 1}</td><td style="font-size:11px">${i.auditArea}</td>
        <td style="font-size:12px">${i.correctiveActionText}</td>
        <td style="font-size:11px">${i.responsiblePerson || '—'}</td>
        <td style="font-size:11px;color:${i.dueDate && new Date(i.dueDate) < new Date() ? '#ef4444' : '#1e293b'}">${fmtDate(i.dueDate)}</td>
        <td style="font-size:11px"><span style="background:${i.actionStatus === 'TAMAMLANDI' ? '#22c55e' : i.actionStatus === 'GECIKTI' ? '#ef4444' : '#f59e0b'};color:#fff;padding:1px 5px;border-radius:3px">${i.actionStatus || 'Açık'}</span></td>
      </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:#888">Aksiyon kaydı bulunmamaktadır.</td></tr>'}</tbody>
  </table>
</div>

<!-- USER NOTES -->
<div class="section">
  <h2>8. Kullanıcı Notları</h2>
  ${noteBlocks}
</div>

<!-- SIGNATURE -->
<div class="section">
  <h2>9. İmza Alanları</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:16px">
    ${['Denetçi', 'Alt İşveren Yetkilisi', 'Asıl İşveren Yetkilisi'].map(role => `
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px">${role}</div>
      <div style="font-weight:600;font-size:13px">${role === 'Denetçi' ? (audit.auditorName || '—') : role === 'Alt İşveren Yetkilisi' ? audit.subcontractor.responsiblePerson || '—' : audit.company.name}</div>
      <div style="margin-top:32px;border-top:1px solid #cbd5e1;padding-top:6px;font-size:10px;color:#94a3b8">İmza / Tarih</div>
    </div>`).join('')}
  </div>
</div>

<div class="footer">
  mAicheck by mAiTechs Smart Solutions — Oluşturulma Tarihi: ${fmtDate(new Date())} — Bu rapor otomatik üretilmiştir. Tahmini finansal etkiler kesin ceza değildir.
</div>
</div></body></html>`;
}
function genExecHtml(d, companyLogoPath, subLogoPath, userNotes) {
    const { audit, stats, areaStats, tl, nonCompliant } = d;
    const evaluated = stats.uygun + stats.kismi + stats.uygunDegil;
    const top10 = nonCompliant.sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0)).slice(0, 10);
    const logoLeft = companyLogoPath ? `<img src="${companyLogoPath}" style="height:36px;object-fit:contain" alt="">` : `<span style="font-weight:700">${audit.company.name}</span>`;
    const logoRight = subLogoPath ? `<img src="${subLogoPath}" style="height:36px;object-fit:contain" alt="">` : `<span style="font-weight:700">${audit.subcontractor.name}</span>`;
    const noteBlocks = userNotes.length > 0 ? userNotes.map(n => `<div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 14px;margin:8px 0;font-size:13px">${n}</div>`).join('') : '';
    const trend = (() => {
        if (stats.uygunDegil === 0)
            return 'Bu denetimde hiç uygunsuzluk tespit edilmemiştir. Mevcut uyum seviyesi korunmalıdır.';
        if (stats.kritikYuksek > 3)
            return `${stats.kritikYuksek} adet kritik/yüksek risk tespiti öne çıkmaktadır. Derhal müdahale gereklidir.`;
        return `${stats.uygunDegil} uygunsuzluk maddesi tespit edilmiştir. Risk seviyesi ${tlText(tl)} olarak değerlendirilmiştir.`;
    })();
    return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8">
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#1e293b; font-size:13px; background:#fff; }
  .page { max-width:900px; margin:0 auto; padding:30px; }
  h1 { font-size:20px; } h2 { font-size:15px; color:#1e40af; margin:22px 0 9px; border-bottom:2px solid #dbeafe; padding-bottom:5px; }
  p { line-height:1.7; margin-bottom:8px; }
  .cover { background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%); color:#fff; border-radius:12px; padding:32px; margin-bottom:26px; }
  .cover-logo { display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.1); border-radius:8px; padding:10px 14px; margin-bottom:18px; }
  .cover-badge { display:inline-block; padding:4px 14px; border-radius:20px; color:#fff; font-weight:700; font-size:12px; margin-top:10px; }
  .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:14px 0; }
  .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:center; }
  .kpi-n { font-size:22px; font-weight:700; } .kpi-l { font-size:10px; color:#64748b; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin:10px 0; }
  th { background:#1e40af; color:#fff; padding:6px 8px; text-align:left; font-size:11px; }
  td { padding:5px 8px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
  .badge { display:inline-block; padding:2px 7px; border-radius:12px; color:#fff; font-size:10px; font-weight:600; }
  .footer { margin-top:36px; border-top:1px solid #e2e8f0; padding-top:10px; text-align:center; font-size:10px; color:#94a3b8; }
</style>
</head><body>
<div class="page">

<div class="cover">
  <div class="cover-logo">
    <div>${logoLeft}</div>
    <div style="text-align:center;font-size:11px;opacity:0.75">mAicheck<br>Workforce Compliance OS</div>
    <div>${logoRight}</div>
  </div>
  <div style="font-size:11px;opacity:0.7;margin-bottom:4px">YÖNETİCİ ÖZETİ RAPORU</div>
  <h1 style="color:#fff">${audit.subcontractor.name} — ${audit.periodLabel}</h1>
  <div style="font-size:13px;opacity:0.8;margin-top:4px">${audit.company.name} | Denetçi: ${audit.auditorName || '—'} | ${fmtDate(new Date())}</div>
  <span class="cover-badge" style="background:${tlColor(tl)}">${tlText(tl)} — Risk Puanı: ${stats.totalRisk}</span>
</div>

<h2>1. Denetimin Amacı ve Kapsamı</h2>
<p>${audit.company.name} bünyesinde hizmet veren ${audit.subcontractor.name} alt işverenine ait ${audit.periodLabel} dönemi; iş hukuku, SGK mevzuatı, vergi yükümlülükleri ve İSG gereklilikleri kapsamında denetlenmiştir. Denetimde toplam <strong>${stats.total}</strong> kontrol maddesi değerlendirilmiştir.</p>

<h2>2. Genel Risk Durumu</h2>
<p>${trend}</p>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-n">${stats.total}</div><div class="kpi-l">Toplam Kontrol</div></div>
  <div class="kpi"><div class="kpi-n" style="color:#22c55e">${stats.uygun}</div><div class="kpi-l">Uygun</div></div>
  <div class="kpi"><div class="kpi-n" style="color:#ef4444">${stats.uygunDegil}</div><div class="kpi-l">Uygun Değil</div></div>
  <div class="kpi"><div class="kpi-n" style="color:#dc2626">${stats.kritikYuksek}</div><div class="kpi-l">Kritik/Yüksek Risk</div></div>
  <div class="kpi"><div class="kpi-n" style="color:#ea580c">${stats.docMissing}</div><div class="kpi-l">Eksik Belge</div></div>
  <div class="kpi"><div class="kpi-n" style="color:#f59e0b">${stats.actionOverdue}</div><div class="kpi-l">Gecikmiş Aksiyon</div></div>
</div>
<p><strong>Uygunluk Oranı:</strong> ${compliancePct(stats)} (${stats.uygun}/${evaluated} değerlendirilen madde)</p>

<h2>3. En Kritik 10 Bulgu</h2>
${top10.length === 0 ? '<p style="color:#22c55e;font-weight:600">Kritik bulgu tespit edilmemiştir.</p>' : `
<table>
  <thead><tr><th>#</th><th>Alan</th><th>Bulgu</th><th>Risk</th><th>Aksiyon</th><th>Son Tarih</th></tr></thead>
  <tbody>${top10.map((i, n) => `<tr style="background:${n % 2 === 0 ? '#fff' : '#fef2f2'}">
    <td>${n + 1}</td>
    <td style="font-size:11px">${i.auditArea}</td>
    <td style="font-size:11px">${i.findingText || i.controlSubject}</td>
    <td><span class="badge" style="background:${rlColor(i.riskLevel)}">${rlLabel(i.riskLevel)}</span></td>
    <td style="font-size:11px;color:#1d4ed8">${i.correctiveActionText ? i.correctiveActionText.substring(0, 60) + '...' : '—'}</td>
    <td style="font-size:11px;color:${i.dueDate && new Date(i.dueDate) < new Date() ? '#ef4444' : '#1e293b'}">${fmtDate(i.dueDate)}</td>
  </tr>`).join('')}</tbody>
</table>`}

<h2>4. Alan Bazlı Risk Dağılımı</h2>
<table>
  <thead><tr><th>Alan</th><th>Uygun Değil</th><th>Kritik/Yüksek</th><th>Risk Puanı</th></tr></thead>
  <tbody>${areaStats.filter(a => a.totalRisk > 0).slice(0, 15).map((a, n) => `<tr style="background:${n % 2 === 0 ? '#fff' : '#f9fafb'}">
    <td>${a.area}</td>
    <td style="color:${a.uygunDegil > 0 ? '#ef4444' : '#22c55e'};font-weight:600">${a.uygunDegil}</td>
    <td style="color:${a.kritikYuksek > 0 ? '#dc2626' : '#555'}">${a.kritikYuksek}</td>
    <td style="font-weight:600">${a.totalRisk}</td>
  </tr>`).join('')}</tbody>
</table>

<h2>5. Alt İşveren Performans Değerlendirmesi</h2>
<p>${audit.subcontractor.name} firması ${audit.periodLabel} dönemi denetiminde ${evaluated} madde üzerinden değerlendirilmiştir. Uygunluk oranı <strong>${compliancePct(stats)}</strong>, toplam risk puanı <strong>${stats.totalRisk}</strong> olarak hesaplanmıştır.</p>
<p>Eksik belge sayısı: <strong>${stats.docMissing}</strong> | Gecikmiş aksiyon: <strong>${stats.actionOverdue}</strong></p>

<h2>6. Kritik Aksiyon Önerileri</h2>
${stats.kritikYuksek === 0 ? '<p>Kritik düzeyde acil aksiyon gerektiren madde bulunmamaktadır.</p>' : `
<ol style="padding-left:18px;line-height:1.9">${nonCompliant.filter(i => i.riskLevel === 'KRITIK' || i.riskLevel === 'YUKSEK').slice(0, 8).map(i => `<li><strong>${i.auditArea}:</strong> ${i.correctiveActionText || i.controlSubject} — Sorumlu: ${i.responsiblePerson || '—'}</li>`).join('')}</ol>`}

<h2>7. Yönetim Kararı Gerektiren Konular</h2>
${[
        stats.kritikYuksek > 0 ? `<li><strong>Kritik/Yüksek Risk:</strong> ${stats.kritikYuksek} madde yönetim düzeyinde karar ve takip gerektirmektedir.</li>` : '',
        stats.docMissing > 0 ? `<li><strong>Eksik Belge:</strong> ${stats.docMissing} zorunlu belge eksik. Cari denetim döneminde teslim zorunludur.</li>` : '',
        stats.actionOverdue > 0 ? `<li><strong>Gecikmiş Aksiyon:</strong> ${stats.actionOverdue} aksiyon son tarihini aşmıştır.</li>` : '',
    ].filter(Boolean).join('') || '<li>Acil yönetim kararı gerektiren husus tespit edilmemiştir.</li>'}

<h2>8. Sonuç ve Öneriler</h2>
<p>${audit.subcontractor.name} firması ${audit.periodLabel} döneminde <span style="color:${tlColor(tl)};font-weight:700">${tlText(tl)}</span> kategorisinde değerlendirilmiştir. ${stats.uygunDegil} adet uygunsuzluk tespit edilmiş olup bu maddelere ilişkin düzeltici aksiyonlar tanımlanmıştır.</p>
<p>Öncelikli olarak ${stats.kritikYuksek > 0 ? `${stats.kritikYuksek} kritik/yüksek riskli bulgu` : 'tespit edilen uygunsuzluklar'} için aksiyon planı hayata geçirilmeli, eksik belgeler ivedilikle tamamlanmalı ve sonraki denetimde kapanış kontrolleri yapılmalıdır.</p>
${noteBlocks ? `<h2>9. Denetçi Notları</h2>${noteBlocks}` : ''}

<div class="footer">mAicheck by mAiTechs Smart Solutions — Yönetici Özeti — ${fmtDate(new Date())} — Bu rapor otomatik üretilmiştir.</div>
</div></body></html>`;
}
// ─── DOCX GENERATOR ──────────────────────────────────────────────────────────
async function generateDocx(d, reportType, notes) {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType } = await Promise.resolve().then(() => __importStar(require('docx')));
    const { audit, stats, areaStats, nonCompliant, kismi, tl } = d;
    const evaluated = stats.uygun + stats.kismi + stats.uygunDegil;
    const fmtD = (dt) => dt ? new Date(dt).toLocaleDateString('tr-TR') : '—';
    const mkPara = (text, bold = false, size = 22, color) => new Paragraph({ children: [new TextRun({ text, bold, size, color })] });
    const mkHead = (text, level = HeadingLevel.HEADING_2) => new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
    const infoTable = (rows) => new Table({
        rows: rows.map(([k, v]) => new TableRow({ children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 18 })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, size: 18 })] })], width: { size: 70, type: WidthType.PERCENTAGE } }),
            ] })),
        width: { size: 100, type: WidthType.PERCENTAGE },
    });
    const headerRow = (cols) => new TableRow({ tableHeader: true, children: cols.map(c => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, size: 18, color: 'FFFFFF' })] })], shading: { type: ShadingType.SOLID, color: '1e40af' } })) });
    const sections = [];
    if (reportType === 'DETAYLI') {
        sections.push(new Paragraph({ text: 'DETAYLı DENETİM RAPORU', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }), mkPara(`${audit.company.name} — ${audit.subcontractor.name}`, true, 26), mkPara(`Dönem: ${audit.periodLabel} | Rapor Tarihi: ${fmtD(new Date())}`, false, 20, '64748b'), new Paragraph({ text: '', spacing: { after: 200 } }), mkHead('1. Taraf Bilgileri'), mkPara('Asıl İşveren:', true), infoTable([['Unvan', audit.company.name], ['Vergi No', audit.company.taxNumber || '—'], ['Adres', audit.company.address || '—']]), new Paragraph({ text: '', spacing: { after: 100 } }), mkPara('Alt İşveren:', true), infoTable([['Unvan', audit.subcontractor.name], ['Vergi No', audit.subcontractor.taxNumber || '—'], ['SGK Sicil No', audit.subcontractor.sgkSicilNo || '—'], ['Sorumlu', audit.subcontractor.responsiblePerson || '—']]), mkHead('2. Denetim Bilgileri'), infoTable([['Dönem', audit.periodLabel || '—'], ['Dönem Türü', audit.periodType === 'SINGLE' ? 'Tek Dönem' : 'Dönem Aralığı'], ['Denetçi', audit.auditorName || '—'], ['Şablon', audit.template?.name || '—'], ['Rapor Tarihi', fmtD(new Date())]]), mkHead('3. Özet İstatistikler'), infoTable([['Toplam Kontrol', String(stats.total)], ['Uygun', String(stats.uygun)], ['Kısmi Uygun', String(stats.kismi)], ['Uygun Değil', String(stats.uygunDegil)], ['Kritik/Yüksek', String(stats.kritikYuksek)], ['Eksik Belge', String(stats.docMissing)], ['Toplam Risk Puanı', String(stats.totalRisk)], ['Uygunluk Oranı', `${pct(stats.uygun, evaluated || 1)}%`]]), mkHead('4. Alan Bazlı Risk Tablosu'), new Table({
            rows: [
                headerRow(['Denetim Alanı', 'Uygun Değil', 'Kritik/Yüksek', 'Risk Puanı']),
                ...areaStats.slice(0, 20).map(a => new TableRow({ children: [
                        new TableCell({ children: [mkPara(a.area)] }),
                        new TableCell({ children: [mkPara(String(a.uygunDegil), true, 20, a.uygunDegil > 0 ? 'ef4444' : '22c55e')] }),
                        new TableCell({ children: [mkPara(String(a.kritikYuksek), true, 20, a.kritikYuksek > 0 ? 'dc2626' : '333333')] }),
                        new TableCell({ children: [mkPara(String(a.totalRisk), true)] }),
                    ] })),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
        }), mkHead('5. Uygun Olmayan Maddeler'), ...nonCompliant.length === 0 ? [mkPara('Bu denetimde uygun olmayan madde tespit edilmemiştir.', false, 20, '22c55e')] : [
            new Table({
                rows: [
                    headerRow(['#', 'Alan', 'Kontrol Konusu', 'Risk', 'Bulgu', 'Aksiyon', 'Sorumlu', 'Son Tarih']),
                    ...nonCompliant.slice(0, 40).map((i, n) => new TableRow({ children: [
                            new TableCell({ children: [mkPara(String(n + 1))] }),
                            new TableCell({ children: [mkPara(i.auditArea, false, 16)] }),
                            new TableCell({ children: [mkPara(i.controlSubject, false, 16)] }),
                            new TableCell({ children: [mkPara(rlLabel(i.riskLevel), true, 16, rlColor(i.riskLevel).replace('#', ''))] }),
                            new TableCell({ children: [mkPara(i.findingText || '—', false, 16)] }),
                            new TableCell({ children: [mkPara(i.correctiveActionText || '—', false, 16)] }),
                            new TableCell({ children: [mkPara(i.responsiblePerson || '—', false, 16)] }),
                            new TableCell({ children: [mkPara(fmtD(i.dueDate), false, 16)] }),
                        ] })),
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
            }),
        ], mkHead('6. Kısmi Uygun Maddeler'), ...kismi.length === 0 ? [mkPara('Kısmi uygun madde bulunmamaktadır.')] : [
            new Table({ rows: [headerRow(['#', 'Alan', 'Kontrol Konusu', 'Bulgu', 'Aksiyon']), ...kismi.map((i, n) => new TableRow({ children: [new TableCell({ children: [mkPara(String(n + 1))] }), new TableCell({ children: [mkPara(i.auditArea, false, 16)] }), new TableCell({ children: [mkPara(i.controlSubject, false, 16)] }), new TableCell({ children: [mkPara(i.findingText || '—', false, 16)] }), new TableCell({ children: [mkPara(i.correctiveActionText || '—', false, 16)] })] }))], width: { size: 100, type: WidthType.PERCENTAGE } }),
        ], ...(notes.length > 0 ? [mkHead('7. Kullanıcı Notları'), ...notes.map(n => mkPara(`• ${n}`, false, 20))] : []), mkHead('8. İmza Alanları'), new Paragraph({ text: '', spacing: { after: 600 } }), mkPara('Denetçi: ____________________     Alt İşveren Yetkilisi: ____________________     Asıl İşveren Yetkilisi: ____________________'), new Paragraph({ text: '', spacing: { after: 200 } }), mkPara('mAicheck by mAiTechs Smart Solutions', false, 18, '94a3b8'));
    }
    else {
        // EXEC SUMMARY
        const top10 = nonCompliant.sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0)).slice(0, 10);
        sections.push(new Paragraph({ text: 'YÖNETİCİ ÖZETİ RAPORU', heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }), mkPara(`${audit.subcontractor.name} — ${audit.periodLabel}`, true, 24), mkPara(`${audit.company.name} | ${fmtD(new Date())}`, false, 20, '64748b'), new Paragraph({ text: '', spacing: { after: 180 } }), mkHead('1. Denetimin Amacı'), mkPara(`${audit.company.name} bünyesinde hizmet veren ${audit.subcontractor.name} firması için ${audit.periodLabel} dönemi; iş hukuku, SGK, vergi ve İSG kapsamında denetlenmiştir. Toplam ${stats.total} kontrol maddesi değerlendirilmiştir.`), mkHead('2. Genel Risk Durumu'), infoTable([['Toplam Risk Puanı', String(stats.totalRisk)], ['Risk Seviyesi', tlText(tl)], ['Uygun Madde', String(stats.uygun)], ['Uygun Değil', String(stats.uygunDegil)], ['Kritik/Yüksek', String(stats.kritikYuksek)], ['Uygunluk Oranı', `${pct(stats.uygun, evaluated || 1)}%`], ['Eksik Belge', String(stats.docMissing)]]), mkHead('3. En Kritik 10 Bulgu'), ...top10.length === 0 ? [mkPara('Kritik bulgu tespit edilmemiştir.', false, 20, '22c55e')] : [
            new Table({ rows: [headerRow(['#', 'Alan', 'Bulgu', 'Risk', 'Aksiyon', 'Son Tarih']), ...top10.map((i, n) => new TableRow({ children: [new TableCell({ children: [mkPara(String(n + 1))] }), new TableCell({ children: [mkPara(i.auditArea, false, 16)] }), new TableCell({ children: [mkPara(i.findingText || i.controlSubject, false, 16)] }), new TableCell({ children: [mkPara(rlLabel(i.riskLevel), true, 16, rlColor(i.riskLevel).replace('#', ''))] }), new TableCell({ children: [mkPara(i.correctiveActionText || '—', false, 16)] }), new TableCell({ children: [mkPara(fmtD(i.dueDate), false, 16)] })] }))], width: { size: 100, type: WidthType.PERCENTAGE } }),
        ], mkHead('4. Alan Bazlı Risk Dağılımı'), new Table({ rows: [headerRow(['Alan', 'Uygun Değil', 'Kritik/Yüksek', 'Risk Puanı']), ...areaStats.filter(a => a.totalRisk > 0).slice(0, 15).map(a => new TableRow({ children: [new TableCell({ children: [mkPara(a.area)] }), new TableCell({ children: [mkPara(String(a.uygunDegil), true, 20, a.uygunDegil > 0 ? 'ef4444' : '22c55e')] }), new TableCell({ children: [mkPara(String(a.kritikYuksek), false, 20)] }), new TableCell({ children: [mkPara(String(a.totalRisk), true)] })] }))], width: { size: 100, type: WidthType.PERCENTAGE } }), mkHead('5. Performans Değerlendirmesi'), mkPara(`${audit.subcontractor.name}: Uygunluk oranı ${pct(stats.uygun, evaluated || 1)}%, toplam risk puanı ${stats.totalRisk}. Risk seviyesi: ${tlText(tl)}.`), mkHead('6. Kritik Aksiyon Önerileri'), ...nonCompliant.filter(i => i.riskLevel === 'KRITIK' || i.riskLevel === 'YUKSEK').slice(0, 8).map((i, n) => mkPara(`${n + 1}. [${i.auditArea}] ${i.correctiveActionText || i.controlSubject} — Sorumlu: ${i.responsiblePerson || '—'} — Son Tarih: ${fmtD(i.dueDate)}`)), mkHead('7. Sonuç ve Öneriler'), mkPara(`${audit.subcontractor.name} firması ${audit.periodLabel} dönemi denetiminde ${tlText(tl)} kategorisinde değerlendirilmiştir. ${stats.uygunDegil} uygunsuzluk tespit edilmiş olup düzeltici aksiyonlar tanımlanmıştır. Eksik ${stats.docMissing} belgenin ivedilikle tamamlanması önerilmektedir.`), ...(notes.length > 0 ? [mkHead('8. Denetçi Notları'), ...notes.map(n => mkPara(`• ${n}`, false, 20))] : []), new Paragraph({ text: '', spacing: { after: 300 } }), mkPara('mAicheck by mAiTechs Smart Solutions', false, 18, '94a3b8'));
    }
    const doc = new Document({ sections: [{ properties: {}, children: sections }] });
    const buffer = await Packer.toBuffer(doc);
    const filename = `report_${reportType.toLowerCase()}_${Date.now()}.docx`;
    const filepath = path_1.default.join(REPORT_DIR, filename);
    fs_1.default.writeFileSync(filepath, buffer);
    return `/uploads/reports/${filename}`;
}
// ─── ROUTES ──────────────────────────────────────────────────────────────────
router.get('/audit/:auditId', async (req, res) => {
    const audit = await prisma_1.default.audit.findFirst({ where: { id: req.params.auditId, companyId: req.user.companyId } });
    if (!audit)
        throw (0, auth_guard_1.createError)('Denetim bulunamadı', 404);
    const reports = await prisma_1.default.report.findMany({ where: { auditId: req.params.auditId, companyId: req.user.companyId }, include: { generatedBy: { select: { name: true } }, versions: { orderBy: { versionNo: 'desc' }, take: 5, include: { createdBy: { select: { name: true } } } }, notes: { include: { user: { select: { name: true } } } } }, orderBy: { generatedAt: 'desc' } });
    res.json(reports);
});
// POST /api/reports/generate — build HTML + DOCX
router.post('/generate', async (req, res) => {
    const schema = zod_1.z.object({ auditId: zod_1.z.string().uuid(), reportType: zod_1.z.enum(['DETAYLI', 'YONETICI_OZETI']), notes: zod_1.z.array(zod_1.z.string()).optional() });
    const { auditId, reportType, notes = [] } = schema.parse(req.body);
    const audit = await prisma_1.default.audit.findFirst({ where: { id: auditId, companyId: req.user.companyId } });
    if (!audit)
        throw (0, auth_guard_1.createError)('Denetim bulunamadı', 404);
    const d = await buildReportData(auditId, req.user.companyId);
    const company = await prisma_1.default.company.findUnique({ where: { id: req.user.companyId } });
    const htmlContent = reportType === 'DETAYLI'
        ? genDetailedHtml(d, company?.logoPath || null, d.audit.subcontractor.logoPath || null, notes)
        : genExecHtml(d, company?.logoPath || null, d.audit.subcontractor.logoPath || null, notes);
    let docxPath = null;
    try {
        docxPath = await generateDocx(d, reportType, notes);
    }
    catch (err) {
        console.warn('DOCX gen failed:', err.message);
    }
    // Get or create report record
    let report = await prisma_1.default.report.findFirst({ where: { auditId, companyId: req.user.companyId, reportType: reportType } });
    if (!report) {
        report = await prisma_1.default.report.create({ data: { companyId: req.user.companyId, auditId, reportType: reportType, title: `${reportType === 'DETAYLI' ? 'Detaylı Denetim Raporu' : 'Yönetici Özeti'} — ${d.audit.periodLabel}`, status: 'YAYINLANDI', generatedById: req.user.id } });
    }
    else {
        await prisma_1.default.report.update({ where: { id: report.id }, data: { updatedAt: new Date() } });
    }
    const lastVersion = await prisma_1.default.reportVersion.findFirst({ where: { reportId: report.id }, orderBy: { versionNo: 'desc' } });
    const versionNo = (lastVersion?.versionNo ?? 0) + 1;
    const version = await prisma_1.default.reportVersion.create({ data: { reportId: report.id, versionNo, systemContentJson: { stats: d.stats, areaStats: d.areaStats, nonCompliantCount: d.nonCompliant.length }, htmlContent, docxPath, createdById: req.user.id } });
    if (notes.length > 0) {
        await Promise.all(notes.map(n => prisma_1.default.reportUserNote.create({ data: { reportId: report.id, reportVersionId: version.id, userId: req.user.id, noteContent: n } })));
    }
    res.json({ reportId: report.id, versionId: version.id, versionNo, htmlContent, docxPath, reportType, title: report.title, generatedAt: version.createdAt });
});
// GET /api/reports/:id/html — preview latest version
router.get('/:id/html', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('report', req.params.id, req.user.companyId);
    const version = await prisma_1.default.reportVersion.findFirst({ where: { reportId: req.params.id }, orderBy: { versionNo: 'desc' } });
    if (!version?.htmlContent) {
        res.status(404).json({ message: 'HTML içerik bulunamadı. Raporu yeniden oluşturun.' });
        return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(version.htmlContent);
});
// GET /api/reports/:id/docx — download latest DOCX
router.get('/:id/docx', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('report', req.params.id, req.user.companyId);
    const version = await prisma_1.default.reportVersion.findFirst({ where: { reportId: req.params.id }, orderBy: { versionNo: 'desc' } });
    if (!version?.docxPath) {
        res.status(404).json({ message: 'DOCX bulunamadı. Raporu yeniden oluşturun.' });
        return;
    }
    const filepath = path_1.default.join(process.cwd(), version.docxPath);
    if (!fs_1.default.existsSync(filepath)) {
        res.status(404).json({ message: 'DOCX dosyası sunucuda bulunamadı.' });
        return;
    }
    res.download(filepath, `maicheck_report_v${version.versionNo}.docx`);
});
// GET /api/reports/:id/version/:vid/html
router.get('/:id/version/:vid/html', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('report', req.params.id, req.user.companyId);
    const version = await prisma_1.default.reportVersion.findFirst({ where: { id: req.params.vid, reportId: req.params.id } });
    if (!version?.htmlContent) {
        res.status(404).json({ message: 'Bu versiyon için HTML bulunamadı.' });
        return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(version.htmlContent);
});
// POST /api/reports/:id/notes
router.post('/:id/notes', async (req, res) => {
    await (0, auth_guard_1.assertTenant)('report', req.params.id, req.user.companyId);
    const schema = zod_1.z.object({ noteTitle: zod_1.z.string().optional(), noteContent: zod_1.z.string().min(1) });
    const data = schema.parse(req.body);
    const note = await prisma_1.default.reportUserNote.create({ data: { reportId: req.params.id, userId: req.user.id, ...data } });
    res.status(201).json(note);
});
router.get('/', async (req, res) => {
    const reports = await prisma_1.default.report.findMany({ where: { companyId: req.user.companyId }, include: { audit: { select: { periodLabel: true, subcontractor: { select: { name: true } } } }, generatedBy: { select: { name: true } }, versions: { orderBy: { versionNo: 'desc' }, take: 1 }, _count: { select: { notes: true } } }, orderBy: { generatedAt: 'desc' }, take: 50 });
    res.json(reports);
});
exports.default = router;
//# sourceMappingURL=reports.router.js.map