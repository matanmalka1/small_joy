/**
 * Generates simple, self-contained SVG illustrations for demo products and
 * categories into public/demo. No external image hosts, so no broken links.
 * Run: npm run demo:images   (output is committed)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Illustration =
  | "plate" | "cup" | "cutlery" | "balloon" | "candle" | "pillow" | "sheet" | "towel"
  | "pot" | "pan" | "mug" | "box" | "jar" | "tablecloth" | "napkin" | "glass" | "bowl"
  | "basket" | "hanger" | "tray" | "garland" | "knife" | "blanket" | "container";

const shapes: Record<Illustration, (c: string) => string> = {
  plate: (c) => `<ellipse cx="200" cy="210" rx="130" ry="130" fill="#fff" stroke="${c}" stroke-width="10"/><ellipse cx="200" cy="210" rx="85" ry="85" fill="none" stroke="${c}" stroke-width="6" stroke-dasharray="4 10"/>`,
  cup: (c) => `<path d="M120 120h160l-22 190a20 20 0 0 1-20 18h-76a20 20 0 0 1-20-18z" fill="#fff" stroke="${c}" stroke-width="10" stroke-linejoin="round"/><path d="M128 170h144" stroke="${c}" stroke-width="8"/>`,
  cutlery: (c) => `<g fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round"><path d="M140 100v220"/><path d="M118 100v60a22 22 0 0 0 44 0v-60"/><path d="M200 100v220"/><ellipse cx="200" cy="140" rx="20" ry="40" fill="#fff"/><path d="M262 320V100c28 20 34 70 0 110"/></g>`,
  balloon: (c) => `<ellipse cx="170" cy="160" rx="62" ry="78" fill="${c}"/><ellipse cx="245" cy="185" rx="55" ry="70" fill="#fff" stroke="${c}" stroke-width="8"/><path d="M170 238q-10 40 20 90M245 255q10 40-15 75" fill="none" stroke="${c}" stroke-width="4"/><ellipse cx="150" cy="130" rx="14" ry="22" fill="#fff" opacity=".5"/>`,
  candle: (c) => `<rect x="165" y="170" width="70" height="150" rx="10" fill="#fff" stroke="${c}" stroke-width="10"/><path d="M200 105c22 25 22 45 0 55-22-10-22-30 0-55z" fill="#f4b942"/><path d="M200 160v10" stroke="${c}" stroke-width="6"/><path d="M165 220h70M165 260h70" stroke="${c}" stroke-width="6" stroke-dasharray="10 8"/>`,
  pillow: (c) => `<path d="M95 140q105-40 210 0q20 70 0 140q-105 40-210 0q-20-70 0-140z" fill="#fff" stroke="${c}" stroke-width="10" stroke-linejoin="round"/><path d="M140 190q60-15 120 0" fill="none" stroke="${c}" stroke-width="6"/>`,
  sheet: (c) => `<rect x="90" y="110" width="220" height="190" rx="16" fill="#fff" stroke="${c}" stroke-width="10"/><path d="M90 160h220M90 200h220" stroke="${c}" stroke-width="6" opacity=".6"/><rect x="110" y="120" width="70" height="30" rx="10" fill="${c}" opacity=".35"/><rect x="220" y="120" width="70" height="30" rx="10" fill="${c}" opacity=".35"/>`,
  towel: (c) => `<rect x="120" y="90" width="160" height="230" rx="14" fill="#fff" stroke="${c}" stroke-width="10"/><path d="M120 270h160M120 290h160" stroke="${c}" stroke-width="8"/><path d="M150 90v-20h100v20" fill="none" stroke="${c}" stroke-width="8"/>`,
  pot: (c) => `<path d="M105 170h190v110a30 30 0 0 1-30 30h-130a30 30 0 0 1-30-30z" fill="#fff" stroke="${c}" stroke-width="10"/><path d="M90 170h220" stroke="${c}" stroke-width="12" stroke-linecap="round"/><path d="M175 150h50" stroke="${c}" stroke-width="14" stroke-linecap="round"/><path d="M105 200H75M295 200h30" stroke="${c}" stroke-width="12" stroke-linecap="round"/>`,
  pan: (c) => `<ellipse cx="170" cy="210" rx="95" ry="80" fill="#fff" stroke="${c}" stroke-width="10"/><ellipse cx="170" cy="210" rx="65" ry="52" fill="${c}" opacity=".2"/><path d="M262 190l85-40" stroke="${c}" stroke-width="18" stroke-linecap="round"/>`,
  mug: (c) => `<rect x="120" y="130" width="140" height="170" rx="20" fill="#fff" stroke="${c}" stroke-width="10"/><path d="M260 170h20a30 30 0 0 1 0 60h-20" fill="none" stroke="${c}" stroke-width="10"/><path d="M165 110q10-20 0-35M205 110q10-20 0-35" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  box: (c) => `<path d="M100 150l100-45 100 45v130l-100 45-100-45z" fill="#fff" stroke="${c}" stroke-width="10" stroke-linejoin="round"/><path d="M100 150l100 45 100-45M200 195v130" fill="none" stroke="${c}" stroke-width="8"/>`,
  jar: (c) => `<rect x="130" y="140" width="140" height="180" rx="30" fill="#fff" stroke="${c}" stroke-width="10"/><rect x="145" y="100" width="110" height="40" rx="10" fill="${c}"/><path d="M160 210h80" stroke="${c}" stroke-width="6" opacity=".6"/>`,
  tablecloth: (c) => `<path d="M80 140h240l-30 170H110z" fill="#fff" stroke="${c}" stroke-width="10" stroke-linejoin="round"/><path d="M110 140v170M150 140l-5 170M200 140v170M250 140l5 170M290 140v170" stroke="${c}" stroke-width="4" opacity=".4"/><path d="M80 140h240" stroke="${c}" stroke-width="12"/>`,
  napkin: (c) => `<path d="M110 120h180v180H110z" fill="#fff" stroke="${c}" stroke-width="10"/><path d="M110 120l180 180" stroke="${c}" stroke-width="6" opacity=".5"/><path d="M125 135h150v150H125z" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="8 8"/>`,
  glass: (c) => `<path d="M140 100h120l-15 110a45 45 0 0 1-90 0z" fill="#fff" stroke="${c}" stroke-width="10"/><path d="M200 255v55M160 315h80" stroke="${c}" stroke-width="10" stroke-linecap="round"/><path d="M150 150h100" stroke="${c}" stroke-width="6" opacity=".5"/>`,
  bowl: (c) => `<path d="M90 180h220a110 110 0 0 1-220 0z" fill="#fff" stroke="${c}" stroke-width="10"/><path d="M160 290h80" stroke="${c}" stroke-width="12" stroke-linecap="round"/><path d="M120 210q80 40 160 0" fill="none" stroke="${c}" stroke-width="6" opacity=".5"/>`,
  basket: (c) => `<path d="M90 170h220l-25 140H115z" fill="#fff" stroke="${c}" stroke-width="10" stroke-linejoin="round"/><path d="M140 170q60-110 120 0" fill="none" stroke="${c}" stroke-width="10"/><path d="M100 215h200M108 260h184" stroke="${c}" stroke-width="6"/>`,
  hanger: (c) => `<path d="M200 150v-20a22 22 0 1 0-22-22" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/><path d="M200 150L80 260h240z" fill="#fff" stroke="${c}" stroke-width="10" stroke-linejoin="round"/>`,
  tray: (c) => `<rect x="80" y="170" width="240" height="90" rx="18" fill="#fff" stroke="${c}" stroke-width="10"/><rect x="110" y="190" width="40" height="50" rx="8" fill="${c}" opacity=".3"/><rect x="180" y="190" width="40" height="50" rx="8" fill="${c}" opacity=".3"/><rect x="250" y="190" width="40" height="50" rx="8" fill="${c}" opacity=".3"/>`,
  garland: (c) => `<path d="M60 130q140 90 280 0" fill="none" stroke="${c}" stroke-width="6"/>${[0, 1, 2, 3, 4].map((i) => { const x = 90 + i * 55; const y = 150 + (i === 2 ? 30 : i % 2 ? 22 : 8); return `<path d="M${x - 20} ${y}h40l-20 60z" fill="${i % 2 ? "#f4b942" : c}"/>`; }).join("")}`,
  knife: (c) => `<path d="M110 280l150-150c20 10 25 35 5 55L140 300z" fill="#fff" stroke="${c}" stroke-width="10" stroke-linejoin="round"/><path d="M140 300l-30 30" stroke="${c}" stroke-width="22" stroke-linecap="round"/>`,
  blanket: (c) => `<path d="M90 120h220v150q-110 60-220 0z" fill="#fff" stroke="${c}" stroke-width="10"/><path d="M90 160h220M90 200h220M90 240h220" stroke="${c}" stroke-width="6" opacity=".5"/><path d="M150 120v170M250 120v170" stroke="${c}" stroke-width="6" opacity=".35"/>`,
  container: (c) => `<rect x="100" y="170" width="200" height="120" rx="16" fill="#fff" stroke="${c}" stroke-width="10"/><rect x="90" y="140" width="220" height="36" rx="12" fill="${c}"/><path d="M170 158h60" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`,
};

export function illustrationSvg(kind: Illustration, color: string, bg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img"><rect width="400" height="400" fill="${bg}"/><circle cx="330" cy="70" r="40" fill="#fff" opacity=".45"/><circle cx="60" cy="350" r="60" fill="#fff" opacity=".35"/>${shapes[kind](color)}</svg>`;
}

export const PALETTE: Array<{ color: string; bg: string }> = [
  { color: "#c4452f", bg: "#fde2db" },
  { color: "#1f6f69", bg: "#dcefeb" },
  { color: "#9a5b00", bg: "#fdf1d4" },
  { color: "#5b4b8a", bg: "#ebe6f7" },
  { color: "#2b6c9e", bg: "#e0eef8" },
  { color: "#8a3b62", bg: "#f7e3ec" },
];

export function writeDemoImage(outDir: string, file: string, kind: Illustration, paletteIndex: number) {
  mkdirSync(outDir, { recursive: true });
  const { color, bg } = PALETTE[paletteIndex % PALETTE.length];
  writeFileSync(join(outDir, file), illustrationSvg(kind, color, bg));
}
