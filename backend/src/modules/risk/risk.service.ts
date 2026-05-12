// Types defined inline
type ComplianceStatus = 'UYGUN' | 'KISMI' | 'UYGUN_DEGIL';
type RiskLevel = 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';

export function calcRiskScore(compliance: ComplianceStatus | null, riskLevel: RiskLevel | null, isDocRequired?: boolean, hasEvidence?: boolean, isCritical?: boolean): number | null {
  if (!compliance) return null;
  let base: number;
  if (compliance === 'UYGUN') base = 1;
  else if (compliance === 'KISMI') base = 3;
  else { base = riskLevel === 'DUSUK' ? 2 : riskLevel === 'ORTA' ? 3 : riskLevel === 'YUKSEK' ? 4 : 5; }
  let bonus = 0;
  if (compliance !== 'UYGUN' && isDocRequired && hasEvidence === false) bonus += isCritical ? 3 : 2;
  return Math.min(base + bonus, 5);
}

export interface AuditStats { total: number; uygun: number; kismi: number; uygunDegil: number; kritikYuksek: number; totalRisk: number; docMissing: number; actionOverdue: number; }
export interface AreaStat { area: string; uygunDegil: number; kritikYuksek: number; totalRisk: number; }

export function calcAuditStats(items: Array<{ compliance: ComplianceStatus | null; riskLevel: RiskLevel | null; riskScore: number | null; isDocumentRequired: boolean; dueDate?: Date | null; actionStatus?: string | null; evidenceFiles?: any[]; }>): AuditStats {
  const s: AuditStats = { total: items.length, uygun: 0, kismi: 0, uygunDegil: 0, kritikYuksek: 0, totalRisk: 0, docMissing: 0, actionOverdue: 0 };
  const now = new Date();
  for (const item of items) {
    if (!item.compliance) continue;
    const score = item.riskScore ?? 0;
    if (item.compliance === 'UYGUN') s.uygun++;
    else if (item.compliance === 'KISMI') { s.kismi++; s.totalRisk += score; }
    else { s.uygunDegil++; s.totalRisk += score; if (item.riskLevel === 'KRITIK' || item.riskLevel === 'YUKSEK') s.kritikYuksek++; }
    if (item.isDocumentRequired && (!item.evidenceFiles || item.evidenceFiles.length === 0)) s.docMissing++;
    if (item.dueDate && item.actionStatus && !['TAMAMLANDI','IPTAL'].includes(item.actionStatus) && new Date(item.dueDate) < now) s.actionOverdue++;
  }
  return s;
}

export function calcAreaStats(items: Array<{ auditArea: string; compliance: ComplianceStatus | null; riskLevel: RiskLevel | null; riskScore: number | null; }>): AreaStat[] {
  const map: Record<string, AreaStat> = {};
  for (const item of items) {
    if (!map[item.auditArea]) map[item.auditArea] = { area: item.auditArea, uygunDegil: 0, kritikYuksek: 0, totalRisk: 0 };
    if (item.compliance === 'UYGUN_DEGIL') { map[item.auditArea].uygunDegil++; map[item.auditArea].totalRisk += item.riskScore ?? 0; if (item.riskLevel === 'KRITIK' || item.riskLevel === 'YUKSEK') map[item.auditArea].kritikYuksek++; }
  }
  return Object.values(map).sort((a, b) => b.totalRisk - a.totalRisk);
}

export function getTrafficLight(score: number): 'green' | 'yellow' | 'red' {
  return score <= 25 ? 'green' : score <= 60 ? 'yellow' : 'red';
}
