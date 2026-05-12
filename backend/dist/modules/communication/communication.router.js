"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/communication/communication.router.ts v3.1
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../../database/prisma"));
const auth_guard_1 = require("../../common/guards/auth.guard");
const router = (0, express_1.Router)();
router.use(auth_guard_1.authGuard);
// ─── CONTACTS ────────────────────────────────────────────────────────────────
router.get('/contacts', async (req, res) => {
    const { subId } = req.query;
    const contacts = await prisma_1.default.contact.findMany({
        where: { companyId: req.user.companyId, isActive: true, ...(subId ? { subcontractorId: subId } : {}) },
        include: { subcontractor: { select: { name: true } } },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
    res.json(contacts);
});
router.post('/contacts', async (req, res) => {
    const schema = zod_1.z.object({ subcontractorId: zod_1.z.string().uuid().optional(), name: zod_1.z.string().min(2), title: zod_1.z.string().optional(), email: zod_1.z.string().email().optional().or(zod_1.z.literal('')), phone: zod_1.z.string().optional(), isPrimary: zod_1.z.boolean().default(false) });
    const data = schema.parse(req.body);
    const contact = await prisma_1.default.contact.create({ data: { ...data, email: data.email || null, companyId: req.user.companyId } });
    res.status(201).json(contact);
});
router.patch('/contacts/:id', async (req, res) => {
    const schema = zod_1.z.object({ name: zod_1.z.string().optional(), title: zod_1.z.string().nullable().optional(), email: zod_1.z.string().optional(), phone: zod_1.z.string().nullable().optional(), isPrimary: zod_1.z.boolean().optional(), isActive: zod_1.z.boolean().optional() });
    const data = schema.parse(req.body);
    await prisma_1.default.contact.updateMany({ where: { id: req.params.id, companyId: req.user.companyId }, data });
    res.json({ ok: true });
});
// ─── MAIL DRAFTS ─────────────────────────────────────────────────────────────
const MAIL_TEMPLATES = {
    EKSIK_BELGE: (v) => ({
        subject: `[mAicheck] Eksik Belge Bildirimi — ${v.subName} / ${v.period}`,
        body: `Sayın ${v.contactName || 'İlgili'},\n\n${v.companyName} adına yürütülen ${v.period} dönemi alt işveren denetimine ilişkin olarak, ${v.subName} firmamıza ait aşağıdaki belgeler sisteme yüklenmemiş veya eksik bulunmuştur:\n\n${v.items}\n\nBu belgelerin en geç ${v.dueDate || '5 iş günü'} içinde sisteme yüklenmesi veya tarafımıza iletilmesi gerekmektedir.\n\nDenetim sürecinin sağlıklı yürütülebilmesi için gerekli hassasiyeti göstereceğinizi umarız.\n\nSaygılarımızla,\n${v.auditorName}\n${v.companyName}`,
    }),
    AKSIYON: (v) => ({
        subject: `[mAicheck] Düzeltici Aksiyon Bildirimi — ${v.subName} / ${v.period}`,
        body: `Sayın ${v.contactName || 'İlgili'},\n\n${v.period} dönemi denetiminde tespit edilen uygunsuzluklara ilişkin düzeltici aksiyonlar aşağıda belirtilmiştir:\n\n${v.items}\n\nBelirtilen aksiyonların son tarihlerine kadar tamamlanması ve sonuçların sisteme yüklenmesi beklenmektedir.\n\nSaygılarımızla,\n${v.auditorName}\n${v.companyName}`,
    }),
    SURE_ASIMI: (v) => ({
        subject: `[mAicheck] ⚠ Süre Aşımı Uyarısı — ${v.subName}`,
        body: `Sayın ${v.contactName || 'İlgili'},\n\nAşağıdaki aksiyonların son tarihleri geçmiş olup henüz tamamlanmamıştır:\n\n${v.items}\n\nBu konuda derhal harekete geçilmesi gerekmektedir. Aksi hâlde ilgili bulgular "Gecikmiş" olarak kayıt altına alınacaktır.\n\nSaygılarımızla,\n${v.auditorName}\n${v.companyName}`,
    }),
    RAPOR: (v) => ({
        subject: `[mAicheck] Denetim Raporu Paylaşımı — ${v.subName} / ${v.period}`,
        body: `Sayın ${v.contactName || 'İlgili'},\n\n${v.period} dönemine ait denetim raporu hazırlanmış olup ektedir.\n\nRapor özeti:\n- Toplam kontrol: ${v.total || '—'}\n- Uygunluk oranı: ${v.compliance || '—'}\n- Risk puanı: ${v.risk || '—'}\n\nRaporla ilgili sorularınız için tarafımıza ulaşabilirsiniz.\n\nSaygılarımızla,\n${v.auditorName}\n${v.companyName}`,
    }),
    KAPANIS: (v) => ({
        subject: `[mAicheck] Denetim Kapatma Bildirimi — ${v.subName} / ${v.period}`,
        body: `Sayın ${v.contactName || 'İlgili'},\n\n${v.period} dönemi denetimi başarıyla tamamlanmış ve kapatılmıştır.\n\nDenetim sürecindeki iş birliğiniz için teşekkür ederiz.\n\nSaygılarımızla,\n${v.auditorName}\n${v.companyName}`,
    }),
};
// POST /api/communication/generate-draft
router.post('/generate-draft', async (req, res) => {
    const schema = zod_1.z.object({
        templateType: zod_1.z.enum(['EKSIK_BELGE', 'AKSIYON', 'SURE_ASIMI', 'RAPOR', 'KAPANIS']),
        auditId: zod_1.z.string().uuid().optional(),
        contactId: zod_1.z.string().uuid().optional(),
        toEmail: zod_1.z.string().email().optional(),
        vars: zod_1.z.record(zod_1.z.any()).optional(),
    });
    const data = schema.parse(req.body);
    let vars = data.vars || {};
    if (data.auditId) {
        const audit = await prisma_1.default.audit.findFirst({ where: { id: data.auditId, companyId: req.user.companyId }, include: { subcontractor: true, company: true } });
        if (audit) {
            vars.subName = vars.subName || audit.subcontractor.name;
            vars.companyName = vars.companyName || audit.company.name;
            vars.period = vars.period || audit.periodLabel;
            vars.auditorName = vars.auditorName || audit.auditorName || req.user.name;
        }
        if (data.templateType === 'EKSIK_BELGE' && !vars.items) {
            const items = await prisma_1.default.auditItem.findMany({ where: { auditId: data.auditId, isDocumentRequired: true }, include: { evidenceFiles: { where: { status: 'active' }, select: { id: true } } } });
            const missing = items.filter(i => i.evidenceFiles.length === 0);
            vars.items = missing.map((i, n) => `${n + 1}. ${i.auditArea} — ${i.controlSubject} (${i.requiredDocNameSnapshot || '—'})`).join('\n');
        }
        if (data.templateType === 'AKSIYON' && !vars.items) {
            const actions = await prisma_1.default.auditItem.findMany({ where: { auditId: data.auditId, compliance: 'UYGUN_DEGIL', correctiveActionText: { not: null } } });
            vars.items = actions.map((i, n) => `${n + 1}. ${i.auditArea} — ${i.correctiveActionText}\n   Sorumlu: ${i.responsiblePerson || '—'} | Son Tarih: ${i.dueDate ? new Date(i.dueDate).toLocaleDateString('tr-TR') : '—'}`).join('\n\n');
        }
        if (data.templateType === 'SURE_ASIMI' && !vars.items) {
            const overdue = await prisma_1.default.auditItem.findMany({ where: { auditId: data.auditId, dueDate: { lt: new Date() }, actionStatus: { notIn: ['TAMAMLANDI', 'IPTAL'] }, compliance: { not: null } } });
            vars.items = overdue.map((i, n) => `${n + 1}. ${i.auditArea} — ${i.controlSubject}\n   Son Tarih: ${i.dueDate ? new Date(i.dueDate).toLocaleDateString('tr-TR') : '—'}`).join('\n\n');
        }
    }
    if (data.contactId) {
        const contact = await prisma_1.default.contact.findFirst({ where: { id: data.contactId, companyId: req.user.companyId } });
        if (contact) {
            vars.contactName = contact.name;
            if (!data.toEmail)
                vars.toEmail = contact.email;
        }
    }
    const gen = MAIL_TEMPLATES[data.templateType](vars);
    const draft = await prisma_1.default.mailDraft.create({
        data: { companyId: req.user.companyId, auditId: data.auditId || null, contactId: data.contactId || null, toEmail: data.toEmail || vars.toEmail || null, subject: gen.subject, bodyText: gen.body, templateType: data.templateType, createdById: req.user.id },
    });
    res.status(201).json({ ...draft, mailtoLink: `mailto:${draft.toEmail || ''}?subject=${encodeURIComponent(gen.subject)}&body=${encodeURIComponent(gen.body)}` });
});
router.get('/drafts', async (req, res) => {
    const drafts = await prisma_1.default.mailDraft.findMany({ where: { companyId: req.user.companyId }, include: { contact: { select: { name: true } }, audit: { select: { periodLabel: true, subcontractor: { select: { name: true } } } }, createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json(drafts);
});
router.patch('/drafts/:id', async (req, res) => {
    const schema = zod_1.z.object({ subject: zod_1.z.string().optional(), bodyText: zod_1.z.string().optional(), toEmail: zod_1.z.string().optional(), status: zod_1.z.enum(['TASLAK', 'GONDERILDI']).optional() });
    const data = schema.parse(req.body);
    await prisma_1.default.mailDraft.updateMany({ where: { id: req.params.id, companyId: req.user.companyId }, data: { ...data, sentAt: data.status === 'GONDERILDI' ? new Date() : undefined } });
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=communication.router.js.map