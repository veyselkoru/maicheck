// prisma/seed.ts — mAicheck v3.1 Full Seed
import { PrismaClient, RiskLevel, AuditStatus, ActionStatus, PeriodType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── HELPERS ─────────────────────────────────────────────────────────────────
type RL = 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';
interface TItem { area: string; subj: string; legal: string; doc?: string; req: boolean; rl: RL; score: number; crit: boolean; corrective?: string }

// ─── DOCUMENT TYPES ──────────────────────────────────────────────────────────
const DOC_TYPES = [
  { code:'PUANTAJ',         name:'Puantaj',                       cat:'Bordro',  req:true,  ret:84  },
  { code:'BORDRO',          name:'Bordro',                        cat:'Bordro',  req:true,  ret:84  },
  { code:'BORDRO_YATAY',    name:'Yatay Bordro',                  cat:'Bordro',  req:false, ret:84  },
  { code:'BORDRO_CARSAF',   name:'Çarşaf Bordro',                 cat:'Bordro',  req:false, ret:84  },
  { code:'UCRET_PUSULASI',  name:'Ücret Hesap Pusulası',          cat:'Bordro',  req:true,  ret:84  },
  { code:'PERSONEL_LISTESI',name:'Personel Listesi',              cat:'Bordro',  req:false, ret:84  },
  { code:'BANKA_MAAS',      name:'Banka Maaş Ödeme Listesi',      cat:'Bordro',  req:true,  ret:84  },
  { code:'BANKA_DEKONTU',   name:'Banka Dekontu',                 cat:'Bordro',  req:false, ret:84  },
  { code:'FM_LISTESI',      name:'Fazla Mesai Listesi',           cat:'Bordro',  req:false, ret:84  },
  { code:'FM_ONAYI',        name:'Fazla Mesai Onay Formu',        cat:'Bordro',  req:false, ret:84  },
  { code:'UBGT_LISTESI',    name:'UBGT Listesi',                  cat:'Bordro',  req:false, ret:84  },
  { code:'HT_LISTESI',      name:'Hafta Tatili Çalışma Listesi',  cat:'Bordro',  req:false, ret:84  },
  { code:'IZIN_KAYIT',      name:'Yıllık İzin Kayıt Belgesi',     cat:'Bordro',  req:true,  ret:84  },
  { code:'IZIN_TALEP',      name:'İzin Talep/Onay Formu',         cat:'Bordro',  req:false, ret:84  },
  { code:'IZIN_PLAN',       name:'Yıllık İzin Kullandırma Planı', cat:'Bordro',  req:false, ret:84  },
  { code:'RAPOR_ISTIRAHAT', name:'Rapor/İstirahat Belgesi',       cat:'Bordro',  req:false, ret:84  },
  { code:'EKSIK_GUN',       name:'Eksik Gün Belgesi',             cat:'Bordro',  req:false, ret:84  },
  { code:'BES_LISTESI',     name:'BES Listesi',                   cat:'Bordro',  req:false, ret:84  },
  { code:'BES_DEKONTU',     name:'BES Ödeme Dekontu',             cat:'Bordro',  req:false, ret:84  },
  { code:'YAN_HAK',         name:'Yan Hak Listesi',               cat:'Bordro',  req:false, ret:84  },
  { code:'PRIM_IKRAMIYE',   name:'Prim/İkramiye Listesi',         cat:'Bordro',  req:false, ret:84  },
  { code:'DAMGA_BORDRO',    name:'Damga Vergisi Hesabı',          cat:'Bordro',  req:false, ret:84  },
  // SGK
  { code:'SGK_GIRIS',       name:'İşe Giriş Bildirgesi',          cat:'SGK',     req:true,  ret:120 },
  { code:'SGK_CIKIS',       name:'İşten Ayrılış Bildirgesi',      cat:'SGK',     req:true,  ret:120 },
  { code:'SGK_HIZMET',      name:'SGK Hizmet Listesi',            cat:'SGK',     req:true,  ret:84  },
  { code:'SGK_TAHAKKUK',    name:'SGK Tahakkuk Fişi',             cat:'SGK',     req:true,  ret:84  },
  { code:'SGK_ODEME',       name:'SGK Ödeme Dekontu',             cat:'SGK',     req:true,  ret:84  },
  { code:'SGK_BORCYOK',     name:'SGK Borcu Yoktur Yazısı',       cat:'SGK',     req:false, ret:12  },
  { code:'SGK_IPC',         name:'SGK İPC Tebligatı',             cat:'SGK',     req:false, ret:120 },
  { code:'EKSIK_GUN_BLD',   name:'Eksik Gün Bildirim Belgesi',    cat:'SGK',     req:false, ret:84  },
  { code:'TESVIK_LISTESI',  name:'Teşvik Listesi',                cat:'SGK',     req:false, ret:84  },
  { code:'MESLEK_KODU',     name:'Meslek Kodu Belgesi',           cat:'SGK',     req:false, ret:84  },
  // Vergi
  { code:'MPHB',            name:'MPHB',                          cat:'Vergi',   req:true,  ret:60  },
  { code:'VERGI_TAHAKKUK',  name:'Vergi Tahakkuk Fişi',           cat:'Vergi',   req:false, ret:60  },
  { code:'VERGI_ODEME',     name:'Vergi Ödeme Dekontu',           cat:'Vergi',   req:true,  ret:60  },
  { code:'VERGI_BORCYOK',   name:'Vergi Borcu Yoktur Yazısı',     cat:'Vergi',   req:false, ret:12  },
  // Fesih
  { code:'FESIH_BILDIRIMI', name:'Fesih Bildirimi',               cat:'Fesih',   req:false, ret:120 },
  { code:'KIDEM_HESAP',     name:'Kıdem Tazminatı Hesabı',        cat:'Fesih',   req:false, ret:120 },
  { code:'IHBAR_HESAP',     name:'İhbar Tazminatı Hesabı',        cat:'Fesih',   req:false, ret:120 },
  { code:'BAKIYE_IZIN',     name:'Bakiye Yıllık İzin Hesabı',     cat:'Fesih',   req:false, ret:120 },
  { code:'IBRANAME',        name:'İbraname',                      cat:'Fesih',   req:false, ret:120 },
  { code:'IKALE',           name:'İkale Sözleşmesi',              cat:'Fesih',   req:false, ret:120 },
  { code:'ARABULUCULUK',    name:'Arabuluculuk Son Tutanağı',      cat:'Fesih',   req:false, ret:120 },
  { code:'ARABULUCU_ODEME', name:'Arabuluculuk Ödeme Dekontu',    cat:'Fesih',   req:false, ret:120 },
  { code:'PRIM_TASFIYE',    name:'Prim/İkramiye Tasfiye Hesabı',  cat:'Fesih',   req:false, ret:120 },
  // İSG
  { code:'ISG_EGITIM',      name:'İSG Eğitim Belgesi',            cat:'İSG',     req:true,  ret:84  },
  { code:'SAGLIK_RAPORU',   name:'Sağlık Muayene Raporu',         cat:'İSG',     req:true,  ret:84  },
  { code:'KKD_ZIMMET',      name:'KKD Zimmet Tutanağı',           cat:'İSG',     req:true,  ret:84  },
  { code:'RISK_DEGERLEND',  name:'Risk Değerlendirmesi',          cat:'İSG',     req:true,  ret:60  },
  { code:'ACIL_DURUM',      name:'Acil Durum Planı',              cat:'İSG',     req:false, ret:60  },
  { code:'TATBIKAT',        name:'Tatbikat Tutanağı',             cat:'İSG',     req:false, ret:60  },
  { code:'IS_KAZASI',       name:'İş Kazası Bildirimi',           cat:'İSG',     req:false, ret:120 },
  { code:'RAMAK_KALA',      name:'Ramak Kala Formu',              cat:'İSG',     req:false, ret:60  },
  { code:'KURUL_TUTANAK',   name:'İSG Kurul Toplantı Tutanağı',   cat:'İSG',     req:false, ret:60  },
  { code:'SAHA_GOZLEM',     name:'Saha Gözlem Tutanağı',          cat:'İSG',     req:false, ret:60  },
  // Diğer
  { code:'ALT_ISV_SOZLESME',name:'Alt İşverenlik Sözleşmesi',     cat:'Diğer',   req:true,  ret:120 },
  { code:'HIZMET_SOZLESME', name:'Hizmet Sözleşmesi',             cat:'Diğer',   req:false, ret:120 },
  { code:'TEKNIK_SARTNAME', name:'Teknik Şartname',               cat:'Diğer',   req:false, ret:120 },
  { code:'ORG_SEMASI',      name:'Organizasyon Şeması',           cat:'Diğer',   req:false, ret:60  },
  { code:'YAZISMA',         name:'Yazışma/E-posta Kaydı',         cat:'Diğer',   req:false, ret:84  },
  { code:'TUTANAK',         name:'Tutanak',                       cat:'Diğer',   req:false, ret:60  },
  { code:'DIGER',           name:'Diğer Belge',                   cat:'Diğer',   req:false, ret:60  },
];

// ─── TEMPLATE 1: STANDART ALT İŞVEREN DENETİMİ (130+) ───────────────────────
const T1_STANDART: TItem[] = [
  // HUKUKİ YAPI
  {area:'Hukuki Yapı',subj:'Alt işverenlik ilişkisi yasal ve kayıt altında mı?',legal:'4857 m.2; Alt İşv. Yön.',doc:'ALT_ISV_SOZLESME',req:true,rl:'YUKSEK',score:4,crit:true},
  {area:'Hukuki Yapı',subj:'ÇSGB yetki belgesi alınmış mı?',legal:'Alt İşv. Yön. m.5',doc:'ALT_ISV_SOZLESME',req:true,rl:'YUKSEK',score:4,crit:true},
  {area:'Hukuki Yapı',subj:'Alt işverenin vergi kaydı aktif mi?',legal:'VUK',doc:'VERGI_BORCYOK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Hukuki Yapı',subj:'Alt işverenin SGK kaydı aktif mi?',legal:'5510 m.11',doc:'SGK_BORCYOK',req:false,rl:'YUKSEK',score:4,crit:false},
  // ALT İŞVERENLİK SÖZLEŞMESİ
  {area:'Alt İşv. Sözleşmesi',subj:'Sözleşme yazılı ve imzalı mı?',legal:'4857 m.2; Yön. m.9',doc:'ALT_ISV_SOZLESME',req:true,rl:'YUKSEK',score:4,crit:true},
  {area:'Alt İşv. Sözleşmesi',subj:'İşin kapsamı ve sınırları belirtilmiş mi?',legal:'Alt İşv. Yön. m.10',doc:'ALT_ISV_SOZLESME',req:true,rl:'ORTA',score:3,crit:false},
  {area:'Alt İşv. Sözleşmesi',subj:'Sözleşmede İSG yükümlülükleri var mı?',legal:'6331 m.18',doc:'ALT_ISV_SOZLESME',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Alt İşv. Sözleşmesi',subj:'Sözleşme süresi ve fesih koşulları belirli mi?',legal:'TBK',doc:'ALT_ISV_SOZLESME',req:false,rl:'DUSUK',score:2,crit:false},
  // MUVAZAA
  {area:'Muvazaa/Fiili Durum',subj:'Günlük talimatı kim veriyor? (Muvazaa riski)',legal:'4857 m.2; Yön. m.12',doc:'SAHA_GOZLEM',req:false,rl:'YUKSEK',score:4,crit:true},
  {area:'Muvazaa/Fiili Durum',subj:'Sahada yetkili amir/şef var mı?',legal:'Alt İşv. Yön. m.12',doc:'ORG_SEMASI',req:false,rl:'YUKSEK',score:4,crit:true},
  {area:'Muvazaa/Fiili Durum',subj:'Vardiya/izin onayı alt işveren tarafından yapılıyor mu?',legal:'4857 m.2',doc:'YAZISMA',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Muvazaa/Fiili Durum',subj:'Alt işveren daha önce bu işyerinde çalışmış işçi mi?',legal:'Alt İşv. Yön. m.4',doc:'YAZISMA',req:false,rl:'YUKSEK',score:4,crit:true},
  // İŞE GİRİŞ
  {area:'İşe Giriş',subj:'İşe giriş bildirgeleri zamanında verilmiş mi?',legal:'5510 m.8,m.86',doc:'SGK_GIRIS',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'İşe Giriş',subj:'İşe giriş sağlık muayenesi yapılmış mı?',legal:'İş Sağlığı Yön.',doc:'SAGLIK_RAPORU',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İşe Giriş',subj:'İşe başlangıç İSG eğitimi verilmiş mi?',legal:'6331 m.17',doc:'ISG_EGITIM',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İşe Giriş',subj:'KKD zimmet tutanağı düzenlenmiş mi?',legal:'6331 m.4; KKD Yön.',doc:'KKD_ZIMMET',req:true,rl:'ORTA',score:3,crit:false},
  {area:'İşe Giriş',subj:'KVKK aydınlatma metni imzalatılmış mı?',legal:'KVKK m.10',doc:'DIGER',req:false,rl:'ORTA',score:3,crit:false},
  // İŞ SÖZLEŞMELERİ
  {area:'İş Sözleşmeleri',subj:'Tüm işçilerle yazılı sözleşme imzalanmış mı?',legal:'4857 m.8',doc:'ALT_ISV_SOZLESME',req:true,rl:'YUKSEK',score:4,crit:true},
  {area:'İş Sözleşmeleri',subj:'Sözleşmede ücret ve pozisyon belirtilmiş mi?',legal:'4857 m.8',doc:'ALT_ISV_SOZLESME',req:false,rl:'ORTA',score:3,crit:false},
  // PERSONEL ÖZLÜK
  {area:'Personel Özlük',subj:'Her işçi için özlük dosyası açılmış mı?',legal:'4857 m.75',doc:'PERSONEL_LISTESI',req:true,rl:'ORTA',score:3,crit:false},
  {area:'Personel Özlük',subj:'Özlük dosyasında kimlik, diplom, sertifika var mı?',legal:'4857 m.75',doc:'PERSONEL_LISTESI',req:false,rl:'DUSUK',score:2,crit:false},
  // PUANTAJ
  {area:'Puantaj',subj:'Aylık puantaj hazırlanmış ve imzalanmış mı?',legal:'4857 m.32,m.37',doc:'PUANTAJ',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Puantaj',subj:'Giriş-çıkış kayıtları (kart/turnike) puantajı destekliyor mu?',legal:'İspat ilkeleri',doc:'PUANTAJ',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Puantaj',subj:'İzin/rapor/eksik gün puantajda doğru işlenmiş mi?',legal:'4857 m.53-59',doc:'RAPOR_ISTIRAHAT',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Puantaj',subj:'HT/UBGT çalışmaları puantajda ayrıca gösterilmiş mi?',legal:'4857 m.46-47',doc:'HT_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Puantaj',subj:'Fazla mesai saatleri puantajda ayrı tutulmuş mu?',legal:'4857 m.41',doc:'FM_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Puantaj',subj:'Fiili çalışma ile bordro gün sayısı uyumlu mu?',legal:'4857 m.32',doc:'PUANTAJ',req:false,rl:'YUKSEK',score:4,crit:false},
  // BORDRO
  {area:'Bordro',subj:'Aylık bordro hazırlanmış ve imzalanmış mı?',legal:'4857 m.32',doc:'BORDRO',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Bordro',subj:'Ücret hesap pusulası her işçiye verilmiş mi?',legal:'4857 m.37',doc:'UCRET_PUSULASI',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Bordro',subj:'Brüt-net hesaplama doğru mu?',legal:'4857 m.37',doc:'BORDRO',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Bordro',subj:'Asgari ücret altı ödeme riski var mı?',legal:'4857 m.32',doc:'BORDRO',req:false,rl:'KRITIK',score:5,crit:true},
  {area:'Bordro',subj:'FM/HT/UBGT tahakkukları doğru oranla hesaplanmış mı?',legal:'4857 m.41,46,47',doc:'BORDRO',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Bordro',subj:'Yan haklar bordroya eklenmiş mi?',legal:'5510 m.80',doc:'YAN_HAK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Bordro',subj:'Damga vergisi kesintisi doğru uygulanmış mı?',legal:'DVK',doc:'DAMGA_BORDRO',req:false,rl:'DUSUK',score:2,crit:false},
  // ÜCRET ÖDEMELERİ
  {area:'Ücret Ödemeleri',subj:'Ücretler zamanında ve tam ödenmiş mi?',legal:'4857 m.32-47',doc:'BANKA_MAAS',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Ücret Ödemeleri',subj:'Prim/ikramiye ödemeleri belgelenmiş mi?',legal:'Yargıtay',doc:'PRIM_IKRAMIYE',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Ücret Ödemeleri',subj:'BES/OKS kesintileri aktarılmış mı?',legal:'4632 Ek m.2',doc:'BES_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  // BANKA ÖDEMELERİ
  {area:'Banka Ödemeleri',subj:'Personel ücretleri bankadan ödenmiş mi?',legal:'4857 m.32; Banka Ödeme Yön.',doc:'BANKA_MAAS',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Banka Ödemeleri',subj:'Bordro neti ile banka tutarı uyumlu mu?',legal:'İspat ilkeleri',doc:'BANKA_DEKONTU',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Banka Ödemeleri',subj:'Parçalı/elden ödeme şüphesi var mı?',legal:'İspat ilkeleri',doc:'BANKA_DEKONTU',req:false,rl:'YUKSEK',score:4,crit:false},
  // FAZLA MESAİ
  {area:'Fazla Mesai',subj:'Fazla çalışma yazılı onayı alınmış mı?',legal:'4857 m.41',doc:'FM_ONAYI',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fazla Mesai',subj:'Yıllık FM sınırı (270 saat) aşılmış mı?',legal:'4857 m.41',doc:'FM_LISTESI',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fazla Mesai',subj:'FM saatleri puantajla uyumlu mu?',legal:'4857 m.41',doc:'FM_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  // HAFTA TATİLİ
  {area:'Hafta Tatili',subj:'7 günde kesintisiz 24 saat dinlenme sağlanmış mı?',legal:'4857 m.46',doc:'HT_LISTESI',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Hafta Tatili',subj:'HT çalışmasında %100 zamlı ücret ödendi mi?',legal:'4857 m.46',doc:'BORDRO',req:false,rl:'YUKSEK',score:4,crit:false},
  // UBGT
  {area:'UBGT',subj:'UBGT günü çalışmasında ayrıca 1 günlük ücret ödendi mi?',legal:'4857 m.47; 2429',doc:'UBGT_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'UBGT',subj:'UBGT günleri listesi doğru tutulmuş mu?',legal:'4857 m.47',doc:'UBGT_LISTESI',req:false,rl:'DUSUK',score:2,crit:false},
  // YILLIK İZİN
  {area:'Yıllık İzin',subj:'Yıllık izin kayıt belgesi var mı?',legal:'4857 m.53-59; Y.İ.Yön.',doc:'IZIN_KAYIT',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Yıllık İzin',subj:'İzin talep/onay formları imzalanmış mı?',legal:'Yıllık İzin Yön.',doc:'IZIN_TALEP',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Yıllık İzin',subj:'İzin süresi kıdeme göre doğru hesaplanmış mı?',legal:'4857 m.53',doc:'IZIN_KAYIT',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Yıllık İzin',subj:'İzinliyken çalıştırılma şüphesi var mı?',legal:'4857 m.56',doc:'PUANTAJ',req:false,rl:'YUKSEK',score:4,crit:false},
  // RAPOR / EKSİK GÜN
  {area:'Rapor/Eksik Gün',subj:'Raporlu işçilerin eksik gün kodları SGK\'ya bildirildi mi?',legal:'5510 m.86',doc:'EKSIK_GUN',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Rapor/Eksik Gün',subj:'Raporlu süre bordroya ve puantaja yansıtılmış mı?',legal:'4857 m.32',doc:'RAPOR_ISTIRAHAT',req:false,rl:'ORTA',score:3,crit:false},
  // SGK BİLDİRİMLERİ
  {area:'SGK Bildirimleri',subj:'İşe giriş bildirgeleri zamanında verilmiş mi?',legal:'5510 m.8,m.86',doc:'SGK_GIRIS',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'SGK Bildirimleri',subj:'İşten çıkış bildirgeleri ve kodları doğru mu?',legal:'5510 m.9',doc:'SGK_CIKIS',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Bildirimleri',subj:'Prim gün sayısı puantajla uyumlu mu?',legal:'5510 m.86',doc:'SGK_HIZMET',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Bildirimleri',subj:'PEK bordro brüt ile uyumlu mu?',legal:'5510 m.80',doc:'SGK_HIZMET',req:true,rl:'YUKSEK',score:4,crit:true},
  {area:'SGK Bildirimleri',subj:'Meslek kodu doğru verilmiş mi?',legal:'5510 m.86',doc:'MESLEK_KODU',req:false,rl:'ORTA',score:3,crit:false},
  // SGK TAHAKKUK
  {area:'SGK Tahakkuk',subj:'SGK tahakkuk fişi mevcut mu?',legal:'5510 m.86',doc:'SGK_TAHAKKUK',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'SGK Tahakkuk',subj:'Tahakkuk tutarı hizmet listesiyle uyumlu mu?',legal:'5510 m.86',doc:'SGK_TAHAKKUK',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Tahakkuk',subj:'Teşvik/muafiyet uygulamaları doğru mu?',legal:'5510 m.81',doc:'TESVIK_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  // SGK ÖDEMELERİ
  {area:'SGK Ödemeleri',subj:'SGK prim ödeme dekontu var mı ve zamanında mı?',legal:'5510 m.88',doc:'SGK_ODEME',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'SGK Ödemeleri',subj:'SGK ödeme tutarı tahakkukla uyumlu mu?',legal:'5510 m.88',doc:'SGK_ODEME',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Borcu',subj:'SGK borcu yoktur yazısı güncel mi?',legal:'5510 m.88',doc:'SGK_BORCYOK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Borcu',subj:'SGK idari para cezası tebligatı var mı?',legal:'5510/4447',doc:'SGK_IPC',req:false,rl:'YUKSEK',score:4,crit:false},
  // VERGİ/MPHB
  {area:'Vergi/MPHB',subj:'MPHB verilmiş mi?',legal:'GVK m.94; 5510 m.86',doc:'MPHB',req:true,rl:'YUKSEK',score:4,crit:true},
  {area:'Vergi/MPHB',subj:'MPHB vergi matrahı bordroyla uyumlu mu?',legal:'GVK m.94',doc:'MPHB',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Vergi/MPHB',subj:'MPHB prim bildirimi SGK listesiyle uyumlu mu?',legal:'5510 m.86',doc:'MPHB',req:true,rl:'ORTA',score:3,crit:false},
  {area:'Vergi/MPHB',subj:'Gelir vergisi kesintileri doğru uygulanmış mı?',legal:'GVK m.103',doc:'MPHB',req:false,rl:'ORTA',score:3,crit:false},
  // VERGİ ÖDEMELERİ
  {area:'Vergi Ödemeleri',subj:'Vergi ödeme dekontu mevcut ve zamanında mı?',legal:'VUK',doc:'VERGI_ODEME',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Vergi Ödemeleri',subj:'Ödenen vergi tutarı MPHB ile uyumlu mu?',legal:'GVK; VUK',doc:'VERGI_ODEME',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Vergi Ödemeleri',subj:'Vergi borcu yoktur yazısı güncel mi?',legal:'VUK',doc:'VERGI_BORCYOK',req:false,rl:'ORTA',score:3,crit:false},
  // BES/OKS
  {area:'BES/OKS',subj:'OKS/BES kesintileri bordroda doğru hesaplanmış mı?',legal:'4632 Ek m.2',doc:'BES_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'BES/OKS',subj:'BES katkı payları emeklilik şirketine aktarılmış mı?',legal:'4632 Ek m.2',doc:'BES_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  // YAN HAKLAR
  {area:'Yan Haklar',subj:'Yan haklar bordroda gösteriliyor mu?',legal:'5510 m.80',doc:'YAN_HAK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Yan Haklar',subj:'Yan hakların SGK matrahına etkisi doğru mu?',legal:'5510 m.80',doc:'YAN_HAK',req:false,rl:'ORTA',score:3,crit:false},
  // PRİM/İKRAMİYE
  {area:'Prim/İkramiye',subj:'Prim/ikramiye ödemeleri belgelenmiş mi?',legal:'4857 m.32; Yargıtay',doc:'PRIM_IKRAMIYE',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Prim/İkramiye',subj:'Prim/ikramiyenin SGK ve vergi etkisi doğru mu?',legal:'5510 m.80; GVK',doc:'PRIM_IKRAMIYE',req:false,rl:'ORTA',score:3,crit:false},
  // İSG
  {area:'İSG',subj:'Risk değerlendirmesine alt işveren dahil edilmiş mi?',legal:'6331 m.4; RA Yön.',doc:'RISK_DEGERLEND',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İSG',subj:'Periyodik İSG eğitimleri verilmiş mi?',legal:'6331 m.17; Eğt. Yön.',doc:'ISG_EGITIM',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İSG',subj:'Acil durum planı ve tatbikat yapılmış mı?',legal:'6331 m.11',doc:'ACIL_DURUM',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG',subj:'İSG kurul koordinasyonu sağlanmış mı?',legal:'6331 m.22-23',doc:'KURUL_TUTANAK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG',subj:'Periyodik sağlık muayeneleri yaptırılmış mı?',legal:'6331 m.15',doc:'SAGLIK_RAPORU',req:false,rl:'ORTA',score:3,crit:false},
  // İŞ KAZASI
  {area:'İş Kazası',subj:'İş kazası SGK\'ya zamanında bildirilmiş mi?',legal:'5510 m.13',doc:'IS_KAZASI',req:false,rl:'KRITIK',score:5,crit:true},
  {area:'İş Kazası',subj:'İş kazası tutanağı ve belgeler var mı?',legal:'5510 m.13',doc:'IS_KAZASI',req:false,rl:'KRITIK',score:5,crit:true},
  {area:'İş Kazası',subj:'Kaza sonrası önleyici aksiyon planı hazırlandı mı?',legal:'6331 m.11',doc:'TUTANAK',req:false,rl:'YUKSEK',score:4,crit:false},
  // FESİH SÜRECİ
  {area:'Fesih Süreci',subj:'Fesih yazılı ve yasal sürelere uygun yapılmış mı?',legal:'4857 m.17-19',doc:'FESIH_BILDIRIMI',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fesih Süreci',subj:'İşten çıkış bildirgesi zamanında ve doğru kodla mı?',legal:'5510 m.9',doc:'SGK_CIKIS',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Fesih Süreci',subj:'Fesih gerekçesi yasal ve ispata elverişli mi?',legal:'4857 m.18-21',doc:'FESIH_BILDIRIMI',req:false,rl:'YUKSEK',score:4,crit:false},
  // KIDEM/İHBAR/BAKİYE İZİN
  {area:'Kıdem/İhbar/Bakiye',subj:'Kıdem tazminatı hak edilmiş ve doğru hesaplanmış mı?',legal:'1475 m.14',doc:'KIDEM_HESAP',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Kıdem/İhbar/Bakiye',subj:'İhbar tazminatı doğru hesaplanmış mı?',legal:'4857 m.17',doc:'IHBAR_HESAP',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Kıdem/İhbar/Bakiye',subj:'Bakiye yıllık izin ücreti hesaplanmış ve ödenmiş mi?',legal:'4857 m.59',doc:'BAKIYE_IZIN',req:false,rl:'ORTA',score:3,crit:false},
  // İBRANAME
  {area:'İbraname',subj:'İbraname TBK m.420\'ye uygun düzenlenmiş mi?',legal:'TBK m.420',doc:'IBRANAME',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İbraname',subj:'İbraname fesihten en az 1 ay sonra alınmış mı?',legal:'TBK m.420',doc:'IBRANAME',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İbraname',subj:'İbraname ile birlikte ödeme belgesi mevcut mu?',legal:'Yargıtay',doc:'BANKA_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  // ARABULUCULUK
  {area:'Arabuluculuk/İkale',subj:'Zorunlu arabuluculuk süreci yürütülmüş mü?',legal:'7036 Sayılı K.',doc:'ARABULUCULUK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Arabuluculuk/İkale',subj:'Arabuluculuk tutanağı ve ödeme belgesi var mı?',legal:'7036 m.18',doc:'ARABULUCULUK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Arabuluculuk/İkale',subj:'İkale sözleşmesi tutarlı mı?',legal:'TBK; Yargıtay',doc:'IKALE',req:false,rl:'YUKSEK',score:4,crit:false},
  // UYUŞMAZLIK
  {area:'Uyuşmazlık Yönetimi',subj:'Açık dava/şikayet takip ediliyor mu?',legal:'İş Mah. K.',doc:'YAZISMA',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Uyuşmazlık Yönetimi',subj:'İş müfettişi tebligatlarına yanıt verilmiş mi?',legal:'4857 m.92',doc:'YAZISMA',req:false,rl:'YUKSEK',score:4,crit:false},
  // CARİ KONTROL
  {area:'Cari/Ödeme Kontrolü',subj:'Alt işverene ödemeler bordroyla uyumlu mu?',legal:'Sözleşme; 4857 m.36',doc:'BANKA_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Cari/Ödeme Kontrolü',subj:'SGK borcu kesintisi yapıldı mı?',legal:'4857 m.36; 5510 m.88',doc:'SGK_BORCYOK',req:false,rl:'YUKSEK',score:4,crit:false},
  // İPC/CEZA
  {area:'IPC/Ceza',subj:'SGK ve İŞKUR idari para cezası tebligatı var mı?',legal:'5510/4447',doc:'SGK_IPC',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'IPC/Ceza',subj:'İş Kanunu kapsamında idari yaptırım var mı?',legal:'4857 m.98+',doc:'TUTANAK',req:false,rl:'YUKSEK',score:4,crit:false},
  // RAPORLAMA
  {area:'Raporlama',subj:'Aylık denetim raporu düzenleniyor mu?',legal:'Kurumsal gereklilik',doc:'TUTANAK',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Raporlama',subj:'Uygunsuzluklara aksiyon ve takip yapılıyor mu?',legal:'Kurumsal gereklilik',doc:'YAZISMA',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Raporlama',subj:'Önceki dönem bulguları kapatılmış mı?',legal:'Kurumsal gereklilik',doc:'YAZISMA',req:false,rl:'ORTA',score:3,crit:false},
];

// ─── TEMPLATE 2: BORDRO & ÜCRET (45+) ────────────────────────────────────────
const T2_BORDRO: TItem[] = [
  {area:'Puantaj',subj:'Günlük puantaj hazırlanmış ve imzalanmış mı?',legal:'4857 m.32,m.37',doc:'PUANTAJ',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Puantaj',subj:'Vardiya planı kayıt altına alınmış mı?',legal:'4857 m.69',doc:'PUANTAJ',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Puantaj',subj:'Turnike/kart kayıtları puantajı destekliyor mu?',legal:'İspat ilkeleri',doc:'PUANTAJ',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Puantaj',subj:'Rapor/izin/eksik gün günleri puantajda doğru mu?',legal:'4857 m.53-59',doc:'RAPOR_ISTIRAHAT',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Puantaj',subj:'Fazla mesai saatleri puantajda ayrı tutulmuş mu?',legal:'4857 m.41',doc:'FM_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Puantaj',subj:'UBGT günleri puantajda işaretlenmiş mi?',legal:'4857 m.47',doc:'UBGT_LISTESI',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Puantaj',subj:'Hafta tatili çalışmaları puantajda gösterilmiş mi?',legal:'4857 m.46',doc:'HT_LISTESI',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Puantaj',subj:'Personel bazlı gün sayısı kontrolü yapılmış mı?',legal:'4857 m.32',doc:'PUANTAJ',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Puantaj',subj:'Saha kayıtları ile puantaj örtüşüyor mu?',legal:'İspat ilkeleri',doc:'SAHA_GOZLEM',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Bordro',subj:'Aylık bordro (yatay/çarşaf) hazırlanmış mı?',legal:'4857 m.32',doc:'BORDRO',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Bordro',subj:'Ücret hesap pusulası tüm işçilere verilmiş mi?',legal:'4857 m.37',doc:'UCRET_PUSULASI',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Bordro',subj:'Brüt-net hesaplama doğru mu?',legal:'4857 m.37',doc:'BORDRO',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Bordro',subj:'SGK matrahı doğru hesaplanmış mı?',legal:'5510 m.80',doc:'BORDRO',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Bordro',subj:'Vergi matrahı doğru hesaplanmış mı?',legal:'GVK m.103',doc:'BORDRO',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Bordro',subj:'Damga vergisi kesintisi doğru uygulanmış mı?',legal:'DVK',doc:'DAMGA_BORDRO',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Bordro',subj:'Asgari ücret altı ödeme riski var mı?',legal:'4857 m.32',doc:'BORDRO',req:false,rl:'KRITIK',score:5,crit:true},
  {area:'Bordro',subj:'FM tahakkuku doğru oranla hesaplanmış mı?',legal:'4857 m.41',doc:'FM_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Bordro',subj:'UBGT tahakkuku doğru mu?',legal:'4857 m.47',doc:'UBGT_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Bordro',subj:'HT tahakkuku doğru mu?',legal:'4857 m.46',doc:'HT_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Bordro',subj:'Yan hak tahakkukları doğru mu?',legal:'5510 m.80',doc:'YAN_HAK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Bordro',subj:'Prim/ikramiye bordroya dahil edilmiş mi?',legal:'5510 m.80',doc:'PRIM_IKRAMIYE',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Bordro',subj:'İhtirazi kayıt ile imzalanan bordro var mı?',legal:'Yargıtay',doc:'BORDRO',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Ücret Ödemeleri',subj:'Ücretler zamanında ödenmiş mi?',legal:'4857 m.32',doc:'BANKA_MAAS',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Ücret Ödemeleri',subj:'Ücretler tam ödenmiş mi?',legal:'4857 m.32',doc:'BANKA_MAAS',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Banka Ödemeleri',subj:'Banka maaş ödeme listesi mevcut mu?',legal:'Banka Ödeme Yön.',doc:'BANKA_MAAS',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Banka Ödemeleri',subj:'Bordro neti ile banka ödeme tutarı uyumlu mu?',legal:'İspat ilkeleri',doc:'BANKA_DEKONTU',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'Banka Ödemeleri',subj:'Banka dekontları düzenli arşivleniyor mu?',legal:'İspat ilkeleri',doc:'BANKA_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Banka Ödemeleri',subj:'Parçalı ödeme şüphesi var mı?',legal:'İspat ilkeleri',doc:'BANKA_DEKONTU',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fazla Mesai',subj:'Fazla çalışma yazılı onayı alınmış mı?',legal:'4857 m.41',doc:'FM_ONAYI',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fazla Mesai',subj:'Yıllık 270 saat sınırı aşılmış mı?',legal:'4857 m.41',doc:'FM_LISTESI',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fazla Mesai',subj:'FM saatleri puantajla uyumlu mu?',legal:'4857 m.41',doc:'FM_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Fazla Mesai',subj:'FM ücretleri %50 zamlı ödenmiş mi?',legal:'4857 m.41',doc:'BORDRO',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Yan Hak',subj:'Yemek yardımı doğru hesaplanmış mı?',legal:'5510 m.80',doc:'YAN_HAK',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Yan Hak',subj:'Yol yardımı doğru hesaplanmış mı?',legal:'5510 m.80',doc:'YAN_HAK',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Yan Hak',subj:'BES kesintileri yapılmış ve aktarılmış mı?',legal:'4632 Ek m.2',doc:'BES_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Prim/İkramiye',subj:'Prim listesi imzalı mı?',legal:'Yargıtay',doc:'PRIM_IKRAMIYE',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Prim/İkramiye',subj:'Prim/ikramiyenin vergi etkisi doğru mu?',legal:'GVK',doc:'PRIM_IKRAMIYE',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Prim/İkramiye',subj:'Prim/ikramiyenin SGK matrahına etkisi doğru mu?',legal:'5510 m.80',doc:'PRIM_IKRAMIYE',req:false,rl:'ORTA',score:3,crit:false},
  {area:'UBGT',subj:'UBGT günleri doğru sayıldı mı?',legal:'4857 m.47; 2429',doc:'UBGT_LISTESI',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'UBGT',subj:'UBGT çalışması ek ücretle karşılandı mı?',legal:'4857 m.47',doc:'BORDRO',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Hafta Tatili',subj:'HT dinlenmesi sağlandı mı?',legal:'4857 m.46',doc:'PUANTAJ',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Hafta Tatili',subj:'HT çalışmasına %100 zam ödendi mi?',legal:'4857 m.46',doc:'BORDRO',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Kontrol',subj:'SGK bildirimi bordroyla uyumlu mu?',legal:'5510 m.86',doc:'SGK_HIZMET',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Kontrol',subj:'PEK bordro brütle örtüşüyor mu?',legal:'5510 m.80',doc:'SGK_HIZMET',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Vergi Kontrol',subj:'MPHB bordro verileriyle uyumlu mu?',legal:'GVK m.94',doc:'MPHB',req:true,rl:'YUKSEK',score:4,crit:false},
];

// ─── TEMPLATE 3: SGK & VERGİ (40+) ──────────────────────────────────────────
const T3_SGK: TItem[] = [
  {area:'SGK İşe Giriş',subj:'İşe giriş bildirgesi süresinde verilmiş mi?',legal:'5510 m.8,m.86',doc:'SGK_GIRIS',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'SGK İşe Giriş',subj:'Bildirge içeriği doğru mu (kimlik, işyeri, ücret)?',legal:'5510 m.8',doc:'SGK_GIRIS',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Çıkış',subj:'İşten ayrılış bildirgesi verilmiş mi?',legal:'5510 m.9',doc:'SGK_CIKIS',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Çıkış',subj:'Çıkış kodu doğru seçilmiş mi?',legal:'5510 m.9',doc:'SGK_CIKIS',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Çıkış',subj:'Çıkış tarihi sözleşmeyle uyumlu mu?',legal:'5510 m.9',doc:'SGK_CIKIS',req:false,rl:'ORTA',score:3,crit:false},
  {area:'SGK Hizmet',subj:'Prim gün sayısı puantajla uyumlu mu?',legal:'5510 m.86',doc:'SGK_HIZMET',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Hizmet',subj:'PEK bordro brütle uyumlu mu?',legal:'5510 m.80',doc:'SGK_HIZMET',req:true,rl:'YUKSEK',score:4,crit:true},
  {area:'SGK Hizmet',subj:'Meslek kodu doğru verilmiş mi?',legal:'5510 m.86',doc:'MESLEK_KODU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'SGK Hizmet',subj:'Eksik gün kodları doğru seçilmiş mi?',legal:'5510 m.86',doc:'EKSIK_GUN_BLD',req:false,rl:'ORTA',score:3,crit:false},
  {area:'SGK Tahakkuk',subj:'SGK tahakkuk fişi mevcut mu?',legal:'5510 m.86',doc:'SGK_TAHAKKUK',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'SGK Tahakkuk',subj:'Tahakkuk tutarı hizmet listesiyle uyumlu mu?',legal:'5510 m.86',doc:'SGK_TAHAKKUK',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Tahakkuk',subj:'İşveren payı ve işçi payı doğru ayrıştırılmış mı?',legal:'5510 m.81',doc:'SGK_TAHAKKUK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'SGK Teşvik',subj:'Teşvik kodu doğru uygulanmış mı?',legal:'5510 m.81 vd.',doc:'TESVIK_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'SGK Teşvik',subj:'Teşvik şartları sağlanıyor mu?',legal:'5510 m.81',doc:'TESVIK_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'SGK Ödeme',subj:'SGK prim ödemesi zamanında yapılmış mı?',legal:'5510 m.88',doc:'SGK_ODEME',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'SGK Ödeme',subj:'Ödeme tutarı tahakkukla uyumlu mu?',legal:'5510 m.88',doc:'SGK_ODEME',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Ödeme',subj:'Gecikme zammı tahakkuk etmiş mi?',legal:'5510 m.89',doc:'SGK_ODEME',req:false,rl:'ORTA',score:3,crit:false},
  {area:'SGK Borcu',subj:'SGK borcu yoktur yazısı güncel mi?',legal:'5510 m.88',doc:'SGK_BORCYOK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Borcu',subj:'SGK IPC tebligatı var mı?',legal:'5510/4447',doc:'SGK_IPC',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Borcu',subj:'IPC itiraz süresi içinde yanıt verilmiş mi?',legal:'5510 m.102',doc:'YAZISMA',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'MPHB',subj:'MPHB zamanında verilmiş mi?',legal:'GVK m.94; 5510 m.86',doc:'MPHB',req:true,rl:'YUKSEK',score:4,crit:true},
  {area:'MPHB',subj:'MPHB vergi matrahı bordroyla uyumlu mu?',legal:'GVK m.94',doc:'MPHB',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'MPHB',subj:'MPHB prim bildirimi SGK listesiyle uyumlu mu?',legal:'5510 m.86',doc:'MPHB',req:true,rl:'ORTA',score:3,crit:false},
  {area:'MPHB',subj:'MPHB dönemde tüm işçiler bildirilmiş mi?',legal:'GVK m.94',doc:'MPHB',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Vergi',subj:'Gelir vergisi kesintileri doğru uygulanmış mı?',legal:'GVK m.103',doc:'MPHB',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Vergi',subj:'Damga vergisi doğru hesaplanmış mı?',legal:'DVK',doc:'DAMGA_BORDRO',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Vergi',subj:'Vergi tahakkuk fişi mevcut mu?',legal:'VUK',doc:'VERGI_TAHAKKUK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Vergi',subj:'Vergi ödemesi zamanında yapılmış mı?',legal:'VUK',doc:'VERGI_ODEME',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Vergi',subj:'Ödeme tutarı tahakkukla uyumlu mu?',legal:'VUK',doc:'VERGI_ODEME',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Vergi',subj:'Vergi borcu yoktur yazısı güncel mi?',legal:'VUK',doc:'VERGI_BORCYOK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Uyum',subj:'SGK ve MPHB gün sayıları eşleşiyor mu?',legal:'5510 m.86; GVK m.94',doc:'SGK_HIZMET',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Uyum',subj:'SGK ve MPHB PEK tutarları eşleşiyor mu?',legal:'5510 m.80; GVK m.94',doc:'SGK_HIZMET',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'BES/OKS',subj:'BES kesintileri bordroya yansıtılmış mı?',legal:'4632 Ek m.2',doc:'BES_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'BES/OKS',subj:'BES primleri aktarılmış mı?',legal:'4632 Ek m.2',doc:'BES_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'BES/OKS',subj:'Cayma hakkı kullananlar doğru yönetilmiş mi?',legal:'4632 Ek m.2',doc:'BES_LISTESI',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Teşvik',subj:'İŞKUR teşviklerinde şartlar sağlanıyor mu?',legal:'4447 m.geçici 10 vd.',doc:'TESVIK_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Teşvik',subj:'Asgari ücret desteği doğru uygulanmış mı?',legal:'5510 Ek m.',doc:'TESVIK_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Teşvik',subj:'Engelli çalıştırma yükümlülüğü yerine getirilmiş mi?',legal:'4857 m.30',doc:'PERSONEL_LISTESI',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Ücret',subj:'Ücret bordroyla SGK hizmet listesi arasında uyum var mı?',legal:'5510 m.80',doc:'SGK_HIZMET',req:true,rl:'YUKSEK',score:4,crit:false},
];

// ─── TEMPLATE 4: FESİH DENETİMİ (35+) ───────────────────────────────────────
const T4_FESIH: TItem[] = [
  {area:'İşten Çıkış Bildirgesi',subj:'İşten ayrılış bildirgesi verilmiş mi?',legal:'5510 m.9',doc:'SGK_CIKIS',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İşten Çıkış Bildirgesi',subj:'Çıkış kodu doğru seçilmiş mi?',legal:'5510 m.9',doc:'SGK_CIKIS',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İşten Çıkış Bildirgesi',subj:'Çıkış tarihi fesih kararıyla uyumlu mu?',legal:'5510 m.9',doc:'SGK_CIKIS',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Fesih Bildirimi',subj:'Fesih yazılı ve gerekçeli yapılmış mı?',legal:'4857 m.17-19',doc:'FESIH_BILDIRIMI',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fesih Bildirimi',subj:'Fesih gerekçesi yasal ve ispata elverişli mi?',legal:'4857 m.18-21',doc:'FESIH_BILDIRIMI',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fesih Bildirimi',subj:'Savunma alınmış mı (geçerli fesih söz konusuysa)?',legal:'4857 m.19',doc:'TUTANAK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fesih Bildirimi',subj:'İhbar sürelerine uyulmuş mu veya tazminat ödenmiş mi?',legal:'4857 m.17',doc:'IHBAR_HESAP',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Kıdem Tazminatı',subj:'Kıdem hakkı doğmuş mu?',legal:'1475 m.14',doc:'KIDEM_HESAP',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Kıdem Tazminatı',subj:'Kıdem hesabı doğru yapılmış mı?',legal:'1475 m.14',doc:'KIDEM_HESAP',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Kıdem Tazminatı',subj:'Kıdem tavanına uyulmuş mu?',legal:'1475 m.14',doc:'KIDEM_HESAP',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Kıdem Tazminatı',subj:'Kıdem tazminatı ödenmiş ve belgelenmiş mi?',legal:'1475 m.14',doc:'BANKA_DEKONTU',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İhbar Tazminatı',subj:'İhbar tazminatı hesaplanmış mı?',legal:'4857 m.17',doc:'IHBAR_HESAP',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İhbar Tazminatı',subj:'İhbar tazminatı ödenmiş ve belgelenmiş mi?',legal:'4857 m.17',doc:'BANKA_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Bakiye Yıllık İzin',subj:'Bakiye izin hesabı yapılmış mı?',legal:'4857 m.59',doc:'BAKIYE_IZIN',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Bakiye Yıllık İzin',subj:'Bakiye izin ücreti ödenmiş mi?',legal:'4857 m.59',doc:'BANKA_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Prim/İkramiye Tasfiye',subj:'Dönem içi prim hakediş hesabı yapılmış mı?',legal:'4857 m.32; Yargıtay',doc:'PRIM_TASFIYE',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Prim/İkramiye Tasfiye',subj:'Tasfiye prim/ikramiyesi ödenmiş mi?',legal:'4857 m.32',doc:'BANKA_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İbraname',subj:'İbraname TBK m.420\'ye göre düzenlenmiş mi?',legal:'TBK m.420',doc:'IBRANAME',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İbraname',subj:'İbraname fesihten en az 1 ay sonra alınmış mı?',legal:'TBK m.420',doc:'IBRANAME',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İbraname',subj:'İbraname miktar bazlı (kalemli) düzenlenmiş mi?',legal:'Yargıtay',doc:'IBRANAME',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İbraname',subj:'İbraname baskı altında alınmamış mı?',legal:'TBK m.30-36',doc:'IBRANAME',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İbraname',subj:'İbraname ile birlikte ödeme belgesi var mı?',legal:'Yargıtay',doc:'BANKA_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İkale',subj:'İkale sözleşmesi yapılmış mı?',legal:'TBK; Yargıtay',doc:'IKALE',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İkale',subj:'İkale sözleşmesinde menfaat farkı var mı?',legal:'Yargıtay',doc:'IKALE',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İkale',subj:'İkale ödemesi belgelenmiş mi?',legal:'Yargıtay',doc:'ARABULUCU_ODEME',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Arabuluculuk',subj:'Zorunlu arabuluculuk başvurusu yapılmış mı?',legal:'7036 m.3',doc:'ARABULUCULUK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Arabuluculuk',subj:'Son tutanak (anlaşıldı/anlaşılamadı) mevcut mu?',legal:'7036 m.18',doc:'ARABULUCULUK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Arabuluculuk',subj:'Anlaşma sağlandıysa ödeme belgesi var mı?',legal:'7036 m.18',doc:'ARABULUCU_ODEME',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Ödeme Belgeleri',subj:'Tüm fesih ödemeleri bankadan yapılmış mı?',legal:'4857 m.32',doc:'BANKA_DEKONTU',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Ödeme Belgeleri',subj:'Ödeme tutarları hesaplarla uyumlu mu?',legal:'İspat ilkeleri',doc:'BANKA_DEKONTU',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'SGK Çıkış',subj:'Fesih kodu işsizlik sigortasını etkiliyor mu?',legal:'4447 m.51',doc:'SGK_CIKIS',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Hukuki Risk',subj:'İşe iade davası riski değerlendirilmiş mi?',legal:'4857 m.18-21',doc:'TUTANAK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Hukuki Risk',subj:'İşçilik alacakları açısından dava riski var mı?',legal:'İş Mah. K.',doc:'YAZISMA',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Hukuki Risk',subj:'Toplu işçi çıkarma eşiği aşıldı mı? (4857 m.29)',legal:'4857 m.29',doc:'TUTANAK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Hukuki Risk',subj:'Bildirim yükümlülükleri yerine getirildi mi?',legal:'4857 m.29',doc:'YAZISMA',req:false,rl:'ORTA',score:3,crit:false},
];

// ─── TEMPLATE 5: İSG DENETİMİ (35+) ─────────────────────────────────────────
const T5_ISG: TItem[] = [
  {area:'Risk Değerlendirmesi',subj:'Risk değerlendirmesi yapılmış mı?',legal:'6331 m.10; RA Yön.',doc:'RISK_DEGERLEND',req:true,rl:'YUKSEK',score:4,crit:true},
  {area:'Risk Değerlendirmesi',subj:'Alt işveren işçileri RA\'ya dahil edilmiş mi?',legal:'6331 m.10',doc:'RISK_DEGERLEND',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Risk Değerlendirmesi',subj:'RA güncelleme tarihleri uygun mu?',legal:'RA Yön. m.12',doc:'RISK_DEGERLEND',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Risk Değerlendirmesi',subj:'RA sonuçlarına göre aksiyon alınmış mı?',legal:'6331 m.10',doc:'TUTANAK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG Eğitimi',subj:'İşe başlangıç İSG eğitimi verilmiş mi?',legal:'6331 m.17; Eğt. Yön.',doc:'ISG_EGITIM',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İSG Eğitimi',subj:'Periyodik İSG eğitimleri yapılmış mı?',legal:'6331 m.17',doc:'ISG_EGITIM',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İSG Eğitimi',subj:'Eğitim süresi ve içeriği yeterli mi?',legal:'Eğt. Yön.',doc:'ISG_EGITIM',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG Eğitimi',subj:'Eğitim belgesi imzalı mı?',legal:'Eğt. Yön.',doc:'ISG_EGITIM',req:true,rl:'ORTA',score:3,crit:false},
  {area:'Sağlık Muayenesi',subj:'İşe giriş sağlık muayenesi yapılmış mı?',legal:'6331 m.15; İş Sağ. Yön.',doc:'SAGLIK_RAPORU',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Sağlık Muayenesi',subj:'Periyodik muayeneler yapılmış mı?',legal:'6331 m.15',doc:'SAGLIK_RAPORU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Sağlık Muayenesi',subj:'Muayene raporları arşivlenmiş mi?',legal:'6331 m.15',doc:'SAGLIK_RAPORU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'KKD',subj:'KKD zimmet tutanağı düzenlenmiş mi?',legal:'6331 m.4; KKD Yön.',doc:'KKD_ZIMMET',req:true,rl:'ORTA',score:3,crit:false},
  {area:'KKD',subj:'Verilen KKD\'ler işin riskiyle uyumlu mu?',legal:'KKD Yön.',doc:'KKD_ZIMMET',req:false,rl:'ORTA',score:3,crit:false},
  {area:'KKD',subj:'KKD kullanımı denetleniyor mu?',legal:'6331 m.4',doc:'SAHA_GOZLEM',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Acil Durum',subj:'Acil durum planı hazırlanmış mı?',legal:'6331 m.11; AD Yön.',doc:'ACIL_DURUM',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Acil Durum',subj:'Tahliye/toplanma planı belirlenmiş mi?',legal:'AD Yön.',doc:'ACIL_DURUM',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Acil Durum',subj:'Tatbikat yapılmış ve belgelenmiş mi?',legal:'6331 m.11',doc:'TATBIKAT',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Acil Durum',subj:'İlk yardım eğitimi verilmiş mi?',legal:'6331 m.17; İY Yön.',doc:'ISG_EGITIM',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG Kurulu',subj:'İSG kurulu oluşturulmuş mu?',legal:'6331 m.22',doc:'KURUL_TUTANAK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG Kurulu',subj:'Kurul toplantıları düzenli yapılıyor mu?',legal:'6331 m.22',doc:'KURUL_TUTANAK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG Kurulu',subj:'Alt-asıl işveren koordinasyonu var mı?',legal:'6331 m.23',doc:'KURUL_TUTANAK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İş Kazası',subj:'İş kazası SGK\'ya bildirilmiş mi?',legal:'5510 m.13',doc:'IS_KAZASI',req:false,rl:'KRITIK',score:5,crit:true},
  {area:'İş Kazası',subj:'Kaza tutanağı ve soruşturma belgesi var mı?',legal:'5510 m.13',doc:'IS_KAZASI',req:false,rl:'KRITIK',score:5,crit:true},
  {area:'İş Kazası',subj:'Kaza bildirimi süresinde yapılmış mı?',legal:'5510 m.13',doc:'IS_KAZASI',req:false,rl:'KRITIK',score:5,crit:true},
  {area:'İş Kazası',subj:'Kaza sonrası önleyici aksiyon planı var mı?',legal:'6331 m.11',doc:'TUTANAK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Ramak Kala',subj:'Ramak kala olayları kayıt altına alınmış mı?',legal:'6331 m.11',doc:'RAMAK_KALA',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Saha Gözlem',subj:'Periyodik saha güvenlik teftişi yapılıyor mu?',legal:'6331 m.4',doc:'SAHA_GOZLEM',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Saha Gözlem',subj:'Güvensiz hareket/durum kayıt altına alınıyor mu?',legal:'6331 m.4',doc:'SAHA_GOZLEM',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Alt İşveren Koord.',subj:'Alt işveren personeli RA kapsam dahilinde mi?',legal:'6331 m.18',doc:'RISK_DEGERLEND',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'Alt İşveren Koord.',subj:'Alt işverenin İSG profesyoneli koordineli çalışıyor mu?',legal:'6331 m.18',doc:'YAZISMA',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Alt İşveren Koord.',subj:'Alt işverene İSG talimatları yazılı verilmiş mi?',legal:'6331 m.18',doc:'YAZISMA',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG Uzmanı',subj:'Yasal gerekliliklere göre İSG uzmanı görevlendirilmiş mi?',legal:'6331 m.6',doc:'DIGER',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İSG Uzmanı',subj:'İSG uzmanı sözleşmesi ve onay belgesi var mı?',legal:'6331 m.6',doc:'DIGER',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG Uzmanı',subj:'İşyeri hekimi görevlendirilmiş mi?',legal:'6331 m.6',doc:'DIGER',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG Uzmanı',subj:'İSG uzmanı ziyaret kayıtları tutuluyor mu?',legal:'6331 m.6',doc:'DIGER',req:false,rl:'DUSUK',score:2,crit:false},
];

// ─── TEMPLATE 6: YILLIK İZİN (25+) ──────────────────────────────────────────
const T6_IZIN: TItem[] = [
  {area:'Hak Kazanma',subj:'İşçinin yıllık izin hak kazanma şartları sağlanmış mı?',legal:'4857 m.53',doc:'IZIN_KAYIT',req:true,rl:'ORTA',score:3,crit:false},
  {area:'Hak Kazanma',subj:'İzin süresi kıdeme göre doğru belirlenmiş mi?',legal:'4857 m.53',doc:'IZIN_KAYIT',req:true,rl:'ORTA',score:3,crit:false},
  {area:'Hak Kazanma',subj:'Mevsimlik ve kısmi süreli çalışanlara izin uygulaması doğru mu?',legal:'4857 m.53',doc:'IZIN_KAYIT',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İzin Kayıt',subj:'Yıllık izin kayıt defteri/listesi tutulmuş mu?',legal:'4857 m.56; Y.İ.Yön.',doc:'IZIN_KAYIT',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İzin Kayıt',subj:'Tüm işçilerin izin kayıtları eksiksiz mi?',legal:'Y.İ.Yön.',doc:'IZIN_KAYIT',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İzin Kayıt',subj:'İzin başlangıç ve bitiş tarihleri kayıtlara işlenmiş mi?',legal:'Y.İ.Yön.',doc:'IZIN_KAYIT',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İzin Kayıt',subj:'Devreden izinler takip ediliyor mu?',legal:'4857 m.53',doc:'IZIN_KAYIT',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İzin Talep/Onay',subj:'İzin talep formu imzalı mı?',legal:'Y.İ.Yön.',doc:'IZIN_TALEP',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'İzin Talep/Onay',subj:'İzin onay formu imzalı mı?',legal:'Y.İ.Yön.',doc:'IZIN_TALEP',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'İzin Planı',subj:'Yıllık izin kullandırma planı hazırlanmış mı?',legal:'Y.İ.Yön. m.6',doc:'IZIN_PLAN',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'İzin Planı',subj:'İşçilere plan önceden bildirilmiş mi?',legal:'Y.İ.Yön.',doc:'IZIN_PLAN',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Fiili Kullanım',subj:'İşçiler hak ettikleri izni gerçekten kullanmış mı?',legal:'4857 m.53',doc:'PUANTAJ',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fiili Kullanım',subj:'İzin dönemlerinde işçi çalıştırılmış mı?',legal:'4857 m.56',doc:'PUANTAJ',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fiili Kullanım',subj:'İzin ücreti zamanında ödenmiş mi?',legal:'4857 m.57',doc:'BANKA_MAAS',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Fiili Kullanım',subj:'İzin öncesi ücret ödemesi yapılmış mı?',legal:'4857 m.57',doc:'BANKA_DEKONTU',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Fiili Kullanım',subj:'İzin günleri bordro ve SGK\'ya yansıtılmış mı?',legal:'5510 m.86',doc:'BORDRO',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Devreden İzin',subj:'Birden fazla yıl devredilen izinler var mı?',legal:'4857 m.53',doc:'IZIN_KAYIT',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Devreden İzin',subj:'Devreden izinlerin toplam süresi kontrol edilmiş mi?',legal:'4857 m.53',doc:'IZIN_KAYIT',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Fesihte Bakiye',subj:'Fesih halinde bakiye izin ücreti hesaplanmış mı?',legal:'4857 m.59',doc:'BAKIYE_IZIN',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fesihte Bakiye',subj:'Bakiye izin ücreti ödenmiş ve belgelenmiş mi?',legal:'4857 m.59',doc:'BANKA_DEKONTU',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fesihte Bakiye',subj:'Bakiye izin ibranamede ayrıca gösterilmiş mi?',legal:'TBK m.420; Yargıtay',doc:'IBRANAME',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Asıl İşveren Kontrolü',subj:'Alt işveren izin kayıtları asıl işveren tarafından denetleniyor mu?',legal:'4857 m.2',doc:'YAZISMA',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Asıl İşveren Kontrolü',subj:'Asıl işveren izin kullandırma yükümlülüğünü takip ediyor mu?',legal:'4857 m.2',doc:'YAZISMA',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İzin Ücreti',subj:'İzin ücreti hesap yöntemi doğru mu?',legal:'4857 m.50',doc:'BORDRO',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İzin Ücreti',subj:'İzin ücreti hesabına prim dahil edilmiş mi?',legal:'4857 m.50; Yargıtay',doc:'BORDRO',req:false,rl:'ORTA',score:3,crit:false},
];

// ─── TEMPLATE 7: İŞE GİRİŞ/ÇIKIŞ (35+) ─────────────────────────────────────
const T7_GIRIŞ_CIKIS: TItem[] = [
  // İŞE GİRİŞ
  {area:'İşe Giriş Bildirimi',subj:'İşe giriş bildirgesi süresinde verilmiş mi?',legal:'5510 m.8',doc:'SGK_GIRIS',req:true,rl:'KRITIK',score:5,crit:true},
  {area:'İşe Giriş Bildirimi',subj:'Bildirge içeriği (kimlik, işyeri, ücret) doğru mu?',legal:'5510 m.8',doc:'SGK_GIRIS',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İşe Giriş Bildirimi',subj:'Geç bildirge cezası doğmuş mu?',legal:'5510 m.102',doc:'SGK_IPC',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İş Sözleşmesi',subj:'Yazılı iş sözleşmesi imzalanmış mı?',legal:'4857 m.8',doc:'ALT_ISV_SOZLESME',req:true,rl:'YUKSEK',score:4,crit:true},
  {area:'İş Sözleşmesi',subj:'Sözleşmede ücret, pozisyon, çalışma süresi belirtilmiş mi?',legal:'4857 m.8',doc:'ALT_ISV_SOZLESME',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İş Sözleşmesi',subj:'Deneme süresi şartları sözleşmede belirtilmiş mi?',legal:'4857 m.15',doc:'ALT_ISV_SOZLESME',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Özlük Dosyası',subj:'Özlük dosyası açılmış mı?',legal:'4857 m.75',doc:'PERSONEL_LISTESI',req:true,rl:'ORTA',score:3,crit:false},
  {area:'Özlük Dosyası',subj:'Kimlik belgesi özlük dosyasında mı?',legal:'4857 m.75',doc:'PERSONEL_LISTESI',req:true,rl:'ORTA',score:3,crit:false},
  {area:'Özlük Dosyası',subj:'Öğrenim belgesi özlük dosyasında mı?',legal:'4857 m.75',doc:'PERSONEL_LISTESI',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'Özlük Dosyası',subj:'İkametgah belgesi güncel mi?',legal:'4857 m.75',doc:'PERSONEL_LISTESI',req:false,rl:'DUSUK',score:2,crit:false},
  {area:'KVKK',subj:'KVKK aydınlatma metni imzalatılmış mı?',legal:'KVKK m.10',doc:'DIGER',req:false,rl:'ORTA',score:3,crit:false},
  {area:'KVKK',subj:'Açık rıza alınan konular belgelenmiş mi?',legal:'KVKK m.5',doc:'DIGER',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İSG Giriş',subj:'İşe başlangıç İSG eğitimi verilmiş mi?',legal:'6331 m.17',doc:'ISG_EGITIM',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İSG Giriş',subj:'Sağlık muayenesi yaptırılmış mı?',legal:'6331 m.15',doc:'SAGLIK_RAPORU',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İSG Giriş',subj:'KKD zimmet tutanağı düzenlenmiş mi?',legal:'KKD Yön.',doc:'KKD_ZIMMET',req:true,rl:'ORTA',score:3,crit:false},
  {area:'İSG Giriş',subj:'Görev tanımı verilmiş mi?',legal:'6331 m.17',doc:'DIGER',req:false,rl:'DUSUK',score:2,crit:false},
  // İŞTEN ÇIKIŞ
  {area:'İşten Çıkış Bildirimi',subj:'İşten ayrılış bildirgesi verilmiş mi?',legal:'5510 m.9',doc:'SGK_CIKIS',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İşten Çıkış Bildirimi',subj:'Çıkış kodu doğru seçilmiş mi?',legal:'5510 m.9',doc:'SGK_CIKIS',req:true,rl:'YUKSEK',score:4,crit:false},
  {area:'İşten Çıkış Bildirimi',subj:'Çıkış tarihi ve kodu işsizlik sigortasını etkiliyor mu?',legal:'4447 m.51',doc:'SGK_CIKIS',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Fesih Belgesi',subj:'Fesih bildirimi yazılı yapılmış mı?',legal:'4857 m.17-19',doc:'FESIH_BILDIRIMI',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fesih Belgesi',subj:'İhbar sürelerine uyulmuş mu?',legal:'4857 m.17',doc:'FESIH_BILDIRIMI',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Fesih Belgesi',subj:'Savunma hakkı tanınmış mı (geçerli fesihlerde)?',legal:'4857 m.19',doc:'TUTANAK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Tazminat/Alacak',subj:'Kıdem tazminatı hesaplanmış ve ödenmiş mi?',legal:'1475 m.14',doc:'KIDEM_HESAP',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Tazminat/Alacak',subj:'İhbar tazminatı hesaplanmış mı?',legal:'4857 m.17',doc:'IHBAR_HESAP',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Tazminat/Alacak',subj:'Bakiye yıllık izin ücreti ödenmiş mi?',legal:'4857 m.59',doc:'BAKIYE_IZIN',req:false,rl:'ORTA',score:3,crit:false},
  {area:'Tazminat/Alacak',subj:'Son ay ücreti ve diğer alacaklar ödenmiş mi?',legal:'4857 m.32',doc:'BANKA_DEKONTU',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İbraname/Arabuluculuk',subj:'İbraname düzenlenmiş mi?',legal:'TBK m.420',doc:'IBRANAME',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İbraname/Arabuluculuk',subj:'İbraname TBK m.420\'ye uygun mu?',legal:'TBK m.420',doc:'IBRANAME',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'İbraname/Arabuluculuk',subj:'Arabuluculuk son tutanağı var mı?',legal:'7036 m.18',doc:'ARABULUCULUK',req:false,rl:'ORTA',score:3,crit:false},
  {area:'İşe İade',subj:'İşe iade davası riski değerlendirilmiş mi?',legal:'4857 m.18-21',doc:'TUTANAK',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Ödeme Belgeleri',subj:'Tüm ödemeler banka kanalıyla yapılmış mı?',legal:'4857 m.32',doc:'BANKA_DEKONTU',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Ödeme Belgeleri',subj:'Ödeme tutarları hesaplarla uyumlu mu?',legal:'İspat ilkeleri',doc:'BANKA_DEKONTU',req:false,rl:'YUKSEK',score:4,crit:false},
  {area:'Prim/İkramiye',subj:'Dönem içi kazanılmış prim hakları ödenmiş mi?',legal:'4857 m.32; Yargıtay',doc:'PRIM_TASFIYE',req:false,rl:'ORTA',score:3,crit:false},
  {area:'SGK Son',subj:'Çıkış döneminde SGK bildirimi ve ödemesi tamamlanmış mı?',legal:'5510 m.88',doc:'SGK_ODEME',req:true,rl:'YUKSEK',score:4,crit:false},
];

// ─── IMPACT PARAMETERS (SGK, VERGİ, İŞKUR) ───────────────────────────────────
const IMPACT_PARAMS = [
  { name:'Geç İşe Giriş Bildirgesi (İşçi Başı)',        inst:'SGK',    method:'KISI_BASI',  per:7200.40,   legal:'5510 m.102/b' },
  { name:'SGK Bildirge Verilmemesi (İşçi Başı)',         inst:'SGK',    method:'KISI_BASI',  per:7200.40,   legal:'5510 m.102/b' },
  { name:'Asgari Ücret Ödenmemesi',                      inst:'IS_HUKUKU',method:'KISI_BASI',per:7200.40,  legal:'4857 m.102' },
  { name:'Yazılı İş Sözleşmesi Yapılmaması',             inst:'IS_HUKUKU',method:'KISI_BASI',per:3600.20,  legal:'4857 m.98' },
  { name:'Özlük Dosyası Tutulmamas',                     inst:'IS_HUKUKU',method:'KISI_BASI',per:3600.20,  legal:'4857 m.104' },
  { name:'UBGT Ücreti Ödenmemesi (İşçi Başı)',           inst:'IS_HUKUKU',method:'KISI_BASI',per:967.40,   legal:'4857 m.103' },
  { name:'Fazla Mesai Ücreti Ödenmemesi',                inst:'IS_HUKUKU',method:'KISI_BASI',per:3600.20,  legal:'4857 m.102' },
  { name:'İSG Eğitimi Verilmemesi (İşçi Başı)',          inst:'ISG',    method:'KISI_BASI',  per:7200.40,   legal:'6331 m.26' },
  { name:'Risk Değerlendirmesi Yapılmaması',              inst:'ISG',    method:'SABIT',      sabit:118220, legal:'6331 m.26' },
  { name:'İş Kazasını SGK\'ya Bildirmeme',               inst:'SGK',    method:'SABIT',      sabit:36002,  legal:'5510 m.102' },
  { name:'İŞKUR Bildirimi Yapılmaması',                  inst:'ISKUR',  method:'SABIT',      sabit:2880.16,legal:'4447 m.51' },
  { name:'SGK Prim Gecikme Zammı (%)',                   inst:'SGK',    method:'ORAN_BAZI',  oran:4.50,     legal:'5510 m.89' },
  { name:'Vergi Gecikme Faizi (%)',                      inst:'VERGI',  method:'ORAN_BAZI',  oran:3.00,     legal:'VUK m.51' },
  { name:'Kıdem Tazminatı Tavanı (Aylık)',               inst:'IS_HUKUKU',method:'SABIT',    sabit:47250,  legal:'1475 m.14' },
];

async function main() {
  console.log('🌱 mAicheck v3.1 Seed başlıyor...');
  const hash = await bcrypt.hash('maicheck123', 10);

  // Company
  const company = await prisma.company.upsert({
    where: { taxNumber: '1234567890' },
    update: {},
    create: { name:'ABC Perakende A.Ş.', taxNumber:'1234567890', address:'Maslak, İstanbul', email:'info@abc.com.tr', plan:'professional' },
  });

  // Users
  const admin = await prisma.user.upsert({ where:{ email:'admin@maicheck.com' }, update:{}, create:{ email:'admin@maicheck.com', name:'Ahmet Yılmaz', passwordHash:hash, role:'ADMIN', companyId:company.id } });
  await prisma.user.upsert({ where:{ email:'denetci@maicheck.com' }, update:{}, create:{ email:'denetci@maicheck.com', name:'Zeynep Kaya', passwordHash:hash, role:'DENETCI', companyId:company.id } });
  await prisma.user.upsert({ where:{ email:'yonetici@maicheck.com' }, update:{}, create:{ email:'yonetici@maicheck.com', name:'Mehmet Demir', passwordHash:hash, role:'YONETICI', companyId:company.id } });
  console.log('✅ 3 kullanıcı');

  // Document Types
  const docTypeMap: Record<string, string> = {};
  for (const dt of DOC_TYPES) {
    const e = await prisma.documentType.findUnique({ where:{ companyId_code:{ companyId:company.id, code:dt.code } } });
    if (!e) {
      const r = await prisma.documentType.create({ data:{ companyId:company.id, name:dt.name, code:dt.code, category:dt.cat, defaultRequired:dt.req, retentionMonths:dt.ret, allowedFileTypes:['pdf','xlsx','xls','docx','doc','png','jpg','jpeg','zip','eml','msg','txt','csv','json'], maxFileSizeMb:100, isActive:true, createdById:admin.id } });
      docTypeMap[dt.code] = r.id;
    } else { docTypeMap[dt.code] = e.id; }
  }
  console.log(`✅ ${DOC_TYPES.length} belge türü`);

  // Helper: create template with items
  async function createTemplate(name: string, desc: string, purpose: string, items: TItem[], isDefault = false) {
    const existing = await prisma.auditTemplate.findFirst({ where:{ companyId:company.id, name } });
    if (existing) { await prisma.auditTemplateItem.deleteMany({ where:{ templateId:existing.id } }); }
    const tmpl = existing ?? await prisma.auditTemplate.create({ data:{ companyId:company.id, name, description:desc, purpose, isDefault, isActive:true, createdById:admin.id } });
    if (!existing) {}
    let order = 1;
    for (const item of items) {
      await prisma.auditTemplateItem.create({ data:{ companyId:company.id, templateId:tmpl.id, auditArea:item.area, controlSubject:item.subj, legalBasis:item.legal, requiredDocTypeId:item.doc?docTypeMap[item.doc]||null:null, requiredDocNameNote:item.doc?DOC_TYPES.find(d=>d.code===item.doc)?.name||null:null, isDocumentRequired:item.req, defaultRiskLevel:item.rl as RiskLevel, defaultRiskScore:item.score, isCritical:item.crit, defaultCorrective:item.corrective||null, isActive:true, orderNo:order++ } });
    }
    return { tmpl, count: items.length };
  }

  const { tmpl: t1, count: c1 } = await createTemplate('Standart Alt İşveren Denetimi', '35 denetim alanı, 130+ kontrol maddesi. Tam kapsamlı aylık/dönem denetimi.', 'Aylık periyodik denetim', T1_STANDART, true);
  console.log(`✅ Standart şablon: ${c1} madde`);
  const { count: c2 } = await createTemplate('Bordro & Ücret Denetimi', 'Bordro, puantaj, ücret ödemeleri, FM, UBGT, HT ve yan hak kontrolü.', 'Bordro odaklı denetim', T2_BORDRO);
  console.log(`✅ Bordro şablonu: ${c2} madde`);
  const { count: c3 } = await createTemplate('SGK & Vergi Denetimi', 'SGK bildirimleri, tahakkuk, ödeme, MPHB ve vergi borcu kontrolü.', 'SGK/Vergi uyum denetimi', T3_SGK);
  console.log(`✅ SGK/Vergi şablonu: ${c3} madde`);
  const { count: c4 } = await createTemplate('Fesih Denetimi', 'Kıdem, ihbar, bakiye izin, ibraname, ikale ve arabuluculuk kontrolü.', 'Fesih süreç denetimi', T4_FESIH);
  console.log(`✅ Fesih şablonu: ${c4} madde`);
  const { count: c5 } = await createTemplate('İSG Denetimi', 'Risk değerlendirmesi, eğitim, KKD, sağlık muayenesi ve iş kazası kontrolü.', 'İSG uyum denetimi', T5_ISG);
  console.log(`✅ İSG şablonu: ${c5} madde`);
  const { count: c6 } = await createTemplate('Yıllık İzin Denetimi', 'Hak kazanma, kayıt, fiili kullanım, devreden izin ve bakiye izin kontrolü.', 'Yıllık izin denetimi', T6_IZIN);
  console.log(`✅ Yıllık İzin şablonu: ${c6} madde`);
  const { count: c7 } = await createTemplate('İşe Giriş/İşten Çıkış Denetimi', 'İşe alım süreci ve fesih süreç belgelerinin eksiksizliği.', 'Giriş/çıkış süreç denetimi', T7_GIRIŞ_CIKIS);
  console.log(`✅ Giriş/Çıkış şablonu: ${c7} madde`);
  await createTemplate('Özel Denetim Şablonu', 'Kullanıcı tarafından özelleştirilecek boş şablon.', 'Özel', []);
  console.log('✅ 8 şablon tamamlandı');

  // Subcontractors
  const subX = await prisma.subcontractor.upsert({ where:{ id:'sub-x-001' }, update:{}, create:{ id:'sub-x-001', companyId:company.id, name:'X Temizlik Ltd. Şti.', taxNumber:'2345678901', sgkSicilNo:'34-1234567', contractStart:new Date('2024-01-01'), contractEnd:new Date('2026-12-31'), workArea:'Temizlik Hizmetleri', responsiblePerson:'Mehmet Demir', email:'bordro@xtemizlik.com', phone:'0212 555 1001' } });
  const subY = await prisma.subcontractor.upsert({ where:{ id:'sub-y-001' }, update:{}, create:{ id:'sub-y-001', companyId:company.id, name:'Y Güvenlik A.Ş.', taxNumber:'3456789012', sgkSicilNo:'34-2345678', contractStart:new Date('2024-03-01'), contractEnd:new Date('2026-12-31'), workArea:'Güvenlik Hizmetleri', responsiblePerson:'Ali Kaya', email:'sgk@yguvenlik.com.tr', phone:'0212 555 1002' } });
  const subZ = await prisma.subcontractor.upsert({ where:{ id:'sub-z-001' }, update:{}, create:{ id:'sub-z-001', companyId:company.id, name:'Z Lojistik Ltd. Şti.', taxNumber:'4567890123', sgkSicilNo:'34-3456789', contractStart:new Date('2025-01-01'), contractEnd:new Date('2027-06-30'), workArea:'Lojistik ve Taşıma', responsiblePerson:'Fatma Yıldız', email:'muhasebe@zlojistik.com', phone:'0212 555 1003' } });
  console.log('✅ 3 alt işveren');

  // Contacts
  for (const [sub, items] of [[subX,[{name:'Mehmet Demir',title:'Bordro Sorumlusu',email:'bordro@xtemizlik.com',phone:'0532 111 1001',prim:true},{name:'Kemal Arslan',title:'SGK Sorumlusu',email:'sgk@xtemizlik.com',phone:'0532 111 1002',prim:false}]],[subY,[{name:'Ali Kaya',title:'İnsan Kaynakları Müdürü',email:'sgk@yguvenlik.com.tr',phone:'0533 222 2001',prim:true}]],[subZ,[{name:'Fatma Yıldız',title:'Muhasebe Müdürü',email:'muhasebe@zlojistik.com',phone:'0534 333 3001',prim:true}]]] as any[]) {
    for (const c of items) {
      await prisma.contact.create({ data:{ companyId:company.id, subcontractorId:(sub as any).id, name:c.name, title:c.title, email:c.email, phone:c.phone, isPrimary:c.prim } });
    }
  }
  console.log('✅ Kontaklar');

  // Impact Parameters
  for (const ip of IMPACT_PARAMS) {
    await prisma.impactParameter.create({ data:{ companyId:company.id, name:ip.name, institution:ip.inst as any, legalReference:ip.legal, method:ip.method as any, perPersonAmount:ip.per?ip.per:null, fixedAmount:ip.sabit?ip.sabit:null, ratePercent:ip.oran?ip.oran:null, validFrom:new Date('2025-01-01'), isActive:true, createdById:admin.id } });
  }
  console.log(`✅ ${IMPACT_PARAMS.length} finansal etki parametresi`);

  // Demo Audit — X Temizlik, Ocak 2026, SINGLE
  const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const existingAudit = await prisma.audit.findFirst({ where:{ companyId:company.id, subcontractorId:subX.id, periodMonth:1, periodYear:2026 } });
  if (!existingAudit) {
    const audit = await prisma.audit.create({ data:{ companyId:company.id, subcontractorId:subX.id, templateId:t1.id, templateSnapshot:JSON.stringify({ name:t1.name }), periodType:'SINGLE', periodMonth:1, periodYear:2026, periodLabel:'Ocak 2026', status:'DEVAM_EDIYOR', auditorId:admin.id, auditorName:admin.name, title:'X Temizlik – Ocak 2026 Denetimi' } });
    const tmplItems = await prisma.auditTemplateItem.findMany({ where:{ templateId:t1.id, isActive:true }, orderBy:{ orderNo:'asc' } });
    await prisma.auditItem.createMany({ data: tmplItems.map(ti=>({ companyId:company.id, auditId:audit.id, sourceTemplateItemId:ti.id, auditArea:ti.auditArea, controlSubject:ti.controlSubject, legalBasis:ti.legalBasis, requiredDocTypeId:ti.requiredDocTypeId, requiredDocNameSnapshot:ti.requiredDocNameNote, isDocumentRequired:ti.isDocumentRequired, isCritical:ti.isCritical, orderNo:ti.orderNo, riskLevel:ti.defaultRiskLevel, riskScore:null })) });

    // Demo findings
    const items = await prisma.auditItem.findMany({ where:{ auditId:audit.id }, orderBy:{ orderNo:'asc' } });
    const fi = (s:string) => items.find(i=>i.controlSubject.toLowerCase().includes(s.toLowerCase()));
    const overrides = [
      { s:'aylık puantaj', c:'UYGUN_DEGIL', rl:'KRITIK', sc:5, f:'Ocak 2026 puantaj belgesi sisteme yüklenmemiş', ca:'Puantaj derhal temin edilecek, imzalatılacak', sor:'Bordro Sorumlusu', days:3 },
      { s:'bordro neti ile banka', c:'UYGUN_DEGIL', rl:'KRITIK', sc:5, f:'Bordro neti 284.500 TL — banka ödemesi 272.100 TL. Fark: 12.400 TL', ca:'Fark tutarı acil ödenecek, bordro yeniden düzenlenecek', sor:'Mali İşler', days:2 },
      { s:'işe giriş bildirgeleri zamanında', c:'UYGUN_DEGIL', rl:'KRITIK', sc:5, f:'3 yeni işçinin bildirgesi en az 5 gün geç verilmiş', ca:'SGK\'ya gecikme gerekçe beyanı yapılacak, ceza takibi başlatılacak', sor:'SGK Sorumlusu', days:2 },
      { s:'sgk prim ödeme dekontu', c:'UYGUN_DEGIL', rl:'KRITIK', sc:5, f:'Ocak 2026 SGK prim ödemesine ait dekont sisteme yüklenmemiş', ca:'Dekont temin edilerek sisteme yüklenecek', sor:'SGK Sorumlusu', days:2 },
      { s:'yıllık izin kayıt belgesi', c:'UYGUN_DEGIL', rl:'YUKSEK', sc:4, f:'İzin kayıt defteri bulunmuyor. 8 işçinin izin durumu belirsiz', ca:'İzin defteri açılacak, geriye dönük kayıtlar tamamlanacak', sor:'İK Sorumlusu', days:5 },
      { s:'ücretler zamanında', c:'UYGUN_DEGIL', rl:'YUKSEK', sc:4, f:'Ocak 2026 ücretleri 5 gün gecikmeyle ödenmiş (5 Şubat)', ca:'Gecikme belgelenecek, tekrarı önlemek için ödeme takvimi oluşturulacak', sor:'Muhasebe', days:3 },
      { s:'periyodik isg eğitimleri', c:'UYGUN_DEGIL', rl:'YUKSEK', sc:4, f:'Ocak 2026\'da işe başlayan 2 işçiye işe giriş İSG eğitimi verilmemiş', ca:'İSG eğitimi bu ay düzenlenecek, eğitim belgesi temin edilecek', sor:'İSG Uzmanı', days:7 },
      { s:'sahada yetkili amir', c:'UYGUN_DEGIL', rl:'ORTA', sc:3, f:'Sahadaki talimat zinciri belirsiz, asıl işveren yöneticisi doğrudan talimat veriyor', ca:'Yetkili şef atama belgesi hazırlanacak, talimat akışı netleştirilecek', sor:'Saha Sorumlusu', days:7 },
      { s:'arabuluculuk tutanağı', c:'UYGUN_DEGIL', rl:'YUKSEK', sc:4, f:'Aralık 2025\'te ayrılan 1 işçi için arabuluculuk son tutanağı mevcut değil', ca:'Arabuluculuk süreci retrospektif olarak tamamlanacak', sor:'Hukuk Birimi', days:14 },
      { s:'kıdem tazminatı hak edilmiş', c:'KISMI', rl:'ORTA', sc:3, f:'Kıdem hesabı yapılmış ancak kıdem tavanı güncel değer (2026) ile kontrol edilmemiş', ca:'Hesap yeniden gözden geçirilecek, tavan ücret güncellenerek hesap yenilenecek', sor:'Mali İşler', days:5 },
    ];

    for (const ov of overrides) {
      const item = fi(ov.s);
      if (!item) continue;
      await prisma.auditItem.update({ where:{ id:item.id }, data:{ compliance:ov.c as any, riskLevel:ov.rl as any, riskScore:ov.sc, findingText:ov.f, correctiveActionText:ov.ca, responsiblePerson:ov.sor, dueDate:new Date(Date.now()+ov.days*86400000), actionStatus:'ACIK' } });
      await prisma.finding.create({ data:{ companyId:company.id, auditId:audit.id, auditItemId:item.id, severity:ov.rl as any, title:ov.f.substring(0,80), description:ov.f, status:'ACIK' } });
    }

    // Recalc risk
    const allItems = await prisma.auditItem.findMany({ where:{ auditId:audit.id }, select:{ riskScore:true } });
    const totalRisk = allItems.reduce((s,i)=>s+(i.riskScore??0),0);
    const tl = totalRisk<=25?'green':totalRisk<=60?'yellow':'red';
    await prisma.audit.update({ where:{ id:audit.id }, data:{ riskScore:totalRisk, trafficLight:tl } });
    console.log(`✅ Demo denetim: X Temizlik Ocak 2026, risk=${totalRisk}, tl=${tl}`);
  }

  // Demo Audit — X Temizlik, Ocak-Mart 2026 RANGE
  const existingRange = await prisma.audit.findFirst({ where:{ companyId:company.id, subcontractorId:subX.id, periodType:'RANGE', startMonth:1, startYear:2026, endMonth:3, endYear:2026 } });
  if (!existingRange) {
    const auditR = await prisma.audit.create({ data:{ companyId:company.id, subcontractorId:subX.id, templateId:t1.id, templateSnapshot:JSON.stringify({ name:t1.name }), periodType:'RANGE', startMonth:1, startYear:2026, endMonth:3, endYear:2026, periodLabel:'Ocak–Mart 2026', status:'BEKLIYOR', auditorId:admin.id, auditorName:admin.name, title:'X Temizlik – Q1 2026 Dönem Denetimi' } });
    const tmplItems = await prisma.auditTemplateItem.findMany({ where:{ templateId:t1.id, isActive:true }, orderBy:{ orderNo:'asc' } });
    await prisma.auditItem.createMany({ data: tmplItems.map(ti=>({ companyId:company.id, auditId:auditR.id, sourceTemplateItemId:ti.id, auditArea:ti.auditArea, controlSubject:ti.controlSubject, legalBasis:ti.legalBasis, requiredDocTypeId:ti.requiredDocTypeId, requiredDocNameSnapshot:ti.requiredDocNameNote, isDocumentRequired:ti.isDocumentRequired, isCritical:ti.isCritical, orderNo:ti.orderNo, riskLevel:ti.defaultRiskLevel })) });
    console.log('✅ Demo dönem aralığı denetimi: X Temizlik Q1 2026');
  }

  console.log('\n🎉 Seed tamamlandı!');
  console.log('─────────────────────────────────────────────────');
  console.log(`Şablon 1 (Standart):     ${c1} madde`);
  console.log(`Şablon 2 (Bordro):       ${c2} madde`);
  console.log(`Şablon 3 (SGK/Vergi):    ${c3} madde`);
  console.log(`Şablon 4 (Fesih):        ${c4} madde`);
  console.log(`Şablon 5 (İSG):          ${c5} madde`);
  console.log(`Şablon 6 (Yıllık İzin):  ${c6} madde`);
  console.log(`Şablon 7 (Giriş/Çıkış): ${c7} madde`);
  console.log(`Toplam madde:            ${c1+c2+c3+c4+c5+c6+c7}`);
  console.log('─────────────────────────────────────────────────');
  console.log('admin@maicheck.com    / maicheck123');
  console.log('denetci@maicheck.com  / maicheck123');
  console.log('yonetici@maicheck.com / maicheck123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
