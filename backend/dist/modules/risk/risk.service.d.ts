type ComplianceStatus = 'UYGUN' | 'KISMI' | 'UYGUN_DEGIL';
type RiskLevel = 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';
export declare function calcRiskScore(compliance: ComplianceStatus | null, riskLevel: RiskLevel | null, isDocRequired?: boolean, hasEvidence?: boolean, isCritical?: boolean): number | null;
export interface AuditStats {
    total: number;
    uygun: number;
    kismi: number;
    uygunDegil: number;
    kritikYuksek: number;
    totalRisk: number;
    docMissing: number;
    actionOverdue: number;
}
export interface AreaStat {
    area: string;
    uygunDegil: number;
    kritikYuksek: number;
    totalRisk: number;
}
export declare function calcAuditStats(items: Array<{
    compliance: ComplianceStatus | null;
    riskLevel: RiskLevel | null;
    riskScore: number | null;
    isDocumentRequired: boolean;
    dueDate?: Date | null;
    actionStatus?: string | null;
    evidenceFiles?: any[];
}>): AuditStats;
export declare function calcAreaStats(items: Array<{
    auditArea: string;
    compliance: ComplianceStatus | null;
    riskLevel: RiskLevel | null;
    riskScore: number | null;
}>): AreaStat[];
export declare function getTrafficLight(score: number): 'green' | 'yellow' | 'red';
export {};
