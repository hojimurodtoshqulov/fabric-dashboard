# SELXOZMASH TEXTIL — 1C Sync Agent

1C Enterprise 8.3 → Fabric Automation bulut tizimi sinxronizatsiyasi.

## Nima qiladi?

- **Savdo**: `Реализация товаров и услуг` — fakturalarni o'qib, Fabric Automation'ga yuboradi
- **Qarzdorlar**: Счет 62 balansidan qarzlarni o'qib, aging (muddatlash) hisoblaydi
- **Mijozlar**: INN/PINFL orqali mavjud mijozlarni topadi, yangilarini yaratadi
- **Kirim/chiqim** (v1.2.0+): kassa (50) va bank (51, 52) schyotlaridagi provodkalarni o'qiydi. Kirim/chiqim, kassa/bank va turi (mijoz to'lovi, yetkazib beruvchi, ish haqi, soliq, xarajat) serverda schyot kodlari bo'yicha aniqlanadi. Kassa↔bank o'tkazmalari hisobga olinmaydi. O'qishda xato bo'lsa, savdo va qarz sinxronizatsiyasi baribir ishlayveradi.

## Talablar

- Windows 10/11
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- 1C Enterprise 8.3 client ushbu PC'da o'rnatilgan bo'lishi kerak
- 1C bazasiga kirish huquqi (faqat o'qish yetarli)

## O'rnatish

```bat
cd sync-agent
npm install
copy .env.example .env
```

`.env` faylini oching va to'ldiring:

```env
FABRIC_API_URL=https://your-app.vercel.app
FABRIC_SYNC_KEY=your-super-secret-sync-key-here

ONEC_MODE=file
ONEC_FILE_PATH=C:\Users\user\1C\Bases\SelxozmashTextil
ONEC_USER=Admin
ONEC_PASSWORD=your_1c_password
```

`FABRIC_SYNC_KEY` — Vercel'dagi `ONEC_SYNC_SECRET` bilan bir xil bo'lishi shart!

## Ishga tushirish

### Test (ulanishni tekshirish)
```bat
node src/test-connection.js
```

### Kirim/chiqimni tekshirish (hech narsa yubormaydi)
```bat
node src/test-cashflow.js 30
```
So'nggi 30 kunlik provodkalarni o'qib, schyot juftliklari (masalan `Dt 50 <- Kt 62` = mijozdan naqd pul) va ularning yig'indisini chiqaradi. Birinchi sinxronizatsiyadan oldin shu ro'yxat 1C'dagi haqiqiy kassa/bank hujjatlariga mos kelishini ko'zdan kechiring.

### Bir marta ishlatish
```bat
node index.js
```

### Status tekshirish
```bat
node index.js --status
```

## Har kuni ertalab avtomatik ishlatish

`.env` ichida vaqtni belgilang (standart `07:00`):

```env
SYNC_TIME=07:00
```

Keyin `install-schedule.bat` ni ikki marta bosing. U Windows Task Scheduler'da
**"Selxozmash 1C Sync"** vazifasini yaratadi:

- har kuni `SYNC_TIME` da ishga tushadi
- kompyuter o'sha paytda o'chiq bo'lsa — yoqilgandan keyin darhol ishlaydi
- internet yo'q bo'lsa — kutadi
- xato bo'lsa — agent o'zi 3 marta (10 daqiqa oraliq bilan) qayta urinadi

Vaqtni o'zgartirish: `.env` dagi `SYNC_TIME` ni o'zgartirib, `install-schedule.bat` ni qayta ishga tushiring.

```bat
schtasks /run /tn "Selxozmash 1C Sync"   :: hozir qo'lda ishga tushirish
install-schedule.bat -Remove             :: vazifani o'chirish
```

> Vazifa foydalanuvchi tizimga kirgan paytda ishlaydi. Zavod PC'si
> doim shu foydalanuvchi bilan kirgan holda tursin.

## Loglar

Har bir ishga tushish `logs\sync-YYYY-MM-DD.log` ga yoziladi. 30 kundan eski loglar avtomatik o'chiriladi.

## Muammolar

| Xato | Yechim |
|---|---|
| `winax not found` | `npm install` qayta ishlatib ko'ring |
| `V83.COMConnector error` | 1C Enterprise client o'rnatilganligini tekshiring |
| `File path error` | `ONEC_FILE_PATH` to'g'ri ekanligini tekshiring |
| `API error 401` | `FABRIC_SYNC_KEY` va Vercel'dagi `ONEC_SYNC_SECRET` bir xil ekanligini tekshiring |
| `No users found` | Fabric Automation'da kamida 1 ta foydalanuvchi bo'lishi kerak |

## Ma'lumotlar qanday o'tkaziladi?

```
1C Enterprise (local PC)
│
├── Реализация товаров и услуг (so'nggi 90 kun)
│     → Savdo fakturalari
│     → Mijoz nomi + INN
│
├── Счет 62 balansi (bugunga)  
│     → Har bir mijoz uchun umumiy qarz
│
└── Faktura sanalari (aging uchun)
      → Qarzning muddatlanishi (0-30, 31-60, 61-90, 91-100, 100+ kun)
                    │
                    ▼ HTTPS POST /api/1c/sync
              Fabric Automation (Vercel)
                    │
                    ▼
              PostgreSQL bazasi
              ├── clients (INN bo'yicha topiladi yoki yaratiladi)
              ├── invoices (1C raqami bo'yicha upsert)
              └── debts (aging bucket'lar bilan yangilanadi)
```
