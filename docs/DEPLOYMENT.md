# פריסה לפרודקשן

## ארכיטקטורה מומלצת

| רכיב | אפשרות מומלצת | חלופות |
|---|---|---|
| אפליקציה | Vercel | Render / Railway / Fly.io / שרת Node עם `npm run start` |
| PostgreSQL | Neon / Supabase (אזור אירופה) | RDS, Railway Postgres |
| תמונות | Cloudflare R2 + דומיין ציבורי | AWS S3 + CloudFront |
| מיילים | Resend / Postmark / SendGrid (SMTP) | כל ספק SMTP |

האתר רץ כאפליקציית Node אחת (Modular Monolith). אין צורך ב־Redis או ב־workers.

## שלבים

1. **מסד נתונים**: ליצור DB ולשמור את מחרוזת החיבור (עם `sslmode=require` אם נדרש).
2. **אחסון תמונות (R2 לדוגמה)**:
   - ליצור bucket, להפעיל גישה ציבורית או דומיין מותאם (`media.example.co.il`).
   - ליצור API token עם הרשאת Object Read & Write ל־bucket בלבד.
   - `STORAGE_DRIVER=s3`, `S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`, `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL=https://media.example.co.il`.
   - `S3_PUBLIC_URL` נדרש בזמן ה־build (הוספה ל־CSP ול־next/image).
3. **משתני סביבה** – להגדיר בפלטפורמת האירוח (לא בקובץ בריפו). ראו `.env.example`. חובה: `DATABASE_URL`, `BETTER_AUTH_SECRET` (`openssl rand -base64 48`), `NEXT_PUBLIC_SITE_URL` ו־`BETTER_AUTH_URL` = הדומיין הסופי (https), `SMTP_*` + `MAIL_FROM`, `SEED_DEMO=false`.
4. **Build & migrations**:
   ```bash
   npm ci
   npm run db:deploy      # prisma migrate deploy
   npm run build
   ```
   ב־Vercel: Build Command = `npm run db:deploy && npm run build`.
5. **נתוני בסיס**: `SEED_DEMO=false npm run db:seed` – יוצר הגדרות חנות, שיטות משלוח (משלוח עד הבית כבוי עד קביעת מחיר) ועמודי תוכן כטיוטה. **ללא קטלוג הדגמה.**
6. **מנהל ראשון** (מהמחשב המקומי מול DB הפרודקשן, או ב־shell של הפלטפורמה):
   ```bash
   DATABASE_URL="<production-url>" npm run admin:create
   ```
   הסיסמה מוזנת בצורה מוסתרת (לא נשמרת בהיסטוריית ה־shell). מינימום 12 תווים. להתחבר ב־`/account/login` ולהיכנס ל־`/admin`.
7. **דומיין**: לחבר את הדומיין, לוודא HTTPS, ולעדכן `NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` (דורש build מחדש).
8. **סליקה**: ראו [PAYMENTS.md](PAYMENTS.md). עד לחיבור ספק, הקופה תציג "התשלום המקוון טרם הופעל".

## ניהול סודות

- סודות מוגדרים רק במשתני הסביבה של פלטפורמת האירוח. `.env*` נמצאים ב־`.gitignore` (למעט `.env.example`).
- לכל סביבה (Preview/Staging/Production) סודות נפרדים.
- החלפת `BETTER_AUTH_SECRET` מנתקת את כל המשתמשים.
- הלוגים מסננים שדות רגישים (סיסמאות, טוקנים, פרטי כרטיס) – `src/lib/logger.ts`.

## Staging

אפשר להפעיל את ה־Sandbox בסביבת Staging עם `PAYMENTS_ALLOW_SANDBOX=true` ו־`MOCK_PAYMENT_WEBHOOK_SECRET`. **אסור להגדיר זאת בפרודקשן.**

## גיבויים ותחזוקה

- להפעיל גיבוי יומי / Point-in-time recovery אצל ספק ה־DB.
- טבלת `rate_limit` גדלה לאט; ניתן לנקות רשומות ישנות מדי פעם:
  `DELETE FROM rate_limit WHERE "lastRequest" < (extract(epoch from now()) * 1000 - 86400000);`
- הזמנות `PENDING_PAYMENT` ישנות לא תופסות מלאי; ניתן לבטלן מהניהול.
