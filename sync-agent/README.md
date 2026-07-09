# SELXOZMASH TEXTIL — 1C Sync Agent

1C Enterprise 8.3 → Fabric Automation bulut tizimi sinxronizatsiyasi.

## Nima qiladi?

- **Savdo**: `Реализация товаров и услуг` — fakturalarni o'qib, Fabric Automation'ga yuboradi
- **Qarzdorlar**: Счет 62 balansidan qarzlarni o'qib, aging (muddatlash) hisoblaydi
- **Mijozlar**: INN/PINFL orqali mavjud mijozlarni topadi, yangilarini yaratadi

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

### Bir marta ishlatish
```bat
node index.js
```

### Status tekshirish
```bat
node index.js --status
```

## Windows Task Scheduler orqali avtomatlashtirish

1. **Task Scheduler** oching (Win + R → `taskschd.msc`)
2. **Create Basic Task** bosting
3. **Name**: `Selxozmash 1C Sync`
4. **Trigger**: Daily, keyin "Repeat task every: 30 minutes"
5. **Action**: Start a program
   - Program: `C:\Windows\System32\cmd.exe`
   - Arguments: `/c "cd /d C:\path\to\sync-agent && node index.js >> logs\sync.log 2>&1"`
6. **Finish**

## Loglash

```bat
mkdir logs
node index.js >> logs\sync.log 2>&1
```

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
