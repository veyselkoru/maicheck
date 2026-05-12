// src/lib/helpers.ts
export function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(d?: string | Date | null, opts?: { time?: boolean }): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  if (opts?.time) return date.toLocaleString('tr-TR');
  return date.toLocaleDateString('tr-TR');
}

export const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
export const YEARS = [2023, 2024, 2025, 2026, 2027];

export const RISK_LABELS: Record<string,string>  = { DUSUK:'Düşük', ORTA:'Orta', YUKSEK:'Yüksek', KRITIK:'Kritik' };
export const RISK_COLORS: Record<string,string>  = { DUSUK:'bg-slate-100 text-slate-600', ORTA:'bg-amber-100 text-amber-700', YUKSEK:'bg-orange-100 text-orange-700', KRITIK:'bg-red-100 text-red-700' };
export const COMPLIANCE_LABELS: Record<string,string> = { UYGUN:'Uygun', KISMI:'Kısmi', UYGUN_DEGIL:'Uygun Değil' };
export const COMPLIANCE_COLORS: Record<string,string> = { UYGUN:'bg-green-100 text-green-700', KISMI:'bg-amber-100 text-amber-700', UYGUN_DEGIL:'bg-red-100 text-red-700' };
export const ACTION_LABELS: Record<string,string> = { ACIK:'Açık', DEVAM_EDIYOR:'Devam Ediyor', TAMAMLANDI:'Tamamlandı', GECIKTI:'Gecikti', IPTAL:'İptal' };
export const ACTION_COLORS: Record<string,string> = { ACIK:'bg-slate-100 text-slate-600', DEVAM_EDIYOR:'bg-blue-100 text-blue-700', TAMAMLANDI:'bg-green-100 text-green-700', GECIKTI:'bg-red-100 text-red-700', IPTAL:'bg-gray-100 text-gray-500' };
export const STATUS_LABELS: Record<string,string> = { BEKLIYOR:'Bekliyor', DEVAM_EDIYOR:'Devam Ediyor', TAMAMLANDI:'Tamamlandı', IPTAL:'İptal', KILITLI:'Kilitli 🔒' };
export const STATUS_COLORS: Record<string,string> = { BEKLIYOR:'bg-slate-100 text-slate-600', DEVAM_EDIYOR:'bg-blue-100 text-blue-700', TAMAMLANDI:'bg-green-100 text-green-700', IPTAL:'bg-red-100 text-red-600', KILITLI:'bg-purple-100 text-purple-700' };

export function cls(...args: (string | undefined | false | null)[]): string {
  return args.filter(Boolean).join(' ');
}
