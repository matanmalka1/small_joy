import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

/** Content pages managed from the admin. Slugs used by the storefront footer. */
export const CONTENT_PAGES = [
  { slug: "about", title: "אודות" },
  { slug: "faq", title: "שאלות נפוצות" },
  { slug: "shipping", title: "מדיניות משלוחים" },
  { slug: "returns", title: "מדיניות ביטולים והחזרות" },
  { slug: "terms", title: "תקנון" },
  { slug: "privacy", title: "מדיניות פרטיות" },
  { slug: "accessibility", title: "הצהרת נגישות" },
] as const;

export const getContentPage = cache(async (slug: string) => db.contentPage.findUnique({ where: { slug } }));

export type ContentBlock = { type: "h2"; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] };

/** Tiny, safe formatter: "## " headings, "- " bullet lists, blank-line paragraphs. No HTML is ever rendered. */
export function parseContent(body: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  for (const chunk of body.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const text = chunk.trim();
    if (!text) continue;
    if (text.startsWith("## ")) blocks.push({ type: "h2", text: text.slice(3).trim() });
    else if (text.split("\n").every((l) => l.trim().startsWith("- ")))
      blocks.push({ type: "ul", items: text.split("\n").map((l) => l.trim().slice(2)) });
    else blocks.push({ type: "p", text });
  }
  return blocks;
}
