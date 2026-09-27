/**
 * DEMO catalog for development and demonstrations only.
 * Prices are sample values — NOT the store's real prices.
 * Everything created from this file is flagged isDemo=true and can be wiped
 * with `npm run demo:reset` without touching real data.
 */
import type { Illustration } from "./demo-images";

export type DemoCategory = {
  slug: string;
  name: string;
  description: string;
  image: Illustration;
  parent?: string;
};

export const demoCategories: DemoCategory[] = [
  { slug: "disposable", name: "חד־פעמי", description: "צלחות, כוסות, סכו״ם ומפות חד־פעמיות לכל אירוע.", image: "plate" },
  { slug: "kitchen", name: "כלי מטבח", description: "סירים, מחבתות, סכינים וכל מה שצריך למטבח.", image: "pot" },
  { slug: "housewares", name: "כלי בית", description: "ספלים, קערות, כוסות וכלי הגשה לשימוש יומיומי.", image: "mug" },
  { slug: "bedding", name: "מצעים", description: "סטים של מצעים, ציפיות ושמיכות לשינה נעימה.", image: "pillow" },
  { slug: "textile", name: "טקסטיל", description: "מגבות, מפות שולחן ושטיחונים לבית.", image: "towel" },
  { slug: "hosting", name: "אירוח", description: "מגשי הגשה, כלי זכוכית ומפיות לאירוח מושלם.", image: "tray" },
  { slug: "birthdays", name: "ימי הולדת", description: "בלונים, נרות, שרשראות וקישוטים למסיבה.", image: "balloon" },
  { slug: "storage", name: "אחסון וארגון", description: "קופסאות, צנצנות, סלים וקולבים לבית מסודר.", image: "box" },
  { slug: "disposable-tableware", name: "כלי הגשה חד־פעמיים", description: "צלחות וקערות חד־פעמיות.", image: "bowl", parent: "disposable" },
];

type V = { options?: Record<string, string>; price: number; sale?: number; stock: number };

export type DemoProduct = {
  slug: string;
  name: string;
  description: string;
  kind: "GENERAL" | "BEDDING" | "DISPOSABLE" | "HOUSEWARE";
  categories: string[];
  image: Illustration;
  featured?: boolean;
  /** Days ago the product was "added" (drives the "new" badge). */
  ageDays?: number;
  variants: V[];
};

const s = (n: number) => Math.round(n * 100);

export const demoProducts: DemoProduct[] = [
  // ── Disposable ──
  {
    slug: "paper-plates-23cm", name: "צלחות נייר עגולות 23 ס״מ", kind: "DISPOSABLE", categories: ["disposable", "disposable-tableware", "birthdays"], image: "plate", featured: true,
    description: "צלחות נייר איכותיות וחזקות, מתאימות למנות חמות וקרות. מושלמות לאירועים, ימי הולדת ופיקניקים.",
    variants: [
      { options: { "כמות באריזה": "20", "צבע": "לבן", "חומר": "נייר" }, price: s(12.9), stock: 120 },
      { options: { "כמות באריזה": "50", "צבע": "לבן", "חומר": "נייר" }, price: s(24.9), sale: s(19.9), stock: 60 },
      { options: { "כמות באריזה": "20", "צבע": "זהב", "חומר": "נייר" }, price: s(16.9), stock: 35 },
    ],
  },
  {
    slug: "plastic-cups-250", name: "כוסות פלסטיק שקופות 250 מ״ל", kind: "DISPOSABLE", categories: ["disposable"], image: "cup",
    description: "כוסות שקופות וקשיחות לשתייה קרה. אריזה חסכונית לאירוח גדול.",
    variants: [
      { options: { "כמות באריזה": "50", "חומר": "פלסטיק" }, price: s(9.9), stock: 200 },
      { options: { "כמות באריזה": "100", "חומר": "פלסטיק" }, price: s(17.9), stock: 150 },
    ],
  },
  {
    slug: "wooden-cutlery-set", name: "סט סכו״ם עץ חד־פעמי", kind: "DISPOSABLE", categories: ["disposable"], image: "cutlery", ageDays: 5,
    description: "סכינים, מזלגות וכפות מעץ – חלופה ידידותית לסביבה לסכו״ם פלסטיק.",
    variants: [{ options: { "כמות באריזה": "60", "חומר": "עץ ליבנה" }, price: s(19.9), stock: 80 }],
  },
  {
    slug: "paper-bowls-500", name: "קערות נייר 500 מ״ל", kind: "DISPOSABLE", categories: ["disposable", "disposable-tableware"], image: "bowl",
    description: "קערות נייר עמידות למרקים, סלטים וחטיפים.",
    variants: [
      { options: { "כמות באריזה": "25", "צבע": "לבן" }, price: s(14.9), stock: 70 },
      { options: { "כמות באריזה": "25", "צבע": "קראפט" }, price: s(15.9), stock: 4 },
    ],
  },
  {
    slug: "disposable-tablecloth-roll", name: "גליל מפת שולחן חד־פעמית", kind: "DISPOSABLE", categories: ["disposable", "hosting"], image: "tablecloth",
    description: "גליל מפה חד־פעמית באורך 10 מטר – חותכים לפי אורך השולחן.",
    variants: [
      { options: { "צבע": "לבן", "חומר": "ניילון" }, price: s(22.9), stock: 40 },
      { options: { "צבע": "תכלת", "חומר": "ניילון" }, price: s(22.9), stock: 0 },
    ],
  },
  {
    slug: "printed-napkins", name: "מפיות מודפסות 3 שכבות", kind: "DISPOSABLE", categories: ["disposable", "hosting", "birthdays"], image: "napkin", featured: true,
    description: "מפיות רכות בשלוש שכבות עם הדפסים חגיגיים.",
    variants: [
      { options: { "כמות באריזה": "20", "צבע": "פרחוני" }, price: s(8.9), stock: 90 },
      { options: { "כמות באריזה": "20", "צבע": "נקודות זהב" }, price: s(9.9), stock: 55 },
    ],
  },
  {
    slug: "aluminum-trays", name: "תבניות אלומיניום עם מכסה", kind: "DISPOSABLE", categories: ["disposable", "kitchen"], image: "container",
    description: "תבניות אלומיניום לאפייה, בישול והקפאה, כולל מכסים.",
    variants: [
      { options: { "כמות באריזה": "5", "מידות": "קטנה" }, price: s(11.9), stock: 100 },
      { options: { "כמות באריזה": "5", "מידות": "גדולה" }, price: s(18.9), stock: 60 },
    ],
  },

  // ── Kitchen ──
  {
    slug: "stainless-pot-24", name: "סיר נירוסטה עם מכסה זכוכית", kind: "HOUSEWARE", categories: ["kitchen"], image: "pot", featured: true,
    description: "סיר נירוסטה איכותי עם תחתית עבה לפיזור חום אחיד, מתאים לכל סוגי הכיריים כולל אינדוקציה.",
    variants: [
      { options: { "נפח": "3 ליטר", "מידות": "20 ס״מ", "חומר": "נירוסטה" }, price: s(119.9), stock: 12 },
      { options: { "נפח": "5 ליטר", "מידות": "24 ס״מ", "חומר": "נירוסטה" }, price: s(149.9), sale: s(129.9), stock: 8 },
    ],
  },
  {
    slug: "nonstick-frying-pan", name: "מחבת נון־סטיק", kind: "HOUSEWARE", categories: ["kitchen"], image: "pan",
    description: "מחבת עם ציפוי נון־סטיק עמיד, ידית נוחה שאינה מתחממת.",
    variants: [
      { options: { "מידות": "24 ס״מ", "חומר": "אלומיניום" }, price: s(79.9), stock: 20 },
      { options: { "מידות": "28 ס״מ", "חומר": "אלומיניום" }, price: s(99.9), stock: 3 },
    ],
  },
  {
    slug: "chef-knife", name: "סכין שף 20 ס״מ", kind: "HOUSEWARE", categories: ["kitchen"], image: "knife", ageDays: 3,
    description: "סכין שף חדה ומאוזנת מפלדת אל־חלד.",
    variants: [{ options: { "מידות": "20 ס״מ", "חומר": "פלדת אל־חלד" }, price: s(69.9), stock: 25 }],
  },
  {
    slug: "mixing-bowls-set", name: "סט קערות ערבוב", kind: "HOUSEWARE", categories: ["kitchen", "housewares"], image: "bowl",
    description: "שלוש קערות ערבוב בגדלים שונים, נכנסות אחת לתוך השנייה.",
    variants: [{ options: { "חומר": "נירוסטה", "מידות": "3 גדלים" }, price: s(59.9), sale: s(44.9), stock: 30 }],
  },
  {
    slug: "baking-dish", name: "תבנית אפייה מזכוכית", kind: "HOUSEWARE", categories: ["kitchen"], image: "tray",
    description: "תבנית זכוכית עמידה בחום לתנור ולמיקרוגל.",
    variants: [
      { options: { "נפח": "1.6 ליטר", "חומר": "זכוכית" }, price: s(39.9), stock: 18 },
      { options: { "נפח": "3 ליטר", "חומר": "זכוכית" }, price: s(54.9), stock: 10 },
    ],
  },

  // ── Housewares ──
  {
    slug: "ceramic-mug", name: "ספל קרמיקה 350 מ״ל", kind: "HOUSEWARE", categories: ["housewares"], image: "mug", featured: true, ageDays: 2,
    description: "ספל קרמיקה בגימור מט, נעים לאחיזה. מתאים למדיח ולמיקרוגל.",
    variants: [
      { options: { "צבע": "לבן", "נפח": "350 מ״ל" }, price: s(24.9), stock: 48 },
      { options: { "צבע": "טרקוטה", "נפח": "350 מ״ל" }, price: s(24.9), stock: 30 },
      { options: { "צבע": "ירוק מרווה", "נפח": "350 מ״ל" }, price: s(24.9), stock: 2 },
    ],
  },
  {
    slug: "glass-tumblers-6", name: "סט 6 כוסות זכוכית", kind: "HOUSEWARE", categories: ["housewares", "hosting"], image: "glass",
    description: "כוסות זכוכית קלאסיות לשתייה יומיומית ולאירוח.",
    variants: [{ options: { "נפח": "300 מ״ל", "חומר": "זכוכית" }, price: s(49.9), stock: 22 }],
  },
  {
    slug: "dinner-plates-set", name: "סט צלחות הגשה 12 חלקים", kind: "HOUSEWARE", categories: ["housewares", "hosting"], image: "plate",
    description: "סט צלחות פורצלן: 4 צלחות שטוחות, 4 עמוקות ו־4 צלחות קינוח.",
    variants: [{ options: { "צבע": "לבן", "חומר": "פורצלן" }, price: s(189.9), sale: s(159.9), stock: 7 }],
  },
  {
    slug: "salad-bowl", name: "קערת סלט גדולה", kind: "HOUSEWARE", categories: ["housewares", "hosting"], image: "bowl",
    description: "קערת סלט רחבה להגשה משפחתית.",
    variants: [
      { options: { "מידות": "28 ס״מ", "חומר": "מלמין" }, price: s(34.9), stock: 26 },
      { options: { "מידות": "28 ס״מ", "חומר": "זכוכית" }, price: s(44.9), stock: 11 },
    ],
  },

  // ── Bedding ──
  {
    slug: "cotton-bedding-set", name: "סט מצעים 100% כותנה", kind: "BEDDING", categories: ["bedding"], image: "sheet", featured: true,
    description: "סט מצעים רך ונושם מכותנה, כולל ציפה לשמיכה, סדין עם גומי וציפיות לכריות.",
    variants: [
      { options: { "מידה": "יחיד", "צבע": "לבן", "סוג בד": "כותנה" }, price: s(149.9), stock: 15 },
      { options: { "מידה": "זוגי", "צבע": "לבן", "סוג בד": "כותנה" }, price: s(199.9), sale: s(169.9), stock: 12 },
      { options: { "מידה": "זוגי", "צבע": "אפור", "סוג בד": "כותנה" }, price: s(199.9), stock: 9 },
      { options: { "מידה": "זוגי", "צבע": "אפור", "סוג בד": "סאטן כותנה" }, price: s(259.9), stock: 5 },
    ],
  },
  {
    slug: "flannel-bedding-set", name: "סט מצעי פלנל לחורף", kind: "BEDDING", categories: ["bedding"], image: "sheet", ageDays: 7,
    description: "מצעי פלנל חמימים ונעימים לימים הקרים.",
    variants: [
      { options: { "מידה": "יחיד", "צבע": "בז׳", "סוג בד": "פלנל" }, price: s(139.9), stock: 10 },
      { options: { "מידה": "זוגי", "צבע": "בז׳", "סוג בד": "פלנל" }, price: s(179.9), stock: 6 },
    ],
  },
  {
    slug: "pillow-pair", name: "זוג כריות שינה", kind: "BEDDING", categories: ["bedding"], image: "pillow",
    description: "כריות סיליקון רכות עם תמיכה טובה לצוואר.",
    variants: [{ options: { "מידה": "50x70", "סוג בד": "מיקרופייבר" }, price: s(89.9), stock: 20 }],
  },
  {
    slug: "summer-blanket", name: "שמיכת קיץ קלה", kind: "BEDDING", categories: ["bedding", "textile"], image: "blanket",
    description: "שמיכה קלה ונושמת לחודשי הקיץ.",
    variants: [
      { options: { "מידה": "יחיד", "צבע": "תכלת" }, price: s(99.9), stock: 14 },
      { options: { "מידה": "זוגי", "צבע": "תכלת" }, price: s(139.9), stock: 8 },
    ],
  },
  {
    slug: "fitted-sheet", name: "סדין עם גומי", kind: "BEDDING", categories: ["bedding"], image: "sheet",
    description: "סדין עם גומי היקפי שנשאר במקום.",
    variants: [
      { options: { "מידה": "יחיד", "צבע": "לבן", "סוג בד": "ג׳רסי" }, price: s(49.9), stock: 30 },
      { options: { "מידה": "זוגי", "צבע": "לבן", "סוג בד": "ג׳רסי" }, price: s(69.9), stock: 25 },
      { options: { "מידה": "זוגי", "צבע": "שמנת", "סוג בד": "ג׳רסי" }, price: s(69.9), stock: 0 },
    ],
  },

  // ── Textile ──
  {
    slug: "bath-towel", name: "מגבת רחצה סופגת", kind: "BEDDING", categories: ["textile"], image: "towel", featured: true,
    description: "מגבת כותנה עבה וסופגת במיוחד.",
    variants: [
      { options: { "מידה": "70x140", "צבע": "לבן", "סוג בד": "כותנה" }, price: s(39.9), stock: 40 },
      { options: { "מידה": "70x140", "צבע": "אפור", "סוג בד": "כותנה" }, price: s(39.9), stock: 35 },
      { options: { "מידה": "90x150", "צבע": "לבן", "סוג בד": "כותנה" }, price: s(54.9), stock: 12 },
    ],
  },
  {
    slug: "fabric-tablecloth", name: "מפת שולחן בד", kind: "BEDDING", categories: ["textile", "hosting"], image: "tablecloth",
    description: "מפת בד דוחת כתמים, מתאימה לשבת וחג.",
    variants: [
      { options: { "מידה": "140x180", "צבע": "לבן" }, price: s(69.9), stock: 16 },
      { options: { "מידה": "140x240", "צבע": "לבן" }, price: s(89.9), stock: 10 },
    ],
  },
  {
    slug: "kitchen-towels-3", name: "שלישיית מגבות מטבח", kind: "BEDDING", categories: ["textile", "kitchen"], image: "towel",
    description: "מגבות מטבח מכותנה בדוגמת משבצות.",
    variants: [{ options: { "צבע": "אדום משבצות", "סוג בד": "כותנה" }, price: s(29.9), sale: s(22.9), stock: 45 }],
  },
  {
    slug: "cloth-napkins-4", name: "רביעיית מפיות בד", kind: "BEDDING", categories: ["textile", "hosting"], image: "napkin", ageDays: 10,
    description: "מפיות בד פשתן לשולחן חגיגי.",
    variants: [{ options: { "צבע": "טבעי", "סוג בד": "פשתן" }, price: s(44.9), stock: 18 }],
  },

  // ── Hosting ──
  {
    slug: "serving-tray-wood", name: "מגש הגשה מעץ", kind: "HOUSEWARE", categories: ["hosting"], image: "tray", featured: true,
    description: "מגש עץ טבעי עם ידיות – להגשת קפה, עוגות ואירוח.",
    variants: [
      { options: { "מידות": "40x28 ס״מ", "חומר": "עץ" }, price: s(59.9), stock: 14 },
      { options: { "מידות": "50x35 ס״מ", "חומר": "עץ" }, price: s(79.9), stock: 6 },
    ],
  },
  {
    slug: "wine-glasses-4", name: "רביעיית גביעי יין", kind: "HOUSEWARE", categories: ["hosting"], image: "glass",
    description: "גביעי יין מזכוכית דקה ועדינה.",
    variants: [{ options: { "נפח": "400 מ״ל", "חומר": "זכוכית" }, price: s(64.9), stock: 12 }],
  },
  {
    slug: "cake-stand", name: "מעמד לעוגה עם כיסוי", kind: "HOUSEWARE", categories: ["hosting", "birthdays"], image: "plate", ageDays: 4,
    description: "מעמד עוגה מרשים עם כיסוי זכוכית.",
    variants: [{ options: { "מידות": "28 ס״מ", "חומר": "זכוכית" }, price: s(89.9), stock: 5 }],
  },
  {
    slug: "snack-bowls-set", name: "סט קעריות לנשנושים", kind: "HOUSEWARE", categories: ["hosting"], image: "bowl",
    description: "שש קעריות קטנות להגשת מטבלים, אגוזים וחטיפים.",
    variants: [{ options: { "חומר": "קרמיקה", "צבע": "צבעוני" }, price: s(49.9), stock: 20 }],
  },

  // ── Birthdays ──
  {
    slug: "latex-balloons", name: "בלוני לטקס צבעוניים", kind: "DISPOSABLE", categories: ["birthdays"], image: "balloon", featured: true,
    description: "בלונים איכותיים בגודל 12 אינץ׳, מתאימים למילוי באוויר או הליום.",
    variants: [
      { options: { "כמות באריזה": "20", "צבע": "צבעוני" }, price: s(14.9), stock: 100 },
      { options: { "כמות באריזה": "20", "צבע": "זהב ולבן" }, price: s(16.9), stock: 70 },
      { options: { "כמות באריזה": "50", "צבע": "צבעוני" }, price: s(29.9), sale: s(24.9), stock: 40 },
    ],
  },
  {
    slug: "birthday-candles", name: "נרות יום הולדת", kind: "DISPOSABLE", categories: ["birthdays"], image: "candle",
    description: "נרות עוגה צבעוניים עם מחזיקים.",
    variants: [{ options: { "כמות באריזה": "24" }, price: s(6.9), stock: 150 }],
  },
  {
    slug: "happy-birthday-garland", name: "שרשרת ׳יום הולדת שמח׳", kind: "GENERAL", categories: ["birthdays"], image: "garland", ageDays: 1,
    description: "שרשרת דגלונים חגיגית לתלייה, אורך 2.5 מטר.",
    variants: [
      { options: { "צבע": "צבעוני" }, price: s(19.9), stock: 35 },
      { options: { "צבע": "זהב" }, price: s(22.9), stock: 20 },
    ],
  },
  {
    slug: "party-cups-kids", name: "כוסות מסיבה מודפסות", kind: "DISPOSABLE", categories: ["birthdays", "disposable"], image: "cup",
    description: "כוסות נייר עם הדפסים שמחים למסיבת ילדים.",
    variants: [{ options: { "כמות באריזה": "10", "חומר": "נייר" }, price: s(9.9), stock: 60 }],
  },
  {
    slug: "number-candle", name: "נר ספרה לעוגה", kind: "GENERAL", categories: ["birthdays"], image: "candle",
    description: "נר בצורת ספרה, זמין בכל הספרות.",
    variants: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => ({ options: { "ספרה": d, "צבע": "זהב" }, price: s(7.9), stock: 10 })),
  },

  // ── Storage ──
  {
    slug: "storage-box-lid", name: "קופסת אחסון עם מכסה", kind: "HOUSEWARE", categories: ["storage"], image: "box", featured: true,
    description: "קופסת אחסון שקופה ונערמת – לארונות, מחסן ומתחת למיטה.",
    variants: [
      { options: { "נפח": "10 ליטר", "חומר": "פלסטיק" }, price: s(24.9), stock: 40 },
      { options: { "נפח": "30 ליטר", "חומר": "פלסטיק" }, price: s(39.9), stock: 25 },
      { options: { "נפח": "60 ליטר", "חומר": "פלסטיק" }, price: s(59.9), stock: 10 },
    ],
  },
  {
    slug: "glass-jars-set", name: "סט צנצנות זכוכית", kind: "HOUSEWARE", categories: ["storage", "kitchen"], image: "jar",
    description: "שלוש צנצנות עם מכסה אטום לאחסון מזון יבש.",
    variants: [{ options: { "נפח": "1 ליטר", "חומר": "זכוכית" }, price: s(49.9), sale: s(39.9), stock: 22 }],
  },
  {
    slug: "woven-basket", name: "סל קלוע לאחסון", kind: "HOUSEWARE", categories: ["storage"], image: "basket", ageDays: 6,
    description: "סל קלוע דקורטיבי לסידור צעצועים, מגבות ועוד.",
    variants: [
      { options: { "מידות": "בינוני", "צבע": "טבעי" }, price: s(44.9), stock: 16 },
      { options: { "מידות": "גדול", "צבע": "טבעי" }, price: s(59.9), stock: 9 },
    ],
  },
  {
    slug: "velvet-hangers-20", name: "קולבי קטיפה 20 יח׳", kind: "GENERAL", categories: ["storage"], image: "hanger",
    description: "קולבים דקים מונעי החלקה – חוסכים מקום בארון.",
    variants: [
      { options: { "צבע": "שחור" }, price: s(34.9), stock: 30 },
      { options: { "צבע": "אפור" }, price: s(34.9), stock: 28 },
    ],
  },
  {
    slug: "food-containers-set", name: "סט קופסאות אוכל", kind: "HOUSEWARE", categories: ["storage", "kitchen"], image: "container",
    description: "חמש קופסאות אוכל אטומות, מתאימות למקפיא ולמיקרוגל.",
    variants: [{ options: { "חומר": "פלסטיק ללא BPA" }, price: s(39.9), stock: 33 }],
  },
  {
    slug: "drawer-organizer", name: "מארגן מגירות", kind: "GENERAL", categories: ["storage"], image: "tray",
    description: "מארגן מתכוונן לסכו״ם, כלי כתיבה ואביזרים.",
    variants: [{ options: { "צבע": "לבן" }, price: s(29.9), stock: 0 }],
  },
];

export const demoCoupons = [
  { code: "WELCOME10", description: "10% הנחה – קופון הדגמה", type: "PERCENT" as const, value: 10, minOrderTotal: s(100), combineWithSales: false },
  { code: "PARTY20", description: "20 ₪ הנחה על מוצרי ימי הולדת – קופון הדגמה", type: "FIXED" as const, value: s(20), minOrderTotal: s(80), combineWithSales: true, categorySlug: "birthdays" },
];

export const demoPromotions = [{ name: "מבצע אחסון – 15% הנחה (הדגמה)", type: "PERCENT" as const, value: 15, categorySlug: "storage" }];
