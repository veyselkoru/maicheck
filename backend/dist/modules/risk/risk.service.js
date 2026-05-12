"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcRiskScore = calcRiskScore;
exports.calcAuditStats = calcAuditStats;
exports.calcAreaStats = calcAreaStats;
exports.getTrafficLight = getTrafficLight;
function calcRiskScore(compliance, riskLevel, isDocRequired, hasEvidence, isCritical) {
    if (!compliance)
        return null;
    let base;
    if (compliance === 'UYGUN')
        base = 1;
    else if (compliance === 'KISMI')
        base = 3;
    else {
        base = riskLevel === 'DUSUK' ? 2 : riskLevel === 'ORTA' ? 3 : riskLevel === 'YUKSEK' ? 4 : 5;
    }
    let bonus = 0;
    if (compliance !== 'UYGUN' && isDocRequired && hasEvidence === false)
        bonus += isCritical ? 3 : 2;
    return Math.min(base + bonus, 5);
}
function calcAuditStats(items) {
    const s = { total: items.length, uygun: 0, kismi: 0, uygunDegil: 0, kritikYuksek: 0, totalRisk: 0, docMissing: 0, actionOverdue: 0 };
    const now = new Date();
    for (const item of items) {
        if (!item.compliance)
            continue;
        const score = item.riskScore ?? 0;
        if (item.compliance === 'UYGUN')
            s.uygun++;
        else if (item.compliance === 'KISMI') {
            s.kismi++;
            s.totalRisk += score;
        }
        else {
            s.uygunDegil++;
            s.totalRisk += score;
            if (item.riskLevel === 'KRITIK' || item.riskLevel === 'YUKSEK')
                s.kritikYuksek++;
        }
        if (item.isDocumentRequired && (!item.evidenceFiles || item.evidenceFiles.length === 0))
            s.docMissing++;
        if (item.dueDate && item.actionStatus && !['TAMAMLANDI', 'IPTAL'].includes(item.actionStatus) && new Date(item.dueDate) < now)
            s.actionOverdue++;
    }
    return s;
}
function calcAreaStats(items) {
    const map = {};
    for (const item of items) {
        if (!map[item.auditArea])
            map[item.auditArea] = { area: item.auditArea, uygunDegil: 0, kritikYuksek: 0, totalRisk: 0 };
        if (item.compliance === 'UYGUN_DEGIL') {
            map[item.auditArea].uygunDegil++;
            map[item.auditArea].totalRisk += item.riskScore ?? 0;
            if (item.riskLevel === 'KRITIK' || item.riskLevel === 'YUKSEK')
                map[item.auditArea].kritikYuksek++;
        }
    }
    return Object.values(map).sort((a, b) => b.totalRisk - a.totalRisk);
}
function getTrafficLight(score) {
    return score <= 25 ? 'green' : score <= 60 ? 'yellow' : 'red';
}
//# sourceMappingURL=risk.service.js.map