# שמחות קטנות – חנות אונליין

אתר מכירות מלא לחנות **שמחות קטנות** (פנחס לבון 18, נתניה): חנות ללקוחות בעברית (RTL, מובייל־first) ומערכת ניהול לבעל העסק.

> **סטטוס סליקה:** האתר מחובר כרגע ל־**Sandbox מדומה בלבד** (לא נגבה כסף). לפני קבלת תשלומים אמיתיים יש לחבר ספק סליקה – ראו [docs/PAYMENTS.md](docs/PAYMENTS.md) ו־[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## מה יש באתר

**חנות:** דף בית (מבצעים, חדשים, מומלצים, אזורי בית/אירוח/מצעים), עמודי קטגוריה עם סינון לפי מחיר וזמינות, מיון ועימוד, עמוד מוצר עם גלריה, וריאציות (מידה/צבע/בד, כמות באריזה/חומר, נפח/מידות), זמינות מלאי ו־JSON-LD, חיפוש, סל קניות עם קופונים, Checkout כאורח או כמשתמש (איסוף עצמי / משלוח), אזור אישי (פרטים, כתובות, היסטוריית הזמנות, איפוס סיסמה), עמודי תוכן, צור קשר, 404, Sitemap ו־Robots.

**ניהול (`/admin`):** לוח בקרה מנתוני אמת, מוצרים (וריאציות, מחירי מבצע, SKU, תמונות, קטגוריות, מומלץ, סטטוס פרסום, ייבוא/ייצוא CSV), קטגוריות ותתי־קטגוריות, הזמנות (סטטוס הזמנה וסטטוס תשלום בנפרד, ביטול, החזר כספי, הערות), מלאי (עדכון, יומן תנועות, התראות מלאי נמוך), קופונים, מבצעים אוטומטיים לפי מוצר/קטגוריה, לקוחות, שיטות משלוח, הגדרות חנות, עמודי תוכן ופניות.

## טכנולוגיות

| תחום | בחירה |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) + TypeScript strict |
| DB | PostgreSQL |
| ORM | **Prisma 7** – נבחר בגלל מנגנון migrations בוגר, סכמה קריאה שמשמשת גם כתיעוד של מודל הנתונים, ו־transactions עם עדכונים מותנים (נדרש למלאי). |
| Auth | Better Auth (email + סיסמה, sessions ב־DB, איפוס סיסמה) |
| Validation | Zod 4 – סכמה אחת לכל קלט, משותפת לטופס ולשרת |
| Styling | Tailwind CSS 4 + design tokens, גופן Heebo |
| תמונות | כל אחסון תואם S3 (Cloudflare R2 / AWS S3 / MinIO); דיסק מקומי בפיתוח |
| בדיקות | Vitest (unit + integration מול Postgres אמיתי), Playwright (E2E) |

אין Redis, תורים או מיקרו־שירותים – Rate limiting ו־idempotency מבוססים על Postgres.

## ארכיטקטורה (Modular Monolith)

```
src/
  app/(store)/        עמודי החנות
  app/admin/          ממשק ניהול (הרשאת ADMIN נבדקת בכל פעולה בשרת)
  app/api/            Better Auth + Webhook תשלומים
  actions/            Server Actions: ולידציה → הרשאה → קריאה לשירות
  server/             לוגיקה עסקית (ללא React):
    pricing/          מנוע תמחור טהור – מבצעים, קופונים, משלוח
    cart/ checkout/ orders/ payments/ inventory/ catalog/ admin/ shipping/ storage/ ...
  lib/                תשתיות: db, auth, authz, env, money, logger, rate-limit, validation/
  components/         ui/ (Design System), store/, admin/
prisma/               schema, migrations, seed
tests/                unit + integration        e2e/   Playwright
```

עקרונות: כל חישובי המחיר מתבצעים בשרת (`src/server/pricing/engine.ts`); כסף נשמר כמספר שלם באגורות; `OrderItem` שומר צילום מצב של המוצר והמחיר; המלאי יורד רק לאחר Webhook תשלום מאומת, בעדכון מותנה שמונע מכירה מעבר למלאי; אירועי Webhook נרשמים עם מזהה ייחודי ולכן עיבוד כפול אינו אפשרי.

## התקנה מקומית

דרישות: Node.js 20.9+ (מומלץ 22), PostgreSQL 14+.

```bash
npm install                     # מריץ גם prisma generate
cp .env.example .env            # ולמלא DATABASE_URL, BETTER_AUTH_SECRET וכו'
npx prisma migrate dev          # יצירת הטבלאות
npm run db:seed                 # נתוני בסיס + קטלוג הדגמה
npm run admin:create            # יצירת משתמש מנהל ראשון (סיסמה מוזנת באופן מוסתר)
npm run dev                     # http://localhost:3000
```

יצירת סוד: `openssl rand -base64 48`.

### משתני סביבה

כל המשתנים מתועדים ב־[.env.example](.env.example) ונבדקים ב־`src/lib/env.ts`. אין סודות בקוד.

| משתנה | חובה | תיאור |
|---|---|---|
| `DATABASE_URL` | ✓ | חיבור ל־PostgreSQL |
| `BETTER_AUTH_SECRET` | ✓ | סוד אקראי (32+ תווים) |
| `NEXT_PUBLIC_SITE_URL`, `BETTER_AUTH_URL` | ✓ | כתובת האתר (נכנסת ל־build) |
| `PAYMENT_PROVIDER` | | `mock` בלבד כרגע |
| `MOCK_PAYMENT_WEBHOOK_SECRET` | בפיתוח | סוד חתימה ל־Sandbox |
| `PAYMENTS_ALLOW_SANDBOX` | | `true` מאפשר Sandbox בפרודקשן (לסביבת Staging בלבד) |
| `STORAGE_DRIVER`, `S3_*` | בפרודקשן | אחסון תמונות |
| `SMTP_*`, `MAIL_FROM` | בפרודקשן | מיילים (איפוס סיסמה, אישור הזמנה) |
| `SEED_DEMO` | | `false` כדי לזרוע נתוני בסיס בלבד |

## נתוני הדגמה מול נתונים אמיתיים

- כל מוצר/קטגוריה/קופון/מבצע של הדגמה מסומן `isDemo=true`, עם תמונות SVG מקומיות (`public/demo`).
- `npm run demo:reset` – מחיקה ויצירה מחדש של נתוני ההדגמה בלבד.
- `npm run demo:reset -- --wipe` – מחיקת נתוני ההדגמה לפני עלייה לאוויר.
- הזנת קטלוג אמיתי: ממשק הניהול או ייבוא CSV (`/admin/products/import`) – ללא שינויי קוד.

## בדיקות

```bash
npm run typecheck
npm run lint
npm test                 # Vitest: unit + integration (מסד בדיקות נפרד, ראו vitest.config.ts)
npm run build
npm run test:e2e         # Playwright מול build (npm run build קודם); דורש seed + admin
```

בדיקות האינטגרציה רצות מול מסד `TEST_DATABASE_URL` (ברירת מחדל `small_joy_test`) ומנקות אותו בין בדיקות. הן מכסות: חישובי מחיר וקופונים, סל, יצירת הזמנה עם צילום מצב, Webhooks כפולים (כולל במקביל), תשלום כושל, חתימה שגויה, סכום לא תואם, הזמנות מקבילות על היחידה האחרונה, ביטול והחזר עם החזרת מלאי חד־פעמית, הרשאות Admin וגישה להזמנה של לקוח אחר. בדיקות E2E מכסות רכישה כאורח עם קופון, תשלום שנדחה וניסיון חוזר, יצירת מוצר, עדכון מלאי ושינוי סטטוס הזמנה.

CI: `.github/workflows/ci.yml`.

## פריסה לפרודקשן

ראו [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). רשימת פעולות לפני עלייה לאוויר: [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).
