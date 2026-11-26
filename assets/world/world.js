/* ─────────────────────────────────────────────────────────────
   The home page is a little world you can walk around.

   Everything is drawn in code, pixel by pixel, at a low resolution
   and blown up with hard edges. Layers scroll at different speeds
   (sky, clouds, floating islands, far hills, near hills, the ground,
   a foreground of dark leaves) so dragging feels like walking.

   The places on the map are the site's sections:
     the house          → /contact/
     the research lab   → /research/
     my head (a fairground attraction, kids running out of the mouth) → /about/
     the office         → /works/
   ───────────────────────────────────────────────────────────── */

import { drawSprite, SLOT_ORDER } from "/assets/face/face.js?v=px8";
import * as SP from "/assets/world/sprites.js?v=px12";

const SH = 300;            // scene height in world pixels
const GY = 236;            // the ground line: buildings stand here
const WW = 1120;           // world width
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── colour, dithering, noise ─────────────────────────────────────
const C = (h) => { const n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0; };
const R = (...hs) => hs.map(C);
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (B4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
function tone(r, v, x, y, soft = 2.2) {
    const n = r.length - 1;
    v = Math.max(0, Math.min(n, v));
    const i = Math.floor(v);
    let f = v - i;
    f = Math.max(0, Math.min(1, (f - 0.5) * soft + 0.5));
    return r[Math.min(n, f > bay(x, y) ? i + 1 : i)];
}
const hash = (x, y = 0, s = 0) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const SKY = R("#3a6cd6", "#4682e2", "#5899ea", "#70aef1", "#8fc4f5", "#b2daf8");
const CLOUD = R("#7887c2", "#9cadd9", "#c5d2ed", "#e8eff9", "#ffffff");
const ROCK = R("#24263f", "#3b3f66", "#585f8a", "#7f87b0", "#acb3d2");
const GRASS = R("#143a2a", "#1f5c38", "#2c7c3e", "#4aa23e", "#78c444", "#ade05a");
const FAR = R("#3c6878", "#4a7d88", "#5c9394", "#76a99f", "#9cc5b2");
const MID = R("#1b5236", "#276e3a", "#3b8b3d", "#59ab43", "#88c950");
const LEAF = R("#103626", "#1b5530", "#2b7736", "#47993a", "#77bd43", "#b0de5a");
const DARKLEAF = R("#0a1d16", "#11301f", "#1a442b", "#255a36", "#33723f");
const BARK = R("#231614", "#402a24", "#634434", "#89664a");
const WILLOW = R("#4b3240", "#795255", "#a88272", "#d2b393", "#efdcbd", "#fff5de");
const DIRT = R("#55372a", "#7a5236", "#a37446", "#c99b64", "#e6c693", "#f4e2b8");
const STONE = R("#373650", "#5a5978", "#8786a6", "#b5b4ca", "#e0deea");
const PLASTER = R("#765844", "#a5845e", "#cfb286", "#ead4a8", "#faeed0");
const WOOD = R("#2c1913", "#4c2d1e", "#71462a", "#98633a", "#bd854f");
const ROOF = R("#3c1520", "#6b232e", "#9f3533", "#cc593b", "#ec8955");
const BRICK = R("#3a191d", "#622729", "#8c3b33", "#b25941", "#d48159");
const METAL = R("#2c3046", "#4c5470", "#7a84a2", "#aeb7ce", "#e0e6f0", "#ffffff");
const GLASS = R("#1a2d50", "#2a4d7e", "#4075ae", "#6da4d6", "#a6d0f0", "#e2f3ff");
const TEAL = R("#13304a", "#1e5469", "#2e8391", "#56b6b6", "#9cdfd2", "#dcfaf0");
const GOLD = R("#3c2108", "#6c3d10", "#9e621a", "#cd8e26", "#eebc3d", "#fadf7a", "#fff4c2");
const BRONZE = R("#20110a", "#3c210e", "#5c3512", "#7f4f1a", "#a56c24", "#c88e33");
const YEL = R("#583508", "#986310", "#d6951c", "#f3c23a", "#ffe17a");
const RED = R("#45121c", "#7a1e26", "#b8322e", "#e2553c", "#f7865e");
const GATE = R("#110910", "#21101b", "#3a1a2a", "#652a38", "#9c433c", "#d8703e");
const OUT = C("#140f1c");
const GREEN = R("#173a26", "#245a36", "#357a46", "#4f9e5a", "#7cc27a");
const CREAM = C("#f2ecdf");
const WHITE = C("#ffffff");

// ── a tiny pixel buffer ─────────────────────────────────────────
class Px {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
    ok(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (c && this.ok(x, y)) this.d[y * this.w + x] = c; }
    get(x, y) { x = Math.floor(x); y = Math.floor(y); return this.ok(x, y) ? this.d[y * this.w + x] : 0; }
    rect(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c); }
    fill(x0, y0, x1, y1, fn) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = fn(x, y); if (c) this.set(x, y, c); } }
    disc(cx, cy, r, fn) {
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
            const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
            if (dx * dx + dy * dy <= r * r) { const c = typeof fn === "function" ? fn(x, y, dx / r, dy / r) : fn; if (c) this.set(x, y, c); }
        }
    }
    line(x0, y0, x1, y1, c, t = 1) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; this.rect(Math.round(x), Math.round(y), Math.round(x) + t - 1, Math.round(y) + t - 1, c); }
    }
    blit(src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.d[y * src.w + x]; if (c) this.set(ox + x, oy + y, c); } }
    outline(c = OUT) {
        const o = this.d.slice();
        for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
            if (this.d[y * this.w + x]) continue;
            if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) o[y * this.w + x] = c;
        }
        this.d = o;
        return this;
    }
    halo(c) {   // a new buffer with just the ring of pixels around this one's silhouette
        const o = new Px(this.w + 2, this.h + 2);
        for (let y = -1; y <= this.h; y++) for (let x = -1; x <= this.w; x++) {
            if (this.get(x, y)) continue;
            if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) o.set(x + 1, y + 1, c);
        }
        return o;
    }
    canvas() {
        const cv = document.createElement("canvas");
        cv.width = this.w; cv.height = this.h;
        const ctx = cv.getContext("2d");
        const im = ctx.createImageData(this.w, this.h);
        new Uint32Array(im.data.buffer).set(this.d);
        ctx.putImageData(im, 0, 0);
        return cv;
    }
}

// A 3 × 5 pixel font for signs.
const FONT = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
    F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", K: "101101110101101",
    L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
    R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", W: "101101101111101",
    Y: "101101010010010", " ": "000000000000000", "!": "010010010000010",
    Q: "010101101110011", Z: "111001010100111", X: "101101010101101", V: "101101101101010",
    "<": "001010100010001", ">": "100010001010100", "-": "000000111000000", "?": "110001010000010", ".": "000000000000010",
};
function text(p, str, x, y, c) {
    for (const ch of str) {
        const g = FONT[ch] || FONT[" "];
        for (let i = 0; i < 15; i++) if (g[i] === "1") p.set(x + (i % 3), y + Math.floor(i / 3), c);
        x += 4;
    }
}
const textW = (s) => s.length * 4 - 1;

// light from the upper left, for anything round
function sphereLight(nx, ny) {
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    return nx * -0.5 + ny * -0.62 + nz * 0.6;
}

// ── sky, clouds, islands, hills ─────────────────────────────────
function makeSky(w, h, oy) {
    const p = new Px(w, h);
    for (let y = 0; y < h; y++) {
        const sy = y - oy;
        const v = clamp((sy + 40) / (GY - 30), 0, 1) * (SKY.length - 1);
        for (let x = 0; x < w; x++) p.d[y * w + x] = tone(SKY, v, x, y, 1.6);
    }
    return p.canvas();
}

function makeCloud(seed, w, h) {
    const r = rng(seed);
    const p = new Px(w, h);
    const base = h - 3;
    const discs = [];
    const n = 7 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const rad = (0.32 + 0.68 * Math.sin(Math.PI * t)) * h * 0.46 * (0.75 + r() * 0.45) + 3;
        discs.push([8 + t * (w - 16) + (r() - 0.5) * 8, base - rad * 0.5 - r() * 5, rad]);
    }
    for (let i = 0; i < 4; i++) {   // a few puffs on top
        const t = 0.25 + r() * 0.5;
        const rad = h * (0.18 + r() * 0.14);
        discs.push([8 + t * (w - 16), base - h * 0.55 - r() * h * 0.15, rad]);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (y > base) continue;
        let best = -9;
        for (const [cx, cy, rad] of discs) {
            const dx = (x + 0.5 - cx) / rad, dy = (y + 0.5 - cy) / rad;
            if (dx * dx + dy * dy > 1) continue;
            best = Math.max(best, sphereLight(dx, dy) + (cy < base - h * 0.4 ? 0.15 : 0));
        }
        if (best < -5) continue;
        let v = 1.6 + best * 2.8 - Math.max(0, y - (base - 6)) * 0.35;
        p.set(x, y, tone(CLOUD, v, x, y));
    }
    return p.canvas();
}

function drawWillow(p, cx, by, size, seed) {
    const r = rng(seed);
    // a trunk that leans and kinks
    const top = by - size * 0.9;
    for (let y = by; y >= top; y--) {
        const t = (by - y) / (by - top);
        const x = cx + Math.sin(t * 2.4) * size * 0.12 + t * size * 0.1;
        const w = 2 + (1 - t) * 2.5;
        for (let i = -w; i <= w; i++) p.set(x + i, y, tone(BARK, 2.2 - (i / w) * 1.2, Math.round(x + i), y));
    }
    // canopy blobs
    const ccx = cx + size * 0.1, ccy = top + size * 0.05;
    const blobs = [];
    for (let i = 0; i < 7; i++) blobs.push([ccx + (r() - 0.5) * size * 1.1, ccy + (r() - 0.6) * size * 0.35, size * (0.18 + r() * 0.14)]);
    for (const [bx, byy, br] of blobs) p.disc(bx, byy, br, (x, y, nx, ny) => tone(WILLOW, 2.6 + sphereLight(nx, ny) * 2, x, y));
    // the hanging strands
    const x0 = Math.floor(ccx - size * 0.75), x1 = Math.ceil(ccx + size * 0.75);
    for (let x = x0; x <= x1; x++) {
        const edge = 1 - Math.abs(x - ccx) / (size * 0.75);
        if (edge <= 0) continue;
        let y0 = -1;
        for (let y = 0; y < p.h; y++) { const c = p.get(x, y); if (WILLOW.includes(c)) { y0 = y; } }
        if (y0 < 0) y0 = Math.round(ccy + size * 0.1);
        const len = Math.round((0.25 + edge * 0.55 + hash(x, seed) * 0.35) * size * 0.6);
        const shade = hash(x, 3, seed) < 0.35 ? -1 : 0;
        for (let i = 0; i < len; i++) {
            const t = i / len;
            const v = 3.4 - t * 2.4 + shade - (x > ccx ? 0.6 : 0);
            if (t > 0.85 && hash(x, i, seed) < 0.5) continue;
            p.set(x, y0 + i, tone(WILLOW, v, x, y0 + i));
        }
    }
}

function drawIsland(p, cx, topY, w, seed, opts = {}) {
    const half = w / 2, depth = w * 0.55;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
        const dx = (x - cx) / half;
        if (Math.abs(dx) > 1) continue;
        const t = topY + dx * dx * 3 + Math.round(hash(x, 1, seed) * 1.5);
        let b = topY + 4 + Math.pow(1 - dx * dx, 0.8) * depth;
        if (hash(Math.floor(x / 3), 2, seed) < 0.3) b += hash(Math.floor(x / 3), 5, seed) * depth * 0.35;   // drips of rock
        const crack = hash(Math.floor(x / 2), 7, seed) < 0.13;
        for (let y = Math.floor(t); y <= b; y++) {
            const d = (y - t) / (b - t);
            let v = 3.2 - dx * 1.1 - d * 1.9 + (hash(x, Math.floor(y / 4), seed) - 0.5) * 0.7;
            if (crack && d > 0.1) v -= 1.2;
            p.set(x, y, tone(ROCK, v, x, y));
        }
        // grass cap, dripping over the edge
        const hang = 2 + Math.floor(hash(x, 9, seed) * (Math.abs(dx) > 0.8 ? 6 : 3));
        for (let y = Math.floor(t); y < t + hang; y++) p.set(x, y, tone(GRASS, 4.4 - (y - t) * 0.6 - dx * 0.5, x, y));
        if (hash(x, 4, seed) < 0.5) p.set(x, t - 1, GRASS[5]);
        if (hash(x, 6, seed) < 0.15) p.set(x, t - 2, GRASS[4]);
    }
    if (opts.willow) drawWillow(p, cx - w * 0.05, topY + 1, opts.willow, seed + 1);
    if (opts.tree) drawTree(p, cx + w * 0.1, topY + 1, opts.tree, seed + 2);
}

function drawTree(p, cx, by, size, seed) {
    const r = rng(seed);
    const top = by - size;
    // trunk: lit on the left, a knot or two, roots spreading at the base
    for (let y = by; y >= top + size * 0.3; y--) {
        const w = 1.5 + (by - y < 4 ? 1.5 : 0) + (by - y < 2 ? 1 : 0);
        for (let i = -w; i <= w; i++) {
            const bark = hash(Math.round(cx + i), Math.floor(y / 3), seed) < 0.25 ? -0.8 : 0;
            p.set(cx + i, y, tone(BARK, 2.5 - (i / w) * 1.4 + bark, Math.round(cx + i), y));
        }
    }
    const ky = Math.round(by - size * 0.35); p.set(cx, ky, BARK[0]); p.set(cx - 1, ky, BARK[3]);
    for (const sd of [-1, 1]) { p.set(cx + sd * 4, by, BARK[1]); p.set(cx + sd * 5, by, BARK[1]); p.set(cx + sd * 4, by - 1, BARK[2]); }
    // a branch or two showing through
    p.line(cx, Math.round(top + size * 0.55), Math.round(cx - size * 0.18), Math.round(top + size * 0.42), BARK[1]);
    p.line(cx, Math.round(top + size * 0.5), Math.round(cx + size * 0.16), Math.round(top + size * 0.36), BARK[1]);
    const blobs = [];
    const n = 6 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = r() * size * 0.28;
        blobs.push([cx + Math.cos(a) * d * 1.2, top + size * 0.38 + Math.sin(a) * d * 0.8, size * (0.2 + r() * 0.12)]);
    }
    // little bumps round the edge so the outline reads as leaves, not a balloon
    const extra = [];
    for (const [bx, byy, br] of blobs) for (let k = 0; k < 4; k++) { const a = r() * Math.PI * 2; extra.push([bx + Math.cos(a) * br * 0.9, byy + Math.sin(a) * br * 0.8, br * (0.28 + r() * 0.15)]); }
    const all = blobs.concat(extra).sort((a, b) => a[1] - b[1]);
    const ccx = cx, ccy = top + size * 0.38, cr = size * 0.5;
    for (const [bx, byy, br] of all) {
        p.disc(bx, byy, br, (x, y, nx, ny) => {
            const gx = (x - ccx) / cr, gy = (y - ccy) / cr;
            let v = 2.4 + sphereLight(nx, ny) * 1.1 + sphereLight(clamp(gx, -1, 1), clamp(gy, -1, 1)) * 1.6 + (hash(x, y, seed) - 0.5) * 0.6;
            if (nx < -0.55 && ny < -0.35) v += 0.9;               // a lit rim on each clump
            if (ny > 0.75) v -= 0.6;                              // and shadow underneath
            return tone(LEAF, v, x, y);
        });
    }
    // leaf flecks, then fruit or blossom on some trees
    for (let i = 0; i < size * 1.2; i++) {
        const x = Math.round(cx + (r() - 0.5) * size * 0.9), y = Math.round(top + size * 0.12 + r() * size * 0.5);
        const c = p.get(x, y); if (LEAF.includes(c) && c !== LEAF[5]) p.set(x, y, LEAF[Math.min(5, LEAF.indexOf(c) + 1)]);
    }
    const kind = seed % 3;
    if (kind !== 2) for (let i = 0; i < size * 0.35; i++) {
        const x = Math.round(cx + (r() - 0.5) * size * 0.8), y = Math.round(top + size * 0.15 + r() * size * 0.45);
        if (!LEAF.includes(p.get(x, y))) continue;
        if (kind === 0) { p.set(x, y, RED[3]); p.set(x, y + 1, RED[1]); if (r() < 0.5) p.set(x - 1, y, C("#ffb08a")); }
        else { p.set(x, y, C("#fff0f4")); p.set(x + 1, y, C("#f6b0c8")); }
    }
}

function makeIslands() {
    const p = new Px(WW, SH);
    drawIsland(p, 100, 84, 120, 11, { willow: 70 });
    drawIsland(p, 300, 44, 54, 23, { tree: 26 });
    drawIsland(p, 880, 92, 76, 37, { tree: 34 });
    drawIsland(p, 650, 26, 30, 41, {});
    return p.outline(C("#2a2c48")).canvas();
}

function makeHills(kind) {
    const p = new Px(WW, SH);
    if (kind === "far") {
        // a bank of cloud along the horizon, half hidden by the hills
        for (let i = 0; i < 9; i++) {
            const cw = 140 + (i * 37) % 60;
            const cv = new Px(cw, 46);
            const src = makeCloudPx(500 + i, cw, 46);
            cv.blit(src, 0, 0);
            p.blit(cv, i * 130 - 30, GY - 132 + (i % 3) * 5);
        }
    }
    const H = kind === "far"
        ? (x) => GY - 70 - 20 * Math.sin(x * 0.011 + 1) - 12 * Math.sin(x * 0.027 + 2) - 5 * Math.sin(x * 0.061)
        : (x) => GY - 30 - 13 * Math.sin(x * 0.016 + 0.5) - 8 * Math.sin(x * 0.041 + 3) - 3 * Math.sin(x * 0.09);
    const ramp = kind === "far" ? FAR : MID;
    for (let x = 0; x < WW; x++) {
        const top = Math.round(H(x));
        for (let y = top; y < SH; y++) {
            const d = y - top;
            let v = (kind === "far" ? 3.4 : 3.6) - d / (kind === "far" ? 30 : 22);
            if (kind === "mid") v += (hash(x, Math.floor((y + hash(x, 9) * 4) / 3)) - 0.5) * 1.3;
            else v += (hash(Math.floor(x / 2), Math.floor(y / 3)) - 0.5) * 0.5;
            if (d === 0) v += 1;
            p.set(x, y, tone(ramp, v, x, y));
        }
        if (kind === "mid" && hash(x, 4) < 0.35) p.set(x, top - 1, ramp[4]);
    }
    // trees along the ridges
    const r = rng(kind === "far" ? 5 : 9);
    const n = kind === "far" ? 40 : 22;
    for (let i = 0; i < n; i++) {
        const x = r() * WW, top = H(x);
        if (kind === "far") {
            const rr = 3 + r() * 4;
            p.disc(x, top - rr * 0.4, rr, (px, py, nx, ny) => tone(FAR, 2.6 + sphereLight(nx, ny) * 1.6, px, py));
        } else {
            const tp = new Px(40, 50);
            drawTree(tp, 20, 49, 22 + r() * 16, 100 + i);
            // fade towards the hill colour
            for (let k = 0; k < tp.d.length; k++) if (tp.d[k]) { const li = LEAF.indexOf(tp.d[k]); if (li >= 0) tp.d[k] = MID[clamp(li, 0, 4)]; }
            p.blit(tp, Math.round(x - 20), Math.round(top - 46));
        }
    }
    return p.canvas();
}
function makeCloudPx(seed, w, h) {
    const cv = makeCloud(seed, w, h);
    const px = new Px(w, h);
    px.d.set(new Uint32Array(cv.getContext("2d").getImageData(0, 0, w, h).data.buffer));
    return px;
}

// ── places ──────────────────────────────────────────────────────
// Each is drawn into its own buffer, base at the bottom row, and gets an outline.

function makeHouse() {
    const w = 120, h = 100, p = new Px(w, h);
    const cx = 52, by = h - 1, L = cx - 34, Rr = cx + 34;
    // stone footing
    p.fill(L - 2, by - 6, Rr + 2, by, (x, y) => {
        const row = Math.floor((by - y) / 3), lx = (x + row * 3) % 7, ly = (by - y) % 3;
        if (lx === 6 || ly === 2) return STONE[1];
        return tone(STONE, 3 - (lx === 5 ? 1 : 0) + (ly === 0 ? 0.6 : 0) + (hash(Math.floor((x + row * 3) / 7), row) - 0.5), x, y);
    });
    // plaster walls with timber framing
    p.fill(L, by - 40, Rr, by - 7, (x, y) => {
        let v = 3 + (hash(x >> 1, y >> 1) - 0.5) * 0.5;
        if (x > Rr - 6) v -= 1;
        if (x === L) v += 1;
        if (y > by - 9) v -= 0.8;
        return tone(PLASTER, v, x, y);
    });
    const beam = (x0, y0, x1, y1) => p.line(x0, y0, x1, y1, WOOD[1], 2);
    beam(L, by - 41, L, by - 7); beam(Rr - 1, by - 41, Rr - 1, by - 7); beam(L, by - 24, Rr, by - 24);
    beam(L + 2, by - 24, L + 12, by - 40); beam(Rr - 3, by - 24, Rr - 13, by - 40);
    // the roof: a steep gable, tiles on the outside, the plaster gable inside
    const peak = by - 86, eave = by - 40;
    for (let y = peak; y <= eave + 2; y++) {
        const t = (y - peak) / (eave - peak);
        const half = 2 + t * ((Rr - L) / 2 + 6);
        const inner = half - 8;
        for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
            const dx = x - cx;
            if (Math.abs(dx) < inner && y > peak + 6) {
                let v = 3.2 + (hash(x >> 1, y >> 1) - 0.5) * 0.5 - (dx > 0 ? 0.7 : 0);
                p.set(x, y, tone(PLASTER, v, x, y));
            } else {
                const row = Math.floor(y / 3), seam = (x + (row % 2) * 3) % 6 === 0 || y % 3 === 2;
                let v = (dx < 0 ? 3.3 : 2.3) - (seam ? 1 : 0) + (hash(Math.floor((x + (row % 2) * 3) / 6), row) - 0.5) * 0.6;
                if (Math.abs(Math.abs(dx) - half) < 1) v += 0.8;          // lit edge of the tiles
                if (y >= eave + 1) v -= 1.2;
                p.set(x, y, tone(ROOF, v, x, y));
            }
        }
    }
    // round attic window in the gable
    p.disc(cx, by - 58, 6, (x, y) => WOOD[1]);
    p.disc(cx, by - 58, 4.6, (x, y, nx, ny) => tone(GLASS, 3 - ny * 1.4 + (nx < -0.2 && ny < 0 ? 1 : 0), x, y));
    p.rect(cx, by - 62, cx, by - 54, WOOD[2]); p.rect(cx - 4, by - 58, cx + 4, by - 58, WOOD[2]);
    // chimney
    p.fill(cx + 16, by - 84, cx + 24, by - 62, (x, y) => {
        const row = Math.floor(y / 2), lx = (x + (row % 2) * 2) % 4;
        let v = (lx === 3 || y % 2 === 1 ? 1.4 : 2.8) - (x > cx + 22 ? 0.8 : 0);
        return tone(BRICK, v, x, y);
    });
    p.rect(cx + 15, by - 86, cx + 25, by - 85, STONE[2]);
    // door: arched, planked, with a brass knob
    for (let y = by - 22; y <= by - 1; y++) for (let x = cx - 6; x <= cx + 6; x++) {
        const dx = x - cx, dy = y - (by - 16);
        if (dy < 0 && dx * dx + dy * dy * 1.4 > 44) continue;
        const plank = (x - cx + 6) % 4 === 0;
        p.set(x, y, tone(WOOD, (plank ? 1.4 : 2.8) - (dx > 3 ? 0.7 : 0) + (dx < -4 ? 0.5 : 0), x, y));
    }
    p.set(cx + 3, by - 11, YEL[4]); p.set(cx + 3, by - 10, YEL[2]);
    p.rect(cx - 8, by, cx + 8, by, STONE[3]);
    // two windows with flower boxes
    for (const wx of [cx - 27, cx + 15]) {
        p.rect(wx - 1, by - 35, wx + 12, by - 22, C("#f2ecdf"));
        p.fill(wx, by - 34, wx + 11, by - 23, (x, y) => {
            const d = (x - wx) - (y - (by - 34));
            return tone(GLASS, 2.2 + ((d > 1 && d < 4) ? 2 : 0) + (y - (by - 34)) * 0.06, x, y);
        });
        p.rect(wx + 5, by - 34, wx + 6, by - 23, C("#f2ecdf")); p.rect(wx, by - 29, wx + 11, by - 28, C("#f2ecdf"));
        p.rect(wx - 2, by - 21, wx + 13, by - 19, WOOD[2]); p.rect(wx - 2, by - 19, wx + 13, by - 19, WOOD[1]);
        for (let i = 0; i < 7; i++) {
            const fx = wx - 1 + i * 2;
            p.set(fx, by - 22, LEAF[3]); p.set(fx + 1, by - 23, LEAF[4]);
            p.set(fx, by - 23 - (i % 2), [RED[3], C("#f2d24a"), C("#f6a0c8")][i % 3]);
        }
    }
    // the mailbox, flag up: there's post
    const mx = Rr + 16;
    p.rect(mx, by - 14, mx + 1, by, WOOD[2]);
    p.fill(mx - 4, by - 21, mx + 5, by - 15, (x, y) => tone(METAL, x < mx ? 3.4 : 2.4, x, y));
    p.rect(mx - 4, by - 21, mx + 5, by - 21, METAL[4]);
    p.rect(mx + 6, by - 25, mx + 6, by - 17, RED[2]); p.rect(mx + 7, by - 25, mx + 8, by - 23, RED[3]);
    // a little fence
    for (let x = L - 14; x < L - 2; x += 3) p.rect(x, by - 8, x + 1, by, PLASTER[4]);
    p.rect(L - 14, by - 6, L - 2, by - 6, PLASTER[3]);
    // ivy climbing the left wall
    for (let i = 0; i < 3; i++) {
        let x = L + 1 + i * 3;
        for (let y = by - 6; y > by - 30 - i * 5; y--) {
            p.set(x, y, LEAF[2]);
            if (hash(x, y, 4) < 0.5) { p.set(x - 1, y, LEAF[3]); p.set(x + 1, y - 1, LEAF[4]); }
            if (hash(y, i, 7) < 0.3) x += hash(x, y, 9) < 0.5 ? -1 : 1;
        }
    }
    // moss along the eaves and up the tiles
    for (let x = L - 6; x <= Rr + 6; x++) {
        if (hash(x, 21) < 0.4) p.set(x, by - 40, LEAF[3]);
        if (hash(x, 22) < 0.25) p.set(x, by - 41, LEAF[4]);
        if (hash(x, 23) < 0.06) p.set(x, by - 43, LEAF[3]);
    }
    // a welcome mat and two pots by the door
    for (let x = cx - 7; x <= cx + 7; x++) p.set(x, by, (x & 1) ? RED[2] : YEL[3]);
    for (const px0 of [cx - 12, cx + 9]) {
        p.fill(px0, by - 4, px0 + 3, by - 1, (x, y) => tone(BRICK, (x === px0 + 3 ? 2.4 : 3.6) - (y === by - 4 ? -0.5 : 0), x, y));
        p.disc(px0 + 1.8, by - 6, 2.6, (x, y, nx, ny) => tone(LEAF, 3 + sphereLight(nx, ny) * 1.5, x, y));
        p.set(px0 + 1, by - 8, RED[3]); p.set(px0 + 3, by - 7, C("#f2d24a"));
    }
    // shutters, curtains and a plant in the window
    for (const wx of [cx - 27, cx + 15]) {
        for (const sx of [wx - 5, wx + 13]) p.fill(sx, by - 35, sx + 3, by - 22, (x, y) => (y - (by - 35)) % 3 === 2 ? GREEN[1] : tone(GREEN, x === sx ? 3.6 : 2.6, x, y));
        for (const sx of [wx - 4, wx + 15]) p.set(sx, by - 29, METAL[3]);   // hinges
        for (let i = 0; i < 4; i++) { p.rect(wx, by - 34 + i, wx + 3 - i, by - 34 + i, C("#f7d6dc")); p.rect(wx + 8 + i, by - 34 + i, wx + 11, by - 34 + i, C("#f7d6dc")); }
        p.rect(wx, by - 34, wx + 11, by - 34, C("#d8a0ac"));
    }
    p.disc(cx + 18, by - 25, 2, (x, y) => LEAF[3]); p.rect(cx + 17, by - 24, cx + 19, by - 23, BRICK[3]);
    // a little porch roof over the door, on brackets, with a lantern
    for (let i = 0; i < 5; i++) p.rect(cx - 11 + i, by - 27 + i, cx + 11 - i, by - 27 + i, i === 4 ? ROOF[1] : tone(ROOF, i % 2 ? 2.4 : 3.2, 0, i));
    p.rect(cx - 11, by - 23, cx + 11, by - 23, ROOF[1]);
    p.line(cx - 9, by - 22, cx - 7, by - 20, WOOD[1]); p.line(cx + 9, by - 22, cx + 7, by - 20, WOOD[1]);
    p.rect(cx + 9, by - 19, cx + 11, by - 15, METAL[0]); p.rect(cx + 10, by - 18, cx + 10, by - 16, YEL[4]); p.set(cx + 10, by - 20, METAL[1]);
    p.rect(cx - 2, by - 20, cx + 2, by - 19, C("#c8a060")); p.set(cx, by - 20, WOOD[0]);   // a number plate
    // a gutter along the eaves and a downpipe into a rain barrel
    p.rect(L - 7, by - 37, Rr + 6, by - 37, METAL[2]); p.rect(L - 7, by - 38, Rr + 6, by - 38, METAL[4]);
    p.rect(Rr + 4, by - 37, Rr + 5, by - 10, METAL[2]); p.rect(Rr + 4, by - 37, Rr + 4, by - 10, METAL[4]);
    for (const y of [by - 30, by - 20]) p.rect(Rr + 3, y, Rr + 6, y, METAL[1]);
    p.fill(Rr + 1, by - 8, Rr + 8, by - 1, (x, y) => (y === by - 6 || y === by - 3) ? METAL[1] : tone(WOOD, x > Rr + 6 ? 2 : 3.4, x, y));
    p.rect(Rr + 1, by - 9, Rr + 8, by - 9, WOOD[1]); p.rect(Rr + 2, by - 9, Rr + 7, by - 9, GLASS[2]);
    // ridge tiles, a finial, chimney pots and soot
    p.rect(cx - 2, peak - 1, cx + 2, peak, ROOF[1]); p.rect(cx, peak - 3, cx, peak - 2, METAL[1]); p.set(cx, peak - 4, YEL[3]);
    for (const px0 of [cx + 17, cx + 21]) { p.fill(px0, by - 90, px0 + 2, by - 87, (x, y) => tone(BRICK, x === px0 ? 4 : 3, x, y)); p.rect(px0 - 1, by - 90, px0 + 3, by - 90, BRICK[4]); }
    p.rect(cx + 16, by - 84, cx + 24, by - 83, BRICK[0]);
    p.rect(cx + 15, by - 63, cx + 25, by - 62, METAL[2]);   // lead flashing where it meets the roof
    // hairline cracks and a few stains in the plaster
    p.line(L + 22, by - 39, L + 25, by - 33, PLASTER[2]); p.line(Rr - 10, by - 15, Rr - 7, by - 11, PLASTER[2]);
    for (const [sx, sy] of [[L + 9, by - 8], [Rr - 18, by - 8], [L + 30, by - 38]]) { p.set(sx, sy, PLASTER[1]); p.set(sx + 1, sy, PLASTER[2]); }
    return { px: p.outline(), ax: cx, door: cx };
}

function makeLab() {
    const w = 156, h = 132, p = new Px(w, h);
    const by = h - 1;
    // the dome first, so the block sits in front of its base
    const dcx = 48, dcy = by - 58, dr = 30;
    p.disc(dcx, dcy, dr, (x, y, nx, ny) => {
        if (y > dcy) return 0;
        const ang = Math.atan2(nx, Math.max(0.05, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))));
        const rib = Math.abs(((ang / 0.32) % 1 + 1) % 1 - 0.5) < 0.08;
        let v = 2.4 + sphereLight(nx, ny) * 2.4 - (rib ? 0.9 : 0);
        return tone(METAL, v, x, y);
    });
    // the slit, and a telescope poking out
    p.fill(dcx - 4, dcy - dr + 2, dcx + 3, dcy, (x, y) => {
        const dx = x + 0.5 - dcx, dy = y + 0.5 - dcy;
        return dx * dx + dy * dy < (dr - 1) * (dr - 1) ? C("#141a2c") : 0;
    });
    p.line(dcx - 1, dcy - 12, dcx + 18, dcy - 38, METAL[4], 4);
    p.line(dcx + 1, dcy - 10, dcx + 20, dcy - 36, METAL[2], 2);
    p.rect(dcx + 17, dcy - 41, dcx + 22, dcy - 36, METAL[1]);
    p.rect(dcx - dr - 2, dcy - 1, dcx + dr + 2, dcy + 1, METAL[1]);
    // the main block: white panels
    const L = 8, Rr = 148, top = by - 58;
    p.fill(L, top, Rr, by, (x, y) => {
        let v = 3.1;
        if ((x - L) % 18 === 0) v -= 0.9;
        if (y === top + 26) v -= 0.9;
        if (x > Rr - 7) v -= 0.9;
        if (x < L + 2) v += 0.6;
        if (y > by - 3) v -= 0.6;
        return tone(METAL, v, x, y);
    });
    p.rect(L - 2, top - 3, Rr + 2, top - 1, METAL[1]); p.rect(L - 2, top - 3, Rr + 2, top - 3, METAL[3]);
    // the long window band
    const wy0 = top + 7, wy1 = top + 22;
    p.fill(L + 6, wy0, Rr - 6, wy1, (x, y) => {
        if ((x - L - 6) % 14 === 0) return METAL[1];
        const d = (x - L) - (y - wy0) * 1.5;
        let v = 2 + (y - wy0) / (wy1 - wy0) * 0.8 + ((d % 40 + 40) % 40 < 5 ? 1.8 : 0);
        return tone(TEAL, v, x, y);
    });
    p.rect(L + 6, wy1 + 1, Rr - 6, wy1 + 1, METAL[4]);
    // the sign and the glass doors
    const dx0 = 66, dx1 = 90;
    p.rect(dx0 - 4, top + 30, dx1 + 4, top + 38, C("#1b2236"));
    text(p, "LAB", Math.round((dx0 + dx1) / 2 - textW("LAB") / 2), top + 32, C("#9fe8f0"));
    p.fill(dx0, by - 18, dx1, by, (x, y) => {
        if (x === dx0 || x === dx1 || x === (dx0 + dx1) >> 1 || y === by - 18) return METAL[1];
        const d = (x - dx0) - (y - (by - 18));
        return tone(TEAL, 2.4 + (d > 2 && d < 5 ? 1.6 : 0), x, y);
    });
    // a mast with a dish
    const mx = 128;
    p.rect(mx, top - 40, mx + 1, top - 3, METAL[2]);
    for (let y = top - 36; y < top - 3; y += 6) p.line(mx - 3, y + 6, mx + 4, y, METAL[1]);
    for (let y = -10; y <= 10; y++) for (let x = -14; x <= 14; x++) {
        const a = -0.6, c = Math.cos(a), s = Math.sin(a);
        const u = (x * c + y * s) / 13, v = (-x * s + y * c) / 5;
        if (u * u + v * v > 1) continue;
        p.set(mx - 6 + x, top - 44 + y, tone(METAL, 3 + u * 0.8 - v * 1.4, x, y));
    }
    p.line(mx - 6, top - 44, mx + 2, top - 56, METAL[1]);
    p.rect(mx + 1, top - 58, mx + 3, top - 56, METAL[3]);
    // boxes on the roof
    p.fill(96, top - 9, 110, top - 4, (x, y) => tone(METAL, x > 107 ? 2 : 3, x, y));
    for (let x = 98; x < 109; x += 2) p.rect(x, top - 8, x, top - 6, METAL[1]);
    // "smile, you're being measured"
    for (let y = 0; y < 9; y++) { const hw = Math.floor(y * 0.62); for (let x = -hw; x <= hw; x++) p.set(35 + x, by - 24 + y, (Math.abs(x) === hw || y === 8) ? RED[1] : YEL[3]); }
    p.rect(35, by - 20, 35, by - 18, OUT); p.set(35, by - 16, OUT);
    p.rect(dx1 + 3, by - 17, dx1 + 8, by - 7, METAL[1]);
    p.rect(dx1 + 4, by - 16, dx1 + 7, by - 10, C("#0c1c16"));
    p.rect(dx1 + 5, by - 8, dx1 + 6, by - 8, METAL[3]);
    // rivets where the panels meet
    for (let x = L; x <= Rr; x += 18) for (const y of [top + 2, top + 24, top + 28, by - 4]) p.set(x + 1, y, METAL[4]);
    // solar panels on the roof, tilted to the sun
    for (let k = 0; k < 3; k++) {
        const x0 = 56 + k * 12;
        for (let y = 0; y < 7; y++) for (let x = 0; x < 10; x++) {
            const px = x0 + x + Math.floor(y / 2), py = top - 10 + y;
            p.set(px, py, (x % 3 === 2 || y % 3 === 2) ? C("#7a8ab8") : tone(R("#14234a", "#1e3a78", "#2c56a8", "#5a86d0"), 1.6 + (6 - y) * 0.25 + (x === 1 && y < 2 ? 1.5 : 0), px, py));
        }
        p.rect(x0 + 3, top - 3, x0 + 3, top - 2, METAL[1]); p.rect(x0 + 10, top - 4, x0 + 10, top - 2, METAL[1]);
    }
    // blinds half down in some of the panes
    for (let i = 0; i < 10; i++) {
        if (hash(i, 31) < 0.45) continue;
        const x0 = L + 7 + i * 14, h = 2 + Math.floor(hash(i, 32) * 6);
        for (let y = 0; y < h; y++) p.rect(x0, wy0 + y, x0 + 12, wy0 + y, y % 2 ? TEAL[4] : C("#e8f4f2"));
    }
    // a canopy over the door
    p.rect(dx0 - 8, by - 21, dx1 + 8, by - 20, METAL[4]); p.rect(dx0 - 8, by - 19, dx1 + 8, by - 19, METAL[1]);
    p.line(dx0 - 6, by - 19, dx0 - 2, by - 15, METAL[1]); p.line(dx1 + 6, by - 19, dx1 + 2, by - 15, METAL[1]);
    // round porthole windows, glowing
    for (const ox0 of [18, 120]) {
        p.disc(ox0, by - 12, 5, METAL[1]);
        p.disc(ox0, by - 12, 3.8, (x, y, nx, ny) => tone(R("#3a5a2a", "#6aa840", "#a8e070", "#e8ffb0"), 2.2 - ny * 1.2 + (nx < -0.2 && ny < -0.2 ? 1.2 : 0), x, y));
    }
    // pipes along the wall, with a red valve wheel
    p.rect(100, by - 27, 146, by - 26, METAL[3]); p.rect(100, by - 25, 146, by - 25, METAL[1]);
    p.rect(140, by - 25, 141, by - 1, METAL[3]); p.rect(142, by - 25, 142, by - 1, METAL[1]);
    for (const x of [108, 124, 138]) p.rect(x, by - 28, x + 1, by - 24, METAL[2]);
    p.disc(132, by - 30, 2.5, (x, y, nx, ny) => (nx * nx + ny * ny < 0.25 ? RED[1] : RED[3])); p.rect(132, by - 28, 132, by - 27, METAL[1]);
    // a generator humming by the wall
    p.fill(108, by - 9, 128, by, (x, y) => tone(R("#2a4a3a", "#3c6a50", "#5a9070", "#8ac0a0"), (y === by - 9 ? 3.6 : 2.4) - (x > 126 ? 1 : 0), x, y));
    p.disc(114, by - 4, 3, (x, y, nx, ny) => ((x + y) % 2 ? C("#1a2a22") : C("#3c6a50")));
    for (let y = by - 7; y < by - 1; y += 2) p.rect(120, y, 126, y, C("#1a2a22"));
    p.rect(110, by - 11, 111, by - 10, METAL[2]);
    // a hatch at the foot of the dome
    p.fill(dcx + 10, dcy - 8, dcx + 15, dcy - 2, (x, y) => tone(METAL, x === dcx + 10 ? 3.6 : 2.2, x, y)); p.set(dcx + 14, dcy - 5, YEL[3]);
    return { px: p.outline(), ax: 78, door: 78, scan: { x: dx1 + 4, y: by - 16 }, win: { x0: L + 6, y0: wy0, x1: Rr - 6, y1: wy1 }, mast: { x: mx + 2, y: top - 59 } };
}

function makeOffice() {
    const w = 112, h = 194, p = new Px(w, h);
    const by = h - 1, L = 12, Rr = 100, top = 34;
    // brick tower
    p.fill(L, top, Rr, by, (x, y) => {
        const row = Math.floor(y / 2), lx = (x + (row % 2) * 3) % 6;
        let v = (y % 2 === 1 || lx === 5) ? 1.9 : 2.9 + (hash(Math.floor((x + (row % 2) * 3) / 6), row) - 0.5) * 0.6;
        if (x > Rr - 6) v -= 0.9;
        if (x < L + 2) v += 0.5;
        return tone(BRICK, v, x, y);
    });
    // stone cornice and floor bands
    p.fill(L - 3, top - 4, Rr + 3, top, (x, y) => tone(STONE, y === top - 4 ? 4 : y === top ? 1.6 : 3, x, y));
    const cols = 4, rows = 7, cw = 13, rh = 11;
    const wins = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x0 = L + 8 + c * 21, y0 = top + 8 + r * 17;
        p.rect(x0 - 1, y0 - 1, x0 + cw, y0 + rh, BRICK[0]);
        p.fill(x0, y0, x0 + cw - 1, y0 + rh - 1, (x, y) => {
            const d = (x - x0) - (y - y0);
            return tone(GLASS, 2.6 + (y - y0) * 0.05 + (d > 2 && d < 5 ? 1.6 : 0), x, y);
        });
        p.rect(x0 + 6, y0, x0 + 6, y0 + rh - 1, BRICK[1]);
        p.rect(x0 - 2, y0 + rh + 1, x0 + cw + 1, y0 + rh + 1, STONE[3]);
        wins.push({ x: x0, y: y0, w: cw, h: rh });
    }
    // sign, awning, doors
    const sy = top + 8 + rows * 17 + 2;
    p.rect(36, sy, 76, sy + 8, C("#1b1424"));
    text(p, "WORKS", Math.round(56 - textW("WORKS") / 2), sy + 2, YEL[4]);
    for (let x = 32; x <= 80; x++) for (let y = sy + 11; y <= sy + 15; y++) {
        const stripe = Math.floor((x - 32) / 4) % 2 === 0;
        p.set(x, y, stripe ? RED[3] : C("#f6efe2"));
        if (y === sy + 15 && x % 4 === 1) p.set(x, y + 1, stripe ? RED[2] : C("#d8cfc0"));
    }
    p.fill(42, sy + 17, 70, by, (x, y) => {
        if (x === 42 || x === 70 || x === 56 || y === sy + 17) return METAL[1];
        const d = (x - 42) - (y - sy);
        return tone(GLASS, 2.8 + (d % 12 < 3 ? 1.4 : 0), x, y);
    });
    // water tower on the roof
    for (const lx of [22, 38]) p.line(lx, top - 4, lx + (lx < 30 ? 3 : -3), top - 18, WOOD[1], 2);
    p.fill(19, top - 34, 42, top - 18, (x, y) => tone(WOOD, ((x - 19) % 4 === 0 ? 1.6 : 3) - (x > 38 ? 0.8 : 0), x, y));
    p.rect(19, top - 30, 42, top - 30, METAL[1]); p.rect(19, top - 22, 42, top - 22, METAL[1]);
    for (let y = top - 41; y < top - 34; y++) { const hw = (y - (top - 42)) * 1.8; p.rect(Math.round(30.5 - hw), y, Math.round(30.5 + hw), y, tone(WOOD, 2, 0, y)); }
    // antenna
    p.rect(86, top - 30, 86, top - 4, METAL[2]); p.rect(84, top - 20, 88, top - 20, METAL[2]);
    const acs = [];
    for (const r of [1, 3, 5]) {
        const y0 = top + 8 + r * 17 + 2;
        p.fill(Rr + 1, y0, Rr + 7, y0 + 5, (x, y) => tone(METAL, (y === y0 ? 4 : 3) - (x === Rr + 7 ? 1 : 0), x, y));
        for (let y = y0 + 1; y <= y0 + 4; y += 2) p.rect(Rr + 2, y, Rr + 6, y, METAL[1]);
        acs.push({ x: Rr + 5, y: y0 + 6 });
    }
    // stone quoins up both corners
    for (let y = top + 1; y < by - 2; y += 4) {
        const wide = Math.floor((y - top) / 4) % 2 === 0;
        p.fill(L, y, L + (wide ? 4 : 2), y + 3, (x, yy) => tone(STONE, yy === y ? 4 : x === L ? 3.6 : 3, x, yy));
        p.fill(Rr - (wide ? 4 : 2), y, Rr, y + 3, (x, yy) => tone(STONE, yy === y ? 3.4 : 2.2, x, yy));
    }
    // dentils under the cornice
    for (let x = L - 2; x <= Rr + 2; x += 3) p.rect(x, top + 1, x + 1, top + 2, STONE[x > Rr - 4 ? 1 : 3]);
    // lintels with keystones, planters on some sills, rain streaks below others
    for (const [i, wnd] of wins.entries()) {
        p.rect(wnd.x - 2, wnd.y - 3, wnd.x + wnd.w + 1, wnd.y - 2, STONE[3]); p.rect(wnd.x - 2, wnd.y - 2, wnd.x + wnd.w + 1, wnd.y - 2, STONE[2]);
        p.rect(wnd.x + 5, wnd.y - 4, wnd.x + 7, wnd.y - 2, STONE[4]);
        if (hash(i, 41) < 0.25) { p.rect(wnd.x, wnd.y + wnd.h + 2, wnd.x + wnd.w - 1, wnd.y + wnd.h + 3, BRICK[4]); for (let k = 0; k < wnd.w; k += 2) p.set(wnd.x + k, wnd.y + wnd.h + 1, [LEAF[4], C("#f6a0c8"), LEAF[3], C("#f3c23a")][(k / 2 + i) % 4]); }
        else if (hash(i, 42) < 0.4) for (let k = 2; k < 5; k++) p.set(wnd.x + 1, wnd.y + wnd.h + 1 + k, BRICK[1]);
    }
    // a rooftop stair hut and a railing
    p.fill(48, top - 14, 62, top - 5, (x, y) => tone(STONE, y === top - 14 ? 4 : x > 60 ? 1.8 : 2.8, x, y));
    p.fill(52, top - 11, 57, top - 5, (x, y) => tone(WOOD, x === 52 ? 3.6 : 2.4, x, y)); p.set(56, top - 8, YEL[3]);
    for (let x = L - 2; x <= Rr + 2; x++) { if (x > 46 && x < 64) continue; p.set(x, top - 8, METAL[3]); if ((x - L) % 6 === 0) p.rect(x, top - 7, x, top - 5, METAL[2]); }
    // the ground floor: stone pilasters, steps, shop windows either side, wall lamps
    for (const px0 of [36, 72]) p.fill(px0, sy + 16, px0 + 4, by - 2, (x, y) => tone(STONE, (x === px0 ? 4 : x === px0 + 4 ? 2 : 3) - ((y - sy) % 6 === 0 ? 0.8 : 0), x, y));
    p.fill(34, by - 1, 78, by, (x, y) => tone(STONE, y === by - 1 ? 4 : 2.4, x, y));
    for (const [x0, x1] of [[15, 33], [79, 97]]) {
        p.fill(x0, sy + 17, x1, by - 4, (x, y) => {
            if (x === x0 || x === x1 || y === sy + 17) return BRICK[0];
            const d = (x - x0) - (y - sy);
            return tone(GLASS, 2.2 + (d % 14 < 2 ? 1.5 : 0), x, y);
        });
        p.rect(x0, by - 3, x1, by - 2, STONE[3]);
    }
    // inside the right window: a potted fig and a coat stand
    p.rect(84, by - 9, 87, by - 5, BRICK[3]); p.disc(85.5, by - 12, 3.2, (x, y, nx, ny) => tone(LEAF, 3 + sphereLight(nx, ny) * 1.4, x, y));
    p.rect(93, by - 16, 93, by - 5, WOOD[1]); p.rect(91, by - 15, 95, by - 15, WOOD[1]); p.rect(92, by - 14, 94, by - 10, C("#b8322e"));
    for (const lx of [33, 79]) { p.rect(lx, sy + 21, lx + 1, sy + 24, METAL[0]); p.set(lx, sy + 22, YEL[4]); p.set(lx + 1, sy + 22, YEL[3]); }
    p.rect(55, sy + 22, 57, sy + 27, METAL[0]); p.rect(55, sy + 23, 57, sy + 26, METAL[2]);   // a revolving door's middle
    return { px: p.outline(), ax: 56, door: 56, wins, acs, top, signY: sy, antenna: { x: 86, y: top - 31 }, flag: { x: 66, y: top - 22 } };
}

function makeRocket() {
    const w = 40, h = 84, p = new Px(w, h);
    const cx = 15, by = h - 1, nose = 4, base = by - 12;
    const halfAt = (y) => { const t = (y - nose) / (base - nose); return t < 0.32 ? 0.8 + Math.sqrt(t / 0.32) * 6.4 : 7.2 - Math.max(0, t - 0.82) * 9; };
    for (let y = nose; y <= base; y++) {
        const t = (y - nose) / (base - nose), half = halfAt(y);
        for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
            const nx = (x + 0.5 - cx) / (half + 0.5);
            const red = t < 0.24 || (t > 0.56 && t < 0.63);
            let v = (red ? 3.1 : 3.4) - nx * 1.9 + (nx < -0.55 ? 0.5 : 0);
            if (t > 0.24 && t < 0.26) v -= 1.2;                       // a seam under the nose cone
            if (y % 9 === 0 && t > 0.3) v -= 0.6;                     // panel lines
            p.set(x, y, tone(red ? RED : METAL, v, x, y));
            if (t > 0.3 && y % 9 === 2 && Math.abs(x - cx) === Math.round(half) - 1) p.set(x, y, METAL[1]);   // rivets
        }
    }
    // three portholes
    for (const py of [30, 40, 50]) { p.disc(cx, py, 3.2, METAL[1]); p.disc(cx, py, 2.3, (x, y, nx, ny) => tone(GLASS, 3 - ny * 1.5 + (nx < 0 && ny < 0 ? 1.2 : 0), x, y)); }
    // fins, shaded, with a white trim
    for (const sd of [-1, 1]) for (let i = 0; i < 18; i++) {
        const y = base - 16 + i, reach = Math.min(6, Math.floor(i / 2.4));
        for (let k = 0; k <= reach; k++) p.set(cx + sd * (Math.round(halfAt(Math.min(y, base))) + k), y, k === reach ? C("#f6efe2") : RED[sd < 0 ? 3 : 2]);
    }
    p.rect(cx - 1, base - 18, cx + 1, base, RED[2]);    // the middle fin, side on
    // the engine bell and a scorched pad
    for (let i = 0; i < 5; i++) p.rect(cx - 3 - Math.floor(i / 2), base + 1 + i, cx + 3 + Math.floor(i / 2), base + 1 + i, tone(METAL, 2 - i * 0.2, 0, i));
    p.fill(1, by - 5, w - 2, by, (x, y) => tone(STONE, (y === by - 5 ? 3.8 : 2.4) - (Math.abs(x - cx) < 9 && y === by - 5 ? 2 : 0), x, y));
    p.rect(cx - 8, by - 5, cx + 8, by - 5, C("#3a3236"));
    // the launch gantry, red and white lattice, with an arm to the rocket
    const gx = 30;
    for (let y = 2; y < by - 5; y++) {
        p.set(gx, y, RED[3]); p.set(gx + 5, y, RED[2]);
        if (y % 6 === 0) p.rect(gx, y, gx + 5, y, C("#f6efe2"));
        const k = y % 6; p.set(gx + Math.min(5, k), y, METAL[3]);
    }
    p.rect(cx + 6, 26, gx, 27, METAL[2]); p.rect(cx + 6, 28, gx, 28, METAL[1]);
    p.rect(gx - 1, 0, gx + 6, 1, RED[2]); p.rect(gx + 2, -1, gx + 3, 0, YEL[3]);
    return { px: p.outline(), ax: cx, light: { x: gx + 3, y: 0 } };
}

function makeSite() {
    // a building going up: scaffolding, half a wall, a crane
    const w = 150, h = 194, p = new Px(w, h);
    const by = h - 1;
    p.fill(14, by - 54, 98, by, (x, y) => {
        const top = by - 54 + Math.floor(hash(Math.floor(x / 6), 3) * 3) * 2 + (x > 60 ? 8 : 0);
        if (y < top) return 0;
        const row = Math.floor(y / 2), lx = (x + (row % 2) * 3) % 6;
        return tone(BRICK, (y % 2 === 1 || lx === 5) ? 1.8 : 2.9 - (x > 92 ? 0.8 : 0), x, y);
    });
    for (const x of [10, 40, 70, 100]) p.rect(x, by - 80, x + 1, by, METAL[2]);
    for (const y of [by - 80, by - 52, by - 26]) p.fill(8, y, 104, y + 2, (x, yy) => tone(WOOD, yy === y ? 3.4 : 2, x, yy));
    for (let i = 0; i < 3; i++) p.line(12 + i * 30, by - 28, 40 + i * 30, by - 50, METAL[1]);
    // crane
    const cx = 126;
    for (let y = by - 160; y <= by; y++) for (let x = cx; x <= cx + 5; x++) {
        const edge = x === cx || x === cx + 5;
        const diag = ((y + (x - cx)) % 6 === 0) || ((y - (x - cx)) % 6 === 0);
        if (edge || diag) p.set(x, y, tone(YEL, edge ? (x === cx ? 3.6 : 2.4) : 2, x, y));
    }
    for (let x = 20; x <= w - 1; x++) for (let y = by - 166; y <= by - 160; y++) {
        const edge = y === by - 166 || y === by - 160;
        if (edge || (x + y) % 6 === 0) p.set(x, y, tone(YEL, edge ? 3 : 2, x, y));
    }
    p.fill(cx - 2, by - 176, cx + 7, by - 167, (x, y) => tone(YEL, 3 - (x > cx + 4 ? 1 : 0), x, y));
    p.fill(cx + 8, by - 165, w - 1, by - 158, (x, y) => tone(STONE, 2.2, x, y));
    // guard rails, toe boards and a ladder between the levels
    for (const y of [by - 80, by - 52, by - 26]) {
        p.rect(8, y - 7, 104, y - 7, METAL[3]); p.rect(8, y - 4, 104, y - 4, METAL[1]);
        for (let x = 8; x <= 104; x += 8) p.rect(x, y - 7, x, y - 1, METAL[2]);
    }
    for (const [y0, y1] of [[by - 52, by - 26], [by - 26, by]]) {
        p.rect(54, y0 + 3, 54, y1, WOOD[1]); p.rect(58, y0 + 3, 58, y1, WOOD[1]);
        for (let y = y0 + 6; y < y1; y += 4) p.rect(55, y, 57, y, WOOD[3]);
    }
    // green safety netting on the right half
    p.fill(72, by - 79, 103, by - 54, (x, y) => ((x + y) % 4 === 0 || (x - y) % 4 === 0) ? C("#2e8a4a") : 0);
    // a pallet of bricks and a cement mixer
    p.fill(104, by - 3, 120, by, (x, y) => tone(WOOD, y === by - 3 ? 3.6 : (x % 4 === 0 ? 2.6 : 1.4), x, y));
    p.fill(105, by - 11, 119, by - 4, (x, y) => (y % 2 === 0 || (x + (y % 4 === 1 ? 2 : 0)) % 5 === 0) ? BRICK[1] : tone(BRICK, x > 117 ? 2.4 : 3.4, x, y));
    p.disc(16, by - 9, 6, (x, y, nx, ny) => tone(R("#4a5a6a", "#6a7a8a", "#e2553c", "#f0784a", "#ffa070"), 2.4 + sphereLight(nx, ny) * 1.8, x, y));
    p.rect(13, by - 15, 19, by - 14, OUT); p.line(10, by - 3, 16, by - 9, METAL[1]); p.line(22, by - 3, 16, by - 9, METAL[1]);
    p.disc(11, by - 2, 1.8, OUT); p.disc(22, by - 2, 1.8, OUT);
    // the SOON board, in hazard stripes
    p.fill(24, by - 12, 48, by - 4, (x, y) => (x === 24 || x === 48 || y === by - 12 || y === by - 4) ? (((x + y) >> 1) % 2 ? OUT : YEL[3]) : C("#f6efe2"));
    text(p, "SOON", 29, by - 10, RED[2]);
    p.rect(27, by - 3, 27, by, WOOD[1]); p.rect(45, by - 3, 45, by, WOOD[1]);
    // the crane: a peak with stays to both ends of the jib, a cab with a driver, counterweights, a concrete base
    p.line(cx + 2, by - 186, 24, by - 165, METAL[1]); p.line(cx + 3, by - 186, w - 2, by - 166, METAL[1]);
    p.rect(cx + 1, by - 188, cx + 4, by - 177, YEL[2]); p.rect(cx + 2, by - 189, cx + 3, by - 189, RED[3]);
    p.fill(cx - 6, by - 158, cx + 1, by - 150, (x, y) => tone(YEL, x === cx - 6 ? 4 : 3, x, y));
    p.fill(cx - 5, by - 157, cx - 1, by - 154, (x, y) => tone(GLASS, 3 + (x === cx - 5 ? 1 : 0), x, y)); p.rect(cx - 3, by - 155, cx - 2, by - 154, C("#c18a5e"));
    for (let i = 0; i < 3; i++) p.fill(w - 14 + i * 4, by - 166, w - 11 + i * 4, by - 157, (x, y) => tone(STONE, (y - (by - 166)) % 3 === 0 ? 1.4 : 2.6, x, y));
    p.fill(cx - 4, by - 3, cx + 9, by, (x, y) => tone(STONE, y === by - 3 ? 3.6 : 2.2, x, y));
    for (let x = cx - 4; x <= cx + 9; x++) if ((x >> 1) % 2) p.set(x, by - 4, YEL[3]); else p.set(x, by - 4, OUT);
    return { px: p.outline(), ax: 60, jib: { x0: 24, x1: 110, y: by - 159 }, planks: [by - 80, by - 52, by - 26], lightY: by - 190 };
}


// ── the little things: lamps, benches, signposts, a ticket booth, a pond… ──
const D = {
    lamps: [60, 262, 940, 1112], benches: [226], signs: [[484, "<LAB", "ME>"]],
    birdhouse: 86, booth: 514, cart: 622, cones: [996, 1006, 1016], potty: 1092,
    pond: { x: 330, y: GY + 31, rx: 32, ry: 6 }, picnic: { x: 700, y: GY + 31 }, laundry: [204, 244], cctv: 378,
    kite: { x: 470, y: GY + 40 }, veg: [116, 184],
};
const P_HEAD_X = 570;
const PINK = R("#6e2448", "#b0447c", "#e47aae", "#ffb2d4", "#ffe2ef");
function decorate(g, front) {
    const P2 = (x, y, c) => g.set(x, y, c);
    const prop = (w, h, x0, y0, fn, onto = g) => { const q = new Px(w, h); fn(q); q.outline(); onto.blit(q, x0, y0); };
    const CR = R("#a89c88", "#cfc5b0", "#efe8da", "#fffaf0");
    for (const x of D.lamps) prop(11, 40, x - 5, GY - 39, (q) => {
        const c = 5, B = 39;
        q.fill(c - 2, B - 2, c + 2, B, (xx, yy) => tone(METAL, yy === B - 2 ? 3 : 1.4, xx, yy));
        q.rect(c - 1, B - 4, c + 1, B - 3, METAL[2]);
        for (let y = B - 25; y < B - 4; y++) { q.set(c, y, METAL[2]); if (y % 3 === 0) q.set(c, y, METAL[1]); }
        q.rect(c - 1, B - 14, c + 1, B - 13, METAL[3]);
        q.set(c - 2, B - 24, METAL[2]); q.set(c + 2, B - 24, METAL[2]); q.set(c - 3, B - 25, METAL[2]); q.set(c + 3, B - 25, METAL[2]);   // little scrolls
        q.fill(c - 3, B - 32, c + 3, B - 26, (xx, yy) => (xx === c - 3 || xx === c + 3 || yy === B - 26) ? METAL[1] : xx === c ? METAL[1] : tone(YEL, 4 - (yy - (B - 32)) * 0.25, xx, yy));
        q.set(c - 2, B - 31, C("#fffbe8"));
        for (let i = 0; i < 3; i++) q.rect(c - 3 + i, B - 33 - i, c + 3 - i, B - 33 - i, METAL[i === 0 ? 1 : 2]);
        q.set(c, B - 36, METAL[1]); q.set(c, B - 37, YEL[3]);
    });
    for (const [x, a, b] of D.signs) prop(64, 40, x - 32, GY - 39, (q) => {
        const px = 32, B = 39;
        q.fill(px, B - 32, px + 1, B, (xx, yy) => tone(WOOD, xx === px ? 3.4 : 2, xx, yy)); q.rect(px - 1, B - 33, px + 2, B - 33, WOOD[3]);
        [[a, B - 30], [b, B - 21]].forEach(([t, y]) => {
            const left = t.startsWith("<"), label = t.replace(/[<>]/g, ""), w = textW(label) + 8;
            const x0 = left ? px - w + 4 : px - 2;
            for (let yy = 0; yy < 7; yy++) for (let xx = 0; xx < w; xx++) {
                const tip = left ? xx : w - 1 - xx, cut = Math.abs(yy - 3);
                if (tip < cut) continue;
                const grain = (hash(Math.floor((x0 + xx) / 3), yy, 5) < 0.2) ? -0.7 : 0;
                q.set(x0 + xx, y + yy, tone(WOOD, (yy === 0 ? 4.4 : yy === 6 ? 2 : 3.4) + grain, xx, yy));
            }
            text(q, label, x0 + (left ? 5 : 3), y + 1, WOOD[0]);
            q.set(px, y + 1, METAL[4]); q.set(px + 1, y + 5, METAL[3]);   // nails
        });
    });
    // the ticket booth: striped walls, a scalloped awning, a bulb-lit sign
    prop(30, 46, D.booth - 3, GY - 45, (q) => {
        const B = 45, L0 = 4, R0 = 25, mid = (L0 + R0) >> 1;
        q.fill(L0 - 1, B - 2, R0 + 1, B, (x, y) => tone(WOOD, y === B - 2 ? 4 : 2.2, x, y));
        q.fill(L0, B - 18, R0, B - 3, (x, y) => tone(Math.floor((x - L0) / 3) % 2 ? CR : RED, 2.6 - (x > R0 - 3 ? 1 : 0) + (x < L0 + 2 ? 0.6 : 0) - (y > B - 5 ? 0.5 : 0), x, y));
        q.fill(L0 + 3, B - 16, R0 - 3, B - 9, () => C("#2a1622"));
        q.disc(L0 + 6, B - 12, 2, YEL[3]); q.set(L0 + 6, B - 12, YEL[1]);                                   // a roll of tickets
        q.rect(R0 - 9, B - 15, R0 - 5, B - 12, C("#1f3a2a")); q.set(R0 - 8, B - 14, CREAM); q.set(R0 - 6, B - 13, CREAM);   // the price board
        q.rect(L0 + 1, B - 9, R0 - 1, B - 9, WOOD[4]); q.rect(L0 + 1, B - 8, R0 - 1, B - 8, WOOD[1]);
        for (const [dx, dy] of [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [1, 1]]) q.set(mid + dx, B - 5 + dy, YEL[3]);
        for (let y = 0; y < 6; y++) q.fill(L0 - 2, B - 24 + y, R0 + 2, B - 24 + y, (x) => tone(Math.floor((x - L0 + 2) / 3) % 2 ? CR : RED, 3.2 - y * 0.3 - (x > R0 ? 0.8 : 0), x, B - 24 + y));
        for (let x = L0 - 2; x <= R0 + 2; x++) if ((x - L0 + 2) % 3 === 1) q.set(x, B - 18, Math.floor((x - L0 + 2) / 3) % 2 ? CR[2] : RED[2]);
        q.fill(L0 + 1, B - 34, R0 - 1, B - 26, (x, y) => (x === L0 + 1 || x === R0 - 1 || y === B - 34 || y === B - 26) ? YEL[3] : C("#1b1424"));
        text(q, "TIX", mid - 5, B - 32, YEL[4]);
        q.rect(mid, B - 41, mid, B - 35, METAL[2]); q.rect(mid + 1, B - 41, mid + 4, B - 40, RED[3]); q.rect(mid + 1, B - 39, mid + 2, B - 39, RED[3]);
    }, front);   // in front of the head, which is drawn later
    D.boothBulbs = []; { const L0 = D.booth - 3 + 5, R0 = D.booth - 3 + 24, T = GY - 45 + 45 - 34, Bt = GY - 45 + 45 - 26; for (let x = L0; x <= R0; x += 2) { D.boothBulbs.push([x, T]); D.boothBulbs.push([x, Bt]); } }
    // the cotton candy cart, under a striped umbrella
    prop(34, 44, D.cart - 17, GY - 43, (q) => {
        const B = 43, cx = 17;
        q.rect(cx, B - 33, cx, B - 12, METAL[3]); q.set(cx, B - 41, YEL[3]); q.rect(cx - 1, B - 40, cx + 1, B - 40, YEL[3]);
        for (let j = 0; j < 7; j++) {
            const half = Math.round(12 * Math.sqrt(1 - ((6 - j) / 7) ** 2)), y = B - 39 + j;
            for (let x = cx - half; x <= cx + half; x++) { const seg = Math.floor(((x - cx) / (half + 0.5) + 1) * 3); q.set(x, y, tone(seg % 2 ? CR : PINK, 3 - (x - cx) / 12 * 1.2 - j * 0.12, x, y)); }
        }
        for (let x = cx - 12; x <= cx + 12; x++) if ((x - cx + 12) % 4 === 1 || (x - cx + 12) % 4 === 2) q.set(x, B - 32, Math.floor(((x - cx) / 12.5 + 1) * 3) % 2 ? CR[1] : PINK[2]);
        for (const [bx, by, br] of [[cx - 5, B - 18, 3.2], [cx + 4, B - 19, 3.6]]) {
            q.rect(Math.round(bx), Math.round(by + br), Math.round(bx), B - 12, CREAM);
            q.disc(bx, by, br, (x, y, nx, ny) => tone(PINK, 2.8 + sphereLight(nx, ny) * 1.8 + (hash(x, y, 3) - 0.5) * 0.7, x, y));
        }
        q.fill(cx - 10, B - 12, cx + 10, B - 5, (x, y) => (y === B - 12 ? PINK[4] : y === B - 5 ? PINK[0] : tone(PINK, (x > cx + 8 ? 1.6 : 2.7) + (x < cx - 8 ? 0.6 : 0), x, y)));
        text(q, "YUM", cx - 6, B - 10, PINK[0]);
        q.line(cx + 10, B - 10, cx + 14, B - 14, METAL[1]); q.rect(cx + 13, B - 15, cx + 15, B - 15, METAL[3]);
        for (const wx of [cx - 6, cx + 6]) {
            q.disc(wx, B - 3, 3.3, METAL[1]); q.disc(wx, B - 3, 2.2, (x, y) => ((x - wx === 0 || y - (B - 3) === 0) ? METAL[3] : 0)); q.set(wx, B - 3, METAL[4]);
        }
    });
    // the red carpet gets brass posts and a velvet rope
    for (const sd of [-1, 1]) {
        const posts = [GY + 3, GY + 10].map((y) => [Math.round(P_HEAD_X + 0.5 + sd * (7 + (y - GY) * 0.45 + 3)), y]);
        for (const [x, y] of posts) { g.rect(x, y - 6, x, y, YEL[2]); g.set(x, y - 7, YEL[4]); g.rect(x - 1, y, x + 1, y, YEL[1]); }
        const [[x0, y0], [x1, y1]] = posts;
        for (let i = 0; i <= 10; i++) { const t = i / 10; g.set(Math.round(x0 + (x1 - x0) * t), Math.round(y0 - 5 + (y1 - y0) * t + Math.sin(Math.PI * t) * 2), RED[1]); }
    }
    { // a portable toilet, of course (with a vent, a little sign, a skid)
        const x0 = D.potty;
        g.fill(x0, GY - 22, x0 + 12, GY, (x, y) => tone(GLASS, x > x0 + 9 ? 1.8 : x === x0 ? 3.4 : 2.6, x, y));
        g.rect(x0 - 1, GY - 24, x0 + 13, GY - 23, C("#e8eef5")); g.rect(x0 + 10, GY - 27, x0 + 11, GY - 25, METAL[2]);
        g.rect(x0 + 2, GY - 20, x0 + 10, GY - 20, GLASS[0]); g.rect(x0 + 2, GY - 20, x0 + 2, GY - 1, GLASS[0]); g.rect(x0 + 10, GY - 20, x0 + 10, GY - 1, GLASS[0]);
        P2(x0 + 6, GY - 17, YEL[4]); P2(x0 + 5, GY - 16, YEL[4]); P2(x0 + 6, GY - 15, YEL[4]);
        P2(x0 + 8, GY - 10, METAL[4]);
        g.rect(x0 + 4, GY - 13, x0 + 8, GY - 12, C("#f6efe2")); g.rect(x0, GY, x0 + 12, GY, METAL[1]);
        for (let x = x0; x <= x0 + 12; x += 3) g.set(x, GY - 23, C("#c8d2de"));
    }
    { // the pond, with lily pads and reeds
        const { x: cx, y: cy, rx, ry } = D.pond;
        for (let y = cy - ry - 2; y <= cy + ry + 2; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
            const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
            if (d <= 1) g.set(x, y, tone(GLASS, 2.2 + dy * 0.9 + (hash(x, y, 8) < 0.04 ? 2.5 : 0), x, y));
            else if (d <= 1.45 && hash(x, y, 2) < 0.7) g.set(x, y, tone(STONE, 2.6 + (hash(x, y, 5) - 0.5) * 1.6, x, y));
        }
        for (const [lx, ly] of [[cx - 18, cy + 2], [cx + 14, cy - 2], [cx + 22, cy + 3]]) { g.disc(lx, ly, 1.8, LEAF[3]); P2(lx, ly, LEAF[1]); }
        // a little wooden jetty
        g.fill(cx - rx - 6, cy - 2, cx - rx + 10, cy + 1, (x, y) => tone(WOOD, (y === cy - 2 ? 4.2 : 3) - ((x - cx) % 3 === 0 ? 1.2 : 0), x, y));
        for (const px of [cx - rx + 3, cx - rx + 9]) g.rect(px, cy + 2, px, cy + 4, WOOD[1]);
        P2(cx + 14, cy - 3, C("#f6a0c8")); P2(cx + 15, cy - 3, C("#fff6e8"));
        for (const [rx0, h] of [[cx - rx - 1, 8], [cx - rx + 1, 6], [cx + rx, 7], [cx + rx + 2, 9], [cx + rx - 2, 5]]) {
            g.rect(rx0, cy - h, rx0, cy, LEAF[3]); g.rect(rx0, cy - h - 2, rx0, cy - h, BARK[2]);
        }
    }
    { // a picnic blanket and basket
        const { x, y } = D.picnic;
        for (let yy = y - 3; yy <= y + 4; yy++) {
            const sk = Math.round((y + 4 - yy) * 0.6);   // drawn in a little perspective
            for (let xx = x - 17 + sk; xx <= x + 17 - sk; xx++) {
                const a = ((xx - x + 40) >> 1) % 2, b = ((yy - y + 40) >> 1) % 2;
                const c = a && b ? RED[2] : a || b ? RED[4] : C("#f6efe2");
                g.set(xx, yy, yy === y + 4 ? RED[1] : c);
            }
        }
    }
    for (const x of D.laundry) { g.fill(x - 1, GY - 32, x, GY, (xx, yy) => tone(WOOD, xx === x - 1 ? 3.4 : 2, xx, yy)); g.rect(x - 3, GY - 32, x + 2, GY - 32, WOOD[3]); g.rect(x - 3, GY - 31, x + 2, GY - 31, WOOD[1]); }
    g.rect(D.cctv, GY - 29, D.cctv, GY, METAL[1]); g.rect(D.cctv - 1, GY - 1, D.cctv + 1, GY, METAL[0]);
}

// ── the Ferris wheel's fixed parts: truss legs behind and in front, the rims, a boarding deck ──
const WR = 44, WCY = GY - 60;   // radius and hub height
function makeWheelParts() {
    const w = 140, h = 130, ox = 70, oy = 62, gy = oy + (GY - WCY);   // gy: the ground, in local pixels
    const back = new Px(w, h), rims = new Px(w, h), front = new Px(w, h);
    const truss = (p, s, dx, ramp, lv) => {
        const top = [ox + dx, oy + 2], outer = [ox + dx + s * 36, gy - 6], inner = [ox + dx + s * 24, gy - 6];
        p.line(top[0], top[1], outer[0], outer[1], tone(ramp, lv + 0.8, 0, 0), 2);
        p.line(top[0], top[1] + 5, inner[0], inner[1], tone(ramp, lv, 0, 0), 2);
        for (let i = 1; i < 9; i++) {
            const t0 = i / 9, t1 = (i + 0.5) / 9;
            const ax = top[0] + (outer[0] - top[0]) * t0, ay = top[1] + (outer[1] - top[1]) * t0;
            const bx = top[0] + (inner[0] - top[0]) * t1, by = top[1] + 5 + (inner[1] - top[1] - 5) * t1;
            p.line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), tone(ramp, lv - 0.6, 0, 0));
        }
    };
    truss(back, -1, -3, METAL, 1.2); truss(back, 1, -3, METAL, 1.2);
    // two rims, lit from the upper left
    for (const [r, t] of [[WR, 2], [WR - 4, 1], [WR * 0.42, 1]]) {
        for (let k = 0; k < 900; k++) {
            const a = k / 900 * Math.PI * 2, x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r;
            const lit = -Math.cos(a) * 0.5 - Math.sin(a) * 0.7;
            for (let j = 0; j < t; j++) rims.set(Math.round(x - Math.cos(a) * j), Math.round(y - Math.sin(a) * j), r > WR - 1 ? RED[clamp(Math.round(2.8 + lit * 1.3 - j * 0.8), 0, 4)] : METAL[clamp(Math.round(3 + lit), 0, 5)]);
        }
    }
    truss(front, -1, 0, METAL, 2.6); truss(front, 1, 0, METAL, 2.6);
    // the hub, bolted
    front.disc(ox + 0.5, oy + 0.5, 5.5, (x, y, nx, ny) => tone(METAL, 2.6 + sphereLight(nx, ny) * 2, x, y));
    front.disc(ox + 0.5, oy + 0.5, 2.2, (x, y, nx, ny) => tone(RED, 3 + sphereLight(nx, ny) * 1.5, x, y));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; front.set(Math.round(ox + 0.5 + Math.cos(a) * 4), Math.round(oy + 0.5 + Math.sin(a) * 4), METAL[5]); }
    // the boarding deck, stairs, a rope line and the operator's hut
    front.fill(ox - 34, gy - 6, ox + 30, gy, (x, y) => {
        if (y === gy - 6) return WOOD[4];
        if (y === gy) return WOOD[0];
        return tone(WOOD, ((x - ox) % 6 === 0 ? 1.8 : 3) - (y - (gy - 6)) * 0.15, x, y);
    });
    for (let i = 0; i < 3; i++) front.fill(ox - 40 + i * 2, gy - 2 * i - 1, ox - 35, gy - 2 * i, (x, y) => tone(WOOD, y === gy - 2 * i - 1 ? 4 : 2.4, x, y));
    for (const px of [ox - 30, ox - 18, ox - 6]) { front.rect(px, gy - 13, px, gy - 7, METAL[3]); front.rect(px - 1, gy - 14, px + 1, gy - 14, YEL[3]); }
    for (let x = ox - 30; x <= ox - 6; x++) front.set(x, gy - 12 + Math.round(Math.sin(((x - ox + 30) % 12) / 12 * Math.PI) * 2), RED[3]);
    const hx = ox + 18;
    front.fill(hx, gy - 22, hx + 12, gy - 7, (x, y) => tone(GLASS, x > hx + 10 ? 1.8 : 3, x, y));
    front.fill(hx + 2, gy - 19, hx + 9, gy - 14, (x, y) => (y === gy - 19 ? C("#f6efe2") : C("#2a1622")));
    for (let i = 0; i < 4; i++) front.rect(hx - 2 + i, gy - 23 - i, hx + 14 - i, gy - 23 - i, i % 2 ? C("#f6efe2") : RED[3]);
    front.rect(hx + 4, gy - 16, hx + 5, gy - 15, C("#c18a5e")); front.rect(hx + 4, gy - 17, hx + 5, gy - 17, C("#1c1410"));   // the operator
    front.rect(hx - 3, gy - 12, hx - 3, gy - 7, METAL[1]); front.rect(hx - 4, gy - 13, hx - 2, gy - 13, RED[3]);              // the lever
    return { back: back.outline(C("#2a2440")).canvas(), rims: rims.canvas(), front: front.outline().canvas(), ox, oy };
}

function makeHotAirBalloon() {
    const p = new Px(28, 44), cx = 14;
    for (let y = 0; y < 30; y++) {
        const half = y < 19 ? Math.sqrt(Math.max(0, 1 - ((y - 12) / 13) ** 2)) * 12.5 : 12.5 * Math.sqrt(1 - (7 / 13) ** 2) * (1 - (y - 19) / 13);
        for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
            const nx = (x + 0.5 - cx) / (half + 0.6), ny = (y - 12) / 14;
            const band = Math.floor((Math.asin(clamp(nx, -1, 1)) / Math.PI + 0.5) * 7);
            const ramp = band % 3 === 0 ? RED : band % 3 === 1 ? YEL : R("#7a7468", "#b8b0a0", "#e0d8c6", "#f6efe2", "#ffffff");
            p.set(x, y, tone(ramp, 2.4 + sphereLight(clamp(nx, -1, 1), clamp(ny, -1, 1)) * 1.8, x, y));
        }
    }
    for (const x of [cx - 5, cx - 2, cx + 2, cx + 5]) p.line(x, 29, cx + (x - cx) * 0.4, 36, C("#5a4a3a"));
    p.fill(cx - 3, 36, cx + 3, 40, (x, y) => tone(WOOD, (x + y) % 2 ? 2.6 : 3.4, x, y));
    p.rect(cx - 1, 34, cx, 35, C("#e0ae84")); p.rect(cx - 1, 33, cx, 33, C("#1c1410"));
    return p.outline().canvas();
}

// little pictures for speech bubbles
const GLYPH = {
    heart: ["01010", "11111", "11111", "01110", "00100"], bang: ["00100", "00100", "00100", "00000", "00100"],
    what: ["01110", "00010", "00110", "00000", "00100"], note: ["00110", "00101", "00100", "11100", "11100"],
    smile: ["00000", "01010", "00000", "10001", "01110"], star: ["00100", "01110", "11111", "01110", "01010"],
};
const GLYPH_COL = { heart: "#e2553c", bang: "#e2553c", what: "#2d6fd0", note: "#7a3ad8", smile: "#2c7c3e", star: "#d6951c" };

// My head, as a golden fairground attraction: the sprite's index buffer,
// smoothed up 3× with Scale3x, cast in gold and lit like a statue. The
// mouth is the gate.
function scale3x(src, w, h) {
    const W3 = w * 3, out = new Uint8Array(W3 * h * 3);
    const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const A = g(x - 1, y - 1), B = g(x, y - 1), Cc = g(x + 1, y - 1), D = g(x - 1, y), E = g(x, y), F = g(x + 1, y), G = g(x - 1, y + 1), H = g(x, y + 1), I = g(x + 1, y + 1);
        const e = [E, E, E, E, E, E, E, E, E];
        if (B !== H && D !== F) {
            e[0] = D === B ? D : E;
            e[1] = (D === B && E !== Cc) || (B === F && E !== A) ? B : E;
            e[2] = B === F ? F : E;
            e[3] = (D === B && E !== G) || (D === H && E !== A) ? D : E;
            e[5] = (B === F && E !== I) || (H === F && E !== Cc) ? F : E;
            e[6] = D === H ? D : E;
            e[7] = (D === H && E !== I) || (H === F && E !== G) ? H : E;
            e[8] = H === F ? F : E;
        }
        for (let k = 0; k < 9; k++) out[(y * 3 + Math.floor(k / 3)) * W3 + x * 3 + (k % 3)] = e[k];
    }
    return { d: out, w: W3, h: h * 3 };
}
const SLOT = Object.fromEntries(SLOT_ORDER.map((k, i) => [k, i + 1]));
const GOLD_LEVEL = { skin: 4, shade: 3, stub: 3.3, jaw: 2, line: 1.2, lip: 3, lipDark: 2, mouth: 1, eye: 5, pupil: 1, rivet: 6, glare: 6, chain: 3, collar: 4, shirt: 4, check: 3, checkDark: 2 };
const GATE_HW = 11, GATE_TOP = 106;
function makeHead(gx, blink) {
    const buf = drawSprite({ browL: 0, browR: 0, eyeL: blink === 1 ? 0 : 2, eyeR: blink ? 0 : 2, squint: false, gx, gy: 0, hx: 0, hy: 0, mouth: { w: 2, open: 0, smile: 1, skew: 0 }, duck: 0 });
    const CW = 48, CH = 44;
    const idx = new Uint8Array(CW * CH);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const v = buf[y * 48 + x]; idx[y * CW + x] = v === SLOT.edge ? 0 : v; }
    const S = scale3x(idx, CW, CH);
    const p = new Px(S.w + 2, S.h + 2);
    const name = (v) => SLOT_ORDER[v - 1];
    const L = (() => { const v = [-0.5, -0.62, 0.6], n = Math.hypot(...v); return v.map((c) => c / n); })();
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
        const v = S.d[y * S.w + x];
        if (!v) continue;
        const k = name(v);
        const nx = (x - 72) / 78, ny = (y - 60) / 78;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const diff = nx * L[0] + ny * L[1] + nz * L[2];
        let c;
        if (k === "hair" || k === "curl") {
            // curls: a field of little lumps, each lit on its upper left, dark in the gaps between
            let best = 1e9, bx = 0, byy = 0;
            const gx0 = Math.floor(x / 6), gy0 = Math.floor(y / 6);
            for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
                const cx = gx0 + i, cy = gy0 + j;
                const px = cx * 6 + 1 + hash(cx, cy, 2) * 4, py = cy * 6 + 1 + hash(cy, cx, 3) * 4;
                const d = (x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2;
                if (d < best) { best = d; bx = px; byy = py; }
            }
            const rad = 4.2, lnx = (x + 0.5 - bx) / rad, lny = (y + 0.5 - byy) / rad;
            const curl = Math.sqrt(best) > rad * 0.95 ? -1.3 : sphereLight(lnx, lny) * 1.8 - 0.3;
            const lv = 2.3 + curl + (diff - 0.35) * 2.4;
            c = tone(BRONZE, lv, x, y);
        } else if (k === "specs") {
            c = tone(BRONZE, 0.5 + (diff - 0.3) * 1.2, x, y);
        } else {
            const lv = (GOLD_LEVEL[k] ?? 3) + (diff - 0.38) * 2.8 - Math.max(0, y - 118) * 0.18;
            c = tone(GOLD, lv, x, y);
        }
        p.set(x + 1, y + 1, c);
    }
    // the gate: the lips frame it, the inside glows
    const gcx = 73.5 + 1, gtop = GATE_TOP, gbot = p.h - 2, rr = GATE_HW;
    const inside = (x, y, r) => { const dx = x + 0.5 - gcx, dy = y + 0.5 - (gtop + r); return y >= gtop + r - 0.5 ? Math.abs(dx) <= r : dx * dx + dy * dy <= r * r; };
    for (let y = gtop - 3; y <= gbot; y++) for (let x = Math.floor(gcx - rr - 3); x <= Math.ceil(gcx + rr + 3); x++) {
        if (inside(x, y, rr - 0) && !inside(x, y - 0, rr - 2.2)) { p.set(x, y, tone(GOLD, y < gtop + 6 ? 2 : 2.8, x, y)); continue; }
        if (inside(x, y, rr - 2.2)) {
            const t = (y - gtop) / (gbot - gtop);
            p.set(x, y, tone(GATE, 0.4 + t * t * 4.6, x, y));
        } else if (inside(x + 0, y, rr + 1.4)) p.set(x, y, tone(GOLD, 1.2, x, y));
    }
    return p.outline();
}

// ── people ──────────────────────────────────────────────────────
const SKIN = ["#f1c9a5", "#e0ae84", "#c18a5e", "#9a6640", "#6e472c"];
const HAIR = ["#1c1410", "#3a2416", "#6a4226", "#c99a4a", "#d8d4cc"];
const SHIRT = ["#e2553c", "#f3c23a", "#4aa2e0", "#6cc04a", "#b45ad8", "#f08ac0", "#ffffff", "#2d6fd0", "#f39a2c"];
const PANTS = ["#2b3f6e", "#3a2c26", "#55607a", "#1e2230", "#7a5a3a"];
const pickOf = (a, r) => a[Math.floor(r() * a.length)];

// ── the world ───────────────────────────────────────────────────
export function createWorld({ canvas, spots, onReady }) {
    const ctx = canvas.getContext("2d");
    let s = 3, VW = 480, VH = 300, oy = 0;
    let cam = 0, camT = 0, camV = 0;
    let skyCv = null;
    let time = 0, last = performance.now();
    const pointer = { x: -1, y: -1 };

    // places on the map
    const P = {
        house: { x: 150 }, lab: { x: 350 }, rocket: { x: 446 }, head: { x: 570 },
        wheel: { x: 726 }, office: { x: 840 }, site: { x: 1010 },
    };

    // build the static layers
    const islandsCv = makeIslands();
    const farCv = makeHills("far");
    const midCv = makeHills("mid");
    const clouds = [];
    {
        const r = rng(77);
        for (let i = 0; i < 9; i++) {
            const big = i < 5;
            const w = big ? 120 + r() * 70 : 46 + r() * 34, h = big ? 46 + r() * 20 : 20 + r() * 10;
            clouds.push({ cv: makeCloud(1000 + i, Math.round(w), Math.round(h)), x: r() * (WW + 400), y: (big ? -70 : 20) + r() * (big ? 120 : 90), p: big ? 0.08 : 0.16, v: big ? 1.5 + r() * 1.5 : 3 + r() * 3 });
        }
    }

    const house = makeHouse(), lab = makeLab(), office = makeOffice(), rocket = makeRocket(), site = makeSite();
    const place = (o, at) => { o.x0 = Math.round(at - o.ax); o.y0 = GY - o.px.h + 1; return o; };
    place(house, P.house.x); place(lab, P.lab.x); place(office, P.office.x); place(rocket, P.rocket.x); place(site, P.site.x);

    const ground = new Px(WW, SH);
    // the grass the buildings stand on, a cobbled path, and lush grass in front
    for (let x = 0; x < WW; x++) {
        for (let y = GY - 12; y < SH; y++) {
            const py0 = GY + 3, py1 = GY + 16;
            let c = 0;
            if (y < py0) {
                if (y < GY - 1) continue;
                c = tone(GRASS, 4 - (y - GY + 1) * 0.5 + (hash(x, 3) - 0.5), x, y);
            } else if (y <= py1) {
                const ly = y - py0, row = Math.floor(ly / 3), off = row * 4 + (row % 2) * 2;
                const lx = (x + off) % 7, ry = ly % 3;
                if (y === py0) c = DIRT[1];
                else if (lx === 6 || ry === 2) c = DIRT[1];
                else c = tone(DIRT, 3.1 + (ry === 0 ? 0.7 : 0) - (lx === 5 ? 0.9 : 0) + (hash(Math.floor((x + off) / 7), row) - 0.5) * 0.9, x, y);
            } else {
                const d = (y - py1) / (SH - py1);
                let v = 4.1 - d * 2.2 + (hash(x, Math.floor((y + hash(x, 9) * 5) / 4)) - 0.5) * 1.5;
                if (y === py1 + 1) v -= 1.2;
                c = tone(GRASS, v, x, y);
            }
            ground.set(x, y, c);
        }
        // tufts: above the back strip, and poking up into the path from the front
        const t1 = Math.floor(hash(x, 11) * 4);
        for (let i = 1; i <= t1; i++) if (hash(x, 12) < 0.55) ground.set(x, GY - 1 - i, GRASS[3 + (i === t1 ? 2 : 1) - 1]);
        const t2 = Math.floor(hash(x, 13) * 4);
        for (let i = 0; i < t2; i++) if (hash(x, 14) < 0.5) ground.set(x, GY + 16 - i, GRASS[4]);
    }
    // a stone curb along both edges of the path, with weeds in the cracks
    for (let x = 0; x < WW; x++) {
        const gap = x % 9 === 0;
        ground.set(x, GY + 3, gap ? STONE[1] : tone(STONE, 3.6, x, GY + 3)); ground.set(x, GY + 4, gap ? STONE[1] : STONE[2]);
        ground.set(x, GY + 16, gap ? STONE[1] : tone(STONE, 3.2, x, GY + 16));
        if (hash(x, 61) < 0.06) { ground.set(x, GY + 6 + Math.floor(hash(x, 62) * 8), GRASS[3]); }
        if (hash(x, 63) < 0.02) { const y = GY + 7 + Math.floor(hash(x, 64) * 6); ground.set(x, y, GRASS[4]); ground.set(x + 1, y - 1, C("#f3e06a")); }
    }
    // flowers in the front grass
    for (let i = 0; i < 160; i++) {
        const x = Math.floor(hash(i, 1) * WW), y = GY + 22 + Math.floor(hash(i, 2) * (SH - GY - 30));
        const col = [C("#fff6e8"), C("#f6d24a"), C("#f07a8a"), C("#a8c8ff")][i % 4];
        ground.set(x, y - 1, col); ground.set(x - 1, y, col); ground.set(x + 1, y, col); ground.set(x, y + 1, col); ground.set(x, y, C("#f3a020"));
    }
    // trees behind the buildings
    for (const [x, size, seed] of [[30, 58, 1], [70, 46, 2], [244, 52, 3], [268, 38, 4], [930, 60, 5], [1090, 54, 6], [506, 30, 7]]) {
        if (!size) continue;
        const tp = new Px(80, 80);
        drawTree(tp, 40, 79, size, seed);
        tp.outline();
        ground.blit(tp, x - 40, GY - 80);
    }
    // sand round the head, and a red carpet out of the gate
    for (let y = GY - 6; y <= GY + 3; y++) for (let x = P.head.x - 80; x <= P.head.x + 80; x++) {
        const dx = (x - P.head.x) / 80, dy = (y - GY) / 6;
        if (dx * dx + (y < GY ? dy * dy : 0) > 1) continue;
        ground.set(x, y, tone(DIRT, 4.2 - dy * 0.6 + (hash(x, y, 5) - 0.5) * 0.8, x, y));
    }
    for (let y = GY - 1; y <= GY + 16; y++) {
        const hw = 7 + (y - GY) * 0.45;
        for (let x = Math.round(P.head.x + 0.5 - hw); x <= Math.round(P.head.x + 0.5 + hw); x++) {
            const edge = Math.abs(x - (P.head.x + 0.5)) > hw - 1.2;
            ground.set(x, y, edge ? YEL[3] : tone(RED, 2.4 + (y % 3 === 0 ? 0.4 : 0), x, y));
        }
    }
    for (const o of [house, lab, office, rocket, site]) ground.blit(o.px, o.x0, o.y0);
    const front = new Px(WW, SH);
    decorate(ground, front);
    const groundCv = ground.canvas();
    const frontCv = front.canvas();

    // foreground: dark leaves and tall grass, moving faster than the ground
    const FW = Math.ceil(WW * 1.25) + 10;
    const fg = new Px(FW, SH);
    {
        const r = rng(303);
        let x = -20;
        while (x < FW) {
            const cluster = new Px(90, 50);
            const n = 4 + Math.floor(r() * 4);
            for (let i = 0; i < n; i++) cluster.disc(20 + r() * 50, 30 + r() * 18, 7 + r() * 11, (px, py, nx, ny) => tone(DARKLEAF, 2 + sphereLight(nx, ny) * 1.6 + (hash(px, py, 3) - 0.5) * 0.8, px, py));
            for (let i = 0; i < 26; i++) { const bx = 10 + r() * 70, len = 6 + r() * 18; cluster.line(bx, 49, bx + (r() - 0.5) * 8, 49 - len, DARKLEAF[1 + Math.floor(r() * 3)]); }
            if (r() < 0.5) { const fx = 20 + r() * 50, fy = 26 + r() * 10; cluster.disc(fx, fy, 2, C("#e9d2c0")); cluster.set(fx, fy, C("#f3a020")); }
            fg.blit(cluster, Math.round(x), SH - 50 + Math.round(r() * 14));
            x += 140 + r() * 200;
        }
    }
    const fgCv = fg.canvas();

    // the head: a few cached frames (looking left/ahead/right, blinking)
    const headFrames = {};
    const headAt = (gx, blink) => headFrames[gx + "," + blink] || (headFrames[gx + "," + blink] = makeHead(gx, blink));
    const head0 = headAt(0, 0);
    const head = { px: head0, x0: Math.round(P.head.x - 74.5), y0: GY - head0.h + 1, gx: 0, blink: 0, nextBlink: 2 };
    head.cv = {};
    const headCanvas = (gx, b) => head.cv[gx + "," + b] || (head.cv[gx + "," + b] = headAt(gx, b).canvas());

    // hover outlines
    const halos = {};
    const SPOT = {
        house: { o: house, href: "/contact/" },
        lab: { o: lab, href: "/research/" },
        head: { o: head, href: "/about/" },
        office: { o: office, href: "/works/" },
        wheel: { o: { x0: P.wheel.x - WR - 8, y0: WCY - WR - 12, px: { w: (WR + 8) * 2, h: GY - (WCY - WR - 12) } } },
    };
    for (const k in SPOT) if (SPOT[k].o.px.halo) halos[k] = SPOT[k].o.px.halo(WHITE).canvas();
    let hovered = null;

    // ── who's about ──
    const people = [];
    const parts = [];
    const r = rng(9001);
    const bandY = () => GY + 5 + r() * 10;
    function spawn(o) {
        const spr = o.dog ? SP.makeDog() : SP.makePerson(o.spec);
        const pp = { dir: 1, dist: 0, wait: 0, t: r() * 10, ...o, spr };
        pp.y = pp.y ?? bandY(); pp.ty = pp.y; pp.tx = pp.tx ?? pp.x;
        people.push(pp);
        return pp;
    }
    const randomSpec = (kid) => ({ kid, skin: pickOf(SKIN, r), hair: pickOf(HAIR, r), shirt: pickOf(SHIRT, r), pants: pickOf(PANTS, r), style: Math.floor(r() * 3) });

    // workers
    spawn({ role: "work", x: P.house.x + 46, y: GY + 4, dir: 1, spec: { ...randomSpec(), act: "water", hat: "#d8b060" }, rate: 1.4, water: true });
    spawn({ role: "work", x: site.x0 + 30, y: site.y0 + site.planks[0], z: -1, dir: 1, spec: { ...randomSpec(), act: "hammer", hat: "#f3c23a" }, rate: 3.2, sparks: true });
    spawn({ role: "work", x: site.x0 + 78, y: site.y0 + site.planks[1], z: -1, dir: -1, spec: { ...randomSpec(), act: "hammer", hat: "#f3c23a" }, rate: 2.6, sparks: true });
    spawn({ role: "stroll", x: P.site.x - 40, min: P.site.x - 60, max: P.site.x + 30, speed: 10, spec: { ...randomSpec(), hat: "#f3c23a", carry: "#b25941" } });
    spawn({ role: "work", x: P.office.x - 46, y: GY + 6, dir: -1, spec: { ...randomSpec(), act: "sweep", hat: "#4a5a8a" }, rate: 2.2 });
    spawn({ role: "stroll", x: P.lab.x - 30, min: P.lab.x - 60, max: P.lab.x + 60, speed: 9, spec: { ...randomSpec(), coat: true } });
    spawn({ role: "stroll", x: P.lab.x + 40, min: P.lab.x - 40, max: P.rocket.x + 10, speed: 8, spec: { ...randomSpec(), coat: true } });
    spawn({ role: "work", x: P.head.x + 92, y: GY + 8, dir: -1, spec: { ...randomSpec(), shirt: "#e2553c", hat: "#f6efe2" }, rate: 0, vendor: true });
    for (let i = 0; i < 4; i++) spawn({ role: "stroll", x: 120 + r() * 880, min: 60, max: 1060, speed: 11 + r() * 6, spec: { ...randomSpec(), brief: r() < 0.5 } });
    spawn({ role: "stroll", x: P.house.x - 30, min: P.house.x - 80, max: P.house.x + 80, speed: 26, dog: true, hop: true });
    const vendor = people.find((p) => p.vendor);

    // more people: a queue for tickets, a kid with a kite, someone who keeps visiting the toilet
    for (const [i, x] of [535, 545, 555].entries()) spawn({ role: "work", x, y: GY + 5 + (i % 2), dir: -1, spec: randomSpec(), rate: 0 });
    const kiteKid = spawn({ role: "work", x: D.kite.x, y: D.kite.y, dir: 1, spec: randomSpec(true), rate: 0 });
    const pottyGuy = spawn({ role: "potty", x: 1040, y: GY + 6, speed: 12, spec: { ...randomSpec(), hat: "#f3c23a" }, state: "walk", tx: 1030, wait: 0 });
    let pottyDoor = 0;

    // critters
    const ducks = [{ x: D.pond.x - 12, dir: 1, v: 4, y: 0, kind: "duck" }, { x: D.pond.x + 8, dir: -1, v: 3, y: 1, kind: "hen" }, { x: D.pond.x + 14, dir: -1, v: 3, y: 1, kind: "duckling", follow: 1 }, { x: D.pond.x + 18, dir: -1, v: 3, y: 1, kind: "duckling", follow: 1 }];
    const pigeons = [24, 34, 60, 78].map((lx, i) => ({ lx, ph: i * 1.7, fly: null }));
    const SPR = {
        cat: SP.makeCat(), pigeon: SP.makePigeon(), cctv: SP.makeCCTV(), bench: SP.makeBench(), basket: SP.makeBasket(),
        duck: SP.makeDuck("mallard"), hen: SP.makeDuck("hen"), duckling: SP.makeDuckling(), laundry: SP.makeLaundry(),
        reader: ["read", "read", "read", "flip", "read", "peek"].map((pose) => SP.makeSitter({ skin: "#9a6640", hair: "#1c1410", shirt: "#f3c23a", pants: "#3a2c26", style: 2 }, pose)),
        picnicA: [SP.makeSitter({ skin: "#e0ae84", hair: "#6a4226", shirt: "#4aa2e0", pants: "#2b3f6e", style: 1 }, "rest"), SP.makeSitter({ skin: "#e0ae84", hair: "#6a4226", shirt: "#4aa2e0", pants: "#2b3f6e", style: 1 }, "eat")],
        picnicB: SP.makeSitter({ skin: "#c18a5e", hair: "#1c1410", shirt: "#6cc04a", pants: "#55607a" }, "rest"),
        washer: SP.makePerson({ skin: "#c18a5e", hair: "#1c1410", shirt: "#2d6fd0", pants: "#1e2230", hat: "#f3c23a", act: "squeegee" }),
        balloons: {},
    };
    const balloonOf = (c) => SPR.balloons[c] || (SPR.balloons[c] = SP.makeBalloon(c));
    // the bench and the basket are fixed: paint them onto the ground once
    {
        const gx = groundCv.getContext("2d");
        gx.drawImage(SPR.bench.cv, D.benches[0] - SPR.bench.ax, GY - SPR.bench.ay);
        gx.drawImage(SPR.basket, D.picnic.x + 6, D.picnic.y - 13);
    }
    const cat = { x: house.x0 + 52, y: house.y0 + 13 };
    const bubbles = [];
    let confettiT = 4, emoteT = 2, planeT = 6, plane = null, winkT = 9;
    const balloonCv = makeHotAirBalloon();
    // the banner plane: nose to the left, a red body with a white stripe, a glass canopy
    const planeCv = SP.art([
        "............rr",
        "...........rRr",
        "...BBb.....RRr",
        ".RRRRRRRRRRRRr",
        "RWWWWWWWWWWWWr",
        ".rRRRRRRRRRRr.",
        "....kkkkk.....",
        ".....kkk......",
    ], { R: "#e2553c", r: "#a8322a", W: "#f6efe2", B: "#a6d0f0", b: "#6fa6d8", k: "#7a1e26" }, { pad: 4 }).cv;
    // string lights over the hair, found from the head's outline
    const bulbs = [];
    for (let x = 8; x < head0.w - 8; x += 6) for (let y = 0; y < 90; y++) if (head0.get(x, y)) { bulbs.push([x, y + 3]); break; }
    // the plane's banner
    const BANNER = "SAY HI - CONTACT IS THE HOUSE";
    const bannerPx = (() => { const w = textW(BANNER) + 8, p = new Px(w, 9); p.rect(0, 0, w - 1, 8, WHITE); text(p, BANNER, 4, 2, C("#b8322e")); return p; })();

    function say(follow, content, t = 1.8) {
        const old = bubbles.find((b) => b.follow === follow); if (old) old.t = 0;
        bubbles.push({ follow, content, t, max: t });
    }


    // kids run out of my mouth
    const kids = [];
    const gateX = P.head.x + 1;
    function spawnKid(atRandom) {
        const k = spawn({ role: "kid", x: gateX, y: GY - 1, speed: 26 + r() * 18, spec: randomSpec(true), state: "out", balloon: r() < 0.3 ? pickOf(["#e2553c", "#f3c23a", "#4aa2e0", "#b45ad8", "#f08ac0"], r) : null });
        k.tx = gateX + (r() < 0.5 ? -1 : 1) * (30 + r() * 260); k.ty = bandY();
        if (atRandom) { k.x = k.tx; k.y = k.ty; k.state = "run"; }
        kids.push(k);
    }
    for (let i = 0; i < 6; i++) spawnKid(true);
    let kidTimer = 1;

    // office windows: who's in, who's working late
    const wins = office.wins.map((w) => ({ ...w, in: r() < 0.55, hue: pickOf(["#8fe0ff", "#b6ffb0", "#ffd38a", "#e0b0ff"], r), skin: pickOf(SKIN, r), hair: pickOf(HAIR, r), shirt: pickOf(SHIRT, r), t: r() * 10 }));

    const birds = [];
    let birdTimer = 3;

    // ── input: drag, wheel, keys ──
    let drag = null, moved = false;
    const offMap = (e) => e.target && e.target.closest && e.target.closest(".panel");
    function onDown(e) {
        if (e.button !== 0 || offMap(e)) return;
        drag = { x: e.clientX, cam: camT, t: performance.now(), lastX: e.clientX, lastT: performance.now(), v: 0 };
        moved = false;
    }
    function onMove(e) {
        pointer.x = e.clientX; pointer.y = e.clientY;
        if (!drag) return;
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 5) { moved = true; document.body.classList.add("dragging"); }
        if (moved) {
            camT = clamp(drag.cam - dx / s, minCam(), maxCam());
            cam = camT;
            const now = performance.now();
            drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT);
            drag.lastX = e.clientX; drag.lastT = now;
            hideHint();
        }
    }
    function onUp() {
        if (drag && moved) camV = -drag.v * 1000 / s * 0.9;
        drag = null;
        document.body.classList.remove("dragging");
        setTimeout(() => { moved = false; }, 0);
    }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    window.addEventListener("wheel", (e) => {
        if (offMap(e)) return;
        e.preventDefault();
        camT = clamp(camT + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / s, minCam(), maxCam());
        hideHint();
    }, { passive: false });
    window.addEventListener("keydown", (e) => {
        if (offMap(e)) return;
        if (e.key === "ArrowLeft") camT = clamp(camT - 60, minCam(), maxCam());
        else if (e.key === "ArrowRight") camT = clamp(camT + 60, minCam(), maxCam());
        else return;
        hideHint();
    });
    let hintHidden = false;
    function hideHint() { if (!hintHidden) { hintHidden = true; document.body.classList.add("explored"); } }

    // with the reading panel open, the camera may slide left so the house can sit beside it
    let inset = 0;
    const minCam = () => (VW >= WW ? (WW - VW) / 2 : 0) - inset / s;
    const maxCam = () => (VW >= WW ? (WW - VW) / 2 : WW - VW);
    const spotX = (key) => (key === "head" ? P.head.x : SPOT[key].o.x0 + SPOT[key].o.px.w / 2);
    function lookAt(key, leftPx = 0) { camT = clamp(spotX(key) - (VW + leftPx / s) / 2, minCam(), maxCam()); if (reduced) { cam = camT; draw(); } }
    function setInset(px) { inset = px; camT = clamp(camT, minCam(), maxCam()); if (reduced) { cam = camT; draw(); } }

    // spots: links over each place
    for (const a of spots) {
        const k = a.dataset.place;
        a.addEventListener("pointerenter", () => { hovered = k; });
        a.addEventListener("pointerleave", () => { if (hovered === k) hovered = null; });
        a.addEventListener("focus", () => { hovered = k; lookAt(k); });
        a.addEventListener("blur", () => { if (hovered === k) hovered = null; });
        a.setAttribute("draggable", "false");
        if (k === "wheel") a.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); if (!moved) startRide(); });
    }

    function layout() {
        const vw = Math.max(window.innerWidth, document.documentElement.clientWidth), vh = Math.max(window.innerHeight, document.documentElement.clientHeight);
        s = Math.max(2, Math.floor(vh / 285));
        while (s > 2 && vw / s < 210) s--;
        VW = Math.ceil(vw / s); VH = Math.ceil(vh / s);
        oy = VH - SH;
        canvas.width = VW; canvas.height = VH;
        canvas.style.width = VW * s + "px"; canvas.style.height = VH * s + "px";
        ctx.imageSmoothingEnabled = false;
        skyCv = makeSky(VW, VH, oy);
        if (!layout.done) {
            const start = { "#contact": "house", "#research": "lab", "#about": "head", "#works": "office" }[location.hash];
            cam = camT = clamp((start ? spotX(start) : P.head.x) - VW / 2, minCam(), maxCam());
            layout.done = true;
        }
        cam = camT = clamp(camT, minCam(), maxCam());
        placeSpots();
        if (reduced) draw();
    }

    function placeSpots() {
        const ci = Math.round(cam);
        for (const a of spots) {
            const o = SPOT[a.dataset.place].o;
            const x = (o.x0 - ci) * s, y = (o.y0 + oy) * s;
            a.style.transform = `translate(${x}px, ${y}px)`;
            a.style.width = o.px.w * s + "px";
            a.style.height = o.px.h * s + "px";
        }
    }

    // ── per-frame helpers ──
    const fill = (c) => { ctx.fillStyle = c; };
    const dot = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const box = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    function pline(x0, y0, x1, y1, c) {
        ctx.fillStyle = c;
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1);
    }

    function glyphs(str, x, y, col) {
        fill(col);
        for (const ch of str) { const g = FONT[ch] || FONT[" "]; for (let i = 0; i < 15; i++) if (g[i] === "1") ctx.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1); x += 4; }
    }
    function drawDetails(X, Y) {
        // laundry on a line, swinging in the breeze
        {
            const [a, b] = D.laundry, top = GY - 30, sag = (t) => top + Math.sin(Math.PI * t) * 3;
            for (let i = 0; i <= 40; i++) { const t = i / 40; dot(X(a + (b - a) * t), Y(sag(t)), "#f6efe2"); dot(X(a + (b - a) * t), Y(sag(t)) + 1, "#8a7a6a"); }
            [["shirt", 0.2], ["jeans", 0.42], ["dress", 0.64], ["socks", 0.85]].forEach(([k, t], i) => {
                const it = SPR.laundry[k], fr = it.frames[Math.floor(time * 1.6 + i * 0.7) % 2];
                ctx.drawImage(fr, X(a + (b - a) * t) - it.pad - Math.floor(it.w / 2), Y(sag(t)) - it.pad + 1);
            });
        }
        // the cat on the roof, tail going
        {
            const c = SPR.cat, blink = Math.floor(time * 0.7) % 9 === 0;
            const img = blink ? c.blink : c.frames[[0, 1, 2, 1][Math.floor(time * 2.5) % 4]];
            ctx.drawImage(img, X(cat.x) - c.ax, Y(cat.y) - c.ay);
        }
        // the CCTV camera follows whoever is closest
        {
            let near = null, nd = 90;
            for (const p of people) { if (p.hidden) continue; const d = Math.abs(p.x - D.cctv); if (d < nd) { nd = d; near = p; } }
            const dir = near ? Math.sign(near.x - D.cctv) || 1 : (Math.sin(time * 0.5) > 0 ? 1 : -1);
            const x = X(D.cctv), y = Y(GY - 31), cam = SPR.cctv;
            ctx.drawImage(dir > 0 ? cam.R : cam.L, x - cam.ax + (dir > 0 ? 2 : -2), y - cam.ay);
            if (Math.floor(time * 2) % 2) dot(dir > 0 ? x - 1 : x + 1, y - 3, "#ff3a2a");
            if (near) for (let i = 1; i <= 5; i++) if ((i + Math.floor(time * 8)) % 2) dot(x + dir * (8 + i * 3), y + i, "#ff3a2a88");
        }
        // the face scanner by the lab door
        {
            const sx = X(lab.x0 + lab.scan.x), sy = Y(lab.y0 + lab.scan.y);
            const busy = people.some((p) => !p.hidden && Math.abs(p.x - (lab.x0 + 78)) < 14);
            if (busy) { box(sx, sy, 4, 7, "#1d6a3a"); box(sx, sy + (Math.floor(time * 10) % 7), 4, 1, "#9effb0"); }
            else dot(sx + 1, sy + 3, Math.floor(time * 1.5) % 2 ? "#ff3a2a" : "#3a1010");
        }
        // the ticket clerk
        { const x = X(D.booth + 13), y = Y(GY - 15) + (Math.floor(time * 1.3) % 3 === 0 ? 1 : 0); box(x - 1, y, 5, 1, "#1c1410"); box(x - 1, y + 1, 5, 3, "#c18a5e"); dot(x + 2, y + 2, "#1a1210"); box(x - 2, y + 4, 7, 2, "#e2553c"); box(x - 1, y - 1, 3, 1, "#1c1410"); }
        D.boothBulbs.forEach(([bx, by], i) => dot(X(bx), Y(by), (i + Math.floor(time * 5)) % 3 ? "#fff4c2" : "#b8722a"));
        // string lights over my hair
        {
            const cols = ["#fff4c2", "#ff6a5a", "#7fe0ff", "#9effb0"];
            for (let i = 0; i < bulbs.length; i++) {
                const [bx, by] = bulbs[i], x = X(head.x0 + bx), y = Y(head.y0 + by);
                if (i) { const [px2, py2] = bulbs[i - 1]; pline(X(head.x0 + px2), Y(head.y0 + py2) + 1, x, y + 1, "#3a2a20"); }
                const on = (i + Math.floor(time * 3)) % 4 !== 0;
                dot(x, y, on ? cols[i % 4] : "#5a4a3a");
            }
        }
        // the window washer goes up and down the office
        {
            const t = 0.5 - 0.5 * Math.cos(time * 0.11), ly = 40 + t * (office.signY - 52);
            const x0 = X(office.x0 + 16), y = Y(office.y0 + ly), rt = Y(office.y0 + office.top - 4);
            pline(x0 + 1, rt, x0 + 1, y - 6, "#2c3046"); pline(x0 + 30, rt, x0 + 30, y - 6, "#2c3046");
            box(x0 - 1, y - 1, 34, 4, "#1a1220"); box(x0, y, 32, 2, "#7a84a2"); box(x0, y, 32, 1, "#aeb7ce");
            box(x0, y - 6, 1, 6, "#aeb7ce"); box(x0 + 31, y - 6, 1, 6, "#aeb7ce");
            box(x0 + 2, y - 4, 5, 4, "#1a1220"); box(x0 + 3, y - 3, 3, 3, "#4aa2e0"); box(x0 + 3, y - 3, 3, 1, "#bfe8ff");   // a bucket
            const wx = x0 + 16 + Math.round(Math.sin(time * 0.6) * 7), wf = 3 + (Math.floor(time * 3) % 2);
            ctx.drawImage(SPR.washer.R[wf], wx - SPR.washer.ax, y - 1 - SPR.washer.ay);
            box(x0, y - 6, 32, 1, "#aeb7ce");   // the rail in front of his legs
            if (Math.floor(time * 6) % 5 === 0) dot(wx + 8, y - 12, "#bfe8ff");
        }
        // a neon sign with a dodgy N
        {
            const x = X(office.x0 + 16), y = Y(office.y0 + office.signY + 19);
            box(x - 2, y - 2, 21, 9, "#1b1424");
            const dead = Math.floor(time * 9) % 23 < 2, off = Math.floor(time * 3) % 37 === 0;
            if (!off) { glyphs("OPE", x, y, "#ff5fa8"); if (!dead) glyphs("N", x + 12, y, "#ff5fa8"); }
        }
        // pigeons on the cornice
        for (const g of pigeons) {
            let x = office.x0 + g.lx, y = office.y0 + office.top - 5, flying = false;
            if (g.fly && time > g.fly.t0) {
                const tt = time - g.fly.t0, k = tt < 3 ? tt : Math.max(0, 6 - tt);
                x += k * 16 * g.fly.dir; y -= k * 22; flying = tt < 6;
            }
            const pg = SPR.pigeon, sx = X(x), sy = Y(y);
            const img = flying ? pg.fly[Math.floor(time * 10) % 2] : (Math.floor(time * 1.5 + g.ph) % 4 === 0 ? pg.peck : pg.stand);
            ctx.drawImage(img, sx - pg.ax, sy - pg.ay);
        }
        // the toilet door
        if (pottyDoor > 0) { const x = X(D.potty + 3), y = Y(GY - 19); box(x, y, 7, 18, "#140f1c"); box(x - 3, y, 3, 18, "#4075ae"); }
        // ducks: a mallard, a hen and her two ducklings
        for (const d of ducks) {
            const sp = d.kind === "duck" ? SPR.duck : d.kind === "hen" ? SPR.hen : SPR.duckling;
            const fr = (d.kind !== "duckling" && Math.floor(time * 0.5 + d.x * 0.1) % 7 === 0) ? 1 : 0;
            const x = X(d.x), y = Y(D.pond.y + d.y) + (Math.floor(time * 2 + d.x) % 2);
            ctx.drawImage((d.dir > 0 ? sp.R : sp.L)[fr] || (d.dir > 0 ? sp.R : sp.L)[0], x - sp.ax, y - sp.ay);
            if (Math.floor(time * 3 + d.x) % 2) { dot(x - d.dir * 6, y + 1, "#e2f3ff"); dot(x - d.dir * 8, y + 2, "#a6d0f0"); }
        }
        // a picnic, and someone reading the paper on the bench
        {
            const pa = SPR.picnicA[Math.floor(time * 0.6) % 3 === 0 ? 1 : 0];
            ctx.drawImage(pa, X(D.picnic.x - 14) - 4, Y(D.picnic.y + 1) - 4 - 16);
            ctx.drawImage(SPR.picnicB, X(D.picnic.x - 2) - 4, Y(D.picnic.y + 1) - 4 - 16);
            const rd = SPR.reader[Math.floor(time * 0.8) % SPR.reader.length];
            ctx.drawImage(rd, X(D.benches[0] - 6) - 4, Y(GY - SPR.bench.ay + 4 + SPR.bench.seatY + 2) - 4 - 14);
        }
        // a kite, way up
        {
            const hx = X(D.kite.x + 2), hy = Y(D.kite.y - 6);
            const kx = X(D.kite.x - 22 + Math.sin(time * 0.6) * 10 + Math.sin(time * 1.7) * 3), ky = Y(GY - 158 + Math.cos(time * 0.8) * 8);
            const mx = (hx + kx) / 2 + 14, my = (hy + ky) / 2 + 30;
            for (let i = 0; i < 40; i++) { const t = i / 40, x = (1 - t) * (1 - t) * hx + 2 * (1 - t) * t * mx + t * t * kx, y = (1 - t) * (1 - t) * hy + 2 * (1 - t) * t * my + t * t * ky; dot(x, y, "#f6efe2aa"); }
            for (let dy = -6; dy <= 6; dy++) for (let dx = -5; dx <= 5; dx++) {
                if (Math.abs(dx) / 5 + Math.abs(dy) / 6 > 1) continue;
                const c = dx === 0 || dy === 0 ? "#3a2a20" : dx < 0 && dy < 0 ? "#e2553c" : dx > 0 && dy < 0 ? "#f3c23a" : dx < 0 ? "#2d6fd0" : "#f6efe2";
                dot(kx + dx, ky + dy, c);
            }
            for (let i = 1; i <= 9; i++) { const tx = kx + Math.round(Math.sin(time * 4 - i * 0.7) * 2), ty = ky + 6 + i * 2; dot(tx, ty, "#3a2a20"); if (i % 3 === 0) { dot(tx - 1, ty, "#e2553c"); dot(tx + 1, ty, "#e2553c"); } }
        }
    }

    // ── the Ferris wheel, and the game on it ──
    const WP = makeWheelParts();
    const CAB_COLS = ["#e2553c", "#4aa2e0", "#6cc04a", "#b45ad8", "#f08ac0", "#2d6fd0", "#f39a2c", "#3aa89a", "#e2553c", "#4aa2e0"];
    const cabins = CAB_COLS.map((c, i) => {
        const riders = [];
        if (i % 3 !== 2) riders.push({ hair: pickOf(HAIR, r), skin: pickOf(SKIN, r) });
        if (i % 2 === 0) riders.push({ hair: pickOf(HAIR, r), skin: pickOf(SKIN, r) });
        return { normal: SP.makeCabin(c, riders), you: SP.makeCabin("#f3c23a", [], true) };
    });
    let wa = 0, wv = 0.22;            // wheel angle and speed (radians, radians a second)
    const N_CAB = cabins.length;
    const cabAngle = (i) => wa + i * Math.PI * 2 / N_CAB;
    let ride = null;                  // { phase, you, round, score, streak, msg, msgT, v }
    let best = +(localStorage.getItem("wheel-best") || 0);

    const hud = document.createElement("div");
    hud.className = "ride-hud hidden";
    hud.innerHTML = `<div class="ride-title">RIDE THE WHEEL</div>
        <div class="ride-tip">Stop your <b>gold cabin</b> at the very top. Press <kbd>Space</kbd> or click to brake.</div>
        <div class="ride-stats"><span>ROUND <b data-k="round">1</b></span><span>SCORE <b data-k="score">0</b></span><span>BEST <b data-k="best">0</b></span></div>
        <div class="ride-btns"><button type="button" data-brake>BRAKE</button><button type="button" data-off>GET OFF</button></div>`;
    document.body.appendChild(hud);
    const msg = document.createElement("div"); msg.className = "ride-msg"; document.body.appendChild(msg);
    const hudSet = (k, v) => { const el = hud.querySelector(`[data-k="${k}"]`); if (el) el.textContent = v; };
    hud.querySelector("[data-brake]").addEventListener("click", (e) => { e.stopPropagation(); brake(); });
    hud.querySelector("[data-off]").addEventListener("click", (e) => { e.stopPropagation(); endRide(); });

    function startRide() {
        if (ride) return;
        // you get the cabin that is nearest the bottom, where people board
        let you = 0, bd = 9;
        for (let i = 0; i < N_CAB; i++) { const a = ((cabAngle(i) - Math.PI / 2) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; if (Math.abs(a) < bd) { bd = Math.abs(a); you = i; } }
        ride = { phase: "board", you, round: 1, score: 0, streak: 0, t: 0, v: wv };
        hud.classList.remove("hidden"); document.body.classList.add("riding");
        hudSet("round", 1); hudSet("score", 0); hudSet("best", best);
        lookAt("wheel", document.body.classList.contains("panel-open") ? (document.getElementById("panel")?.getBoundingClientRect().width || 0) : 0);
        flash("HOP ON!");
    }
    function endRide() {
        if (!ride) return;
        ride = null; wv = 0.22;
        hud.classList.add("hidden"); document.body.classList.remove("riding"); msg.classList.remove("on");
    }
    function brake() { if (ride && ride.phase === "spin" && ride.t > 0.6) { ride.phase = "brake"; } }
    function flash(text, cls = "") { msg.textContent = text; msg.className = "ride-msg on " + cls; clearTimeout(flash.t); flash.t = setTimeout(() => msg.classList.remove("on"), 1400); }
    function fireworks(n) {
        const cols = ["#ff5fa8", "#f3c23a", "#7fe0ff", "#9effb0", "#ffffff", "#ff6a3a"];
        for (let k = 0; k < n; k++) {
            const cx = P.wheel.x + (r() - 0.5) * 160, cy = WCY - 70 - r() * 60, c = pickOf(cols, r);
            for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, sp = 26 + r() * 10; parts.push({ k: "fw", x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.2 + r() * 0.4, c, delay: k * 0.35 }); }
        }
    }
    function updateRide(dt) {
        if (!ride) { wv += (0.22 - wv) * Math.min(1, dt); wa += wv * dt; return; }
        ride.t += dt;
        const target = 1.5 + ride.round * 0.45;   // it spins faster every round
        if (ride.phase === "board") { wv += (0 - wv) * Math.min(1, dt * 3); if (ride.t > 1.2) { ride.phase = "spin"; ride.t = 0; } }
        else if (ride.phase === "spin") wv += (target - wv) * Math.min(1, dt * 1.2);
        else if (ride.phase === "brake") {
            wv = Math.max(0, wv - 1.15 * dt);
            if (wv === 0) {
                // where did your cabin stop? the top is straight up
                const a = ((cabAngle(ride.you) + Math.PI / 2) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
                const deg = Math.abs(a) * 180 / Math.PI;
                let pts = 0, text = "MISSED", cls = "miss";
                if (deg < 4) { pts = 100; text = "PERFECT!"; cls = "perfect"; fireworks(4); }
                else if (deg < 12) { pts = 50; text = "GREAT"; cls = "great"; fireworks(1); }
                else if (deg < 25) { pts = 20; text = "CLOSE"; cls = "ok"; }
                ride.streak = pts >= 50 ? ride.streak + 1 : 0;
                if (ride.streak >= 3) pts += 50;
                ride.score += pts;
                flash(text + (pts ? `  +${pts}` : "") + (ride.streak >= 3 ? "  STREAK!" : ""), cls);
                if (ride.score > best) { best = ride.score; localStorage.setItem("wheel-best", best); }
                hudSet("score", ride.score); hudSet("best", best);
                ride.phase = "result"; ride.t = 0;
            }
        } else if (ride.phase === "result") {
            if (ride.t > 1.8) { ride.round++; hudSet("round", ride.round); ride.phase = "spin"; ride.t = 0; }
        }
        wa += wv * dt;
    }
    window.addEventListener("keydown", (e) => {
        if (!ride) return;
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); brake(); }
        else if (e.key === "Escape") endRide();
    });

    function drawWheel(X, Y) {
        const cx = X(P.wheel.x), cy = Y(WCY);
        ctx.drawImage(WP.back, cx - WP.ox, cy - WP.oy);
        // spokes in pairs, and the zigzag between the rims, turning with the wheel
        for (let i = 0; i < 16; i++) {
            const a = wa + i * Math.PI / 8;
            for (const d of [-0.025, 0.025]) pline(cx + Math.cos(a + d) * 5, cy + Math.sin(a + d) * 5, cx + Math.cos(a + d) * (WR - 4), cy + Math.sin(a + d) * (WR - 4), i % 2 ? "#aeb7ce" : "#e0e6f0");
        }
        ctx.drawImage(WP.rims, cx - WP.ox, cy - WP.oy);
        for (let i = 0; i < 48; i++) {
            const a0 = wa + i * Math.PI / 24, a1 = wa + (i + 0.5) * Math.PI / 24;
            pline(cx + Math.cos(a0) * (WR - 1), cy + Math.sin(a0) * (WR - 1), cx + Math.cos(a1) * (WR - 3), cy + Math.sin(a1) * (WR - 3), "#7a84a2");
        }
        ctx.drawImage(WP.front, cx - WP.ox, cy - WP.oy);
        // lights round the rim: a slow chase, or everything at once on a perfect stop
        const party = ride && ride.phase === "result" && msg.classList.contains("perfect");
        const BUL = ["#fff4c2", "#ff6a5a", "#7fe0ff", "#9effb0", "#ffd25a"];
        for (let i = 0; i < 32; i++) {
            const a = wa + i * Math.PI / 16, x = cx + Math.cos(a) * (WR + 1), y = cy + Math.sin(a) * (WR + 1);
            const on = party ? Math.floor(time * 10 + i) % 2 : (i + Math.floor(time * 4)) % 4 !== 0;
            dot(x, y, on ? BUL[i % 5] : "#5a3a2a");
        }
        // the cabins hang straight down and sway when the wheel changes speed
        const sway = clamp((wv - 0.22) * 1.2, -2, 2);
        for (let i = 0; i < N_CAB; i++) {
            const a = cabAngle(i), px = cx + Math.cos(a) * WR, py = cy + Math.sin(a) * WR;
            const yours = ride && i === ride.you;
            const cab = yours ? cabins[i].you : cabins[i].normal;
            const sx = Math.round(px + Math.sin(a) * sway * 0.6);
            pline(Math.round(px), Math.round(py), sx, Math.round(py) + 2, "#3c3442");
            ctx.drawImage(cab.cv, sx - cab.ax, Math.round(py) + 2 - cab.ay + 1);
            if (yours && Math.floor(time * 4) % 2) { dot(sx - 7, Math.round(py) + 6, "#ffffff"); dot(sx + 6, Math.round(py) + 6, "#ffffff"); }
        }
        // where the top is, while you're playing
        if (ride) { const tx = cx, ty = cy - WR - 9; box(tx - 1, ty - 4, 3, 1, "#ffffff"); box(tx, ty - 3, 1, 3, "#ffffff"); dot(tx - 1, ty - 1, "#ffffff"); dot(tx + 1, ty - 1, "#ffffff"); }
    }

    // click on anyone and they react
    canvas.addEventListener("click", (e) => {
        if (moved) return;
        if (ride) { brake(); return; }
        const wx = e.clientX / s + cam, wy = e.clientY / s - oy;
        const near = (x, y, rx, ry) => Math.abs(wx - x) <= rx && Math.abs(wy - y) <= ry;
        for (const d of ducks) if (near(d.x, D.pond.y - 2, 5, 5)) { say({ x: d.x, y: D.pond.y - 4 }, "QUACK"); return; }
        if (near(cat.x, cat.y - 4, 5, 6)) { say({ x: cat.x, y: cat.y - 8 }, "MRRP"); return; }
        if (near(office.x0 + 50, office.y0 + office.top - 7, 34, 8)) { pigeons.forEach((g, i) => (g.fly = { t0: time + i * 0.1, dir: wx > office.x0 + 56 ? -1 : 1 })); return; }
        let best = null, bd = 9;
        for (const p of people) { if (p.hidden) continue; const d = Math.abs(p.x - wx); if (d < bd && wy > p.y - 15 && wy < p.y + 2) { bd = d; best = p; } }
        if (best) { best.hopT = 0.35; say(best, best.dog ? "WOOF" : pickOf(["heart", "bang", "what", "note", "smile", "star"], r)); }
    });

    function update(dt) {
        time += dt;
        // camera glide + inertia
        if (!drag) {
            if (Math.abs(camV) > 2) { camT = clamp(camT + camV * dt, minCam(), maxCam()); camV *= Math.pow(0.04, dt); } else camV = 0;
            cam += (camT - cam) * Math.min(1, dt * 8);
        }
        // head: blink, and look toward the pointer
        head.nextBlink -= dt;
        if (head.nextBlink < 0 && head.blink !== 2) { head.blink = 1; if (head.nextBlink < -0.14) { head.blink = 0; head.nextBlink = 2 + r() * 3.5; } }
        if (pointer.x >= 0) {
            const wx = pointer.x / s + cam;
            head.gx = wx < P.head.x - 60 ? -1 : wx > P.head.x + 60 ? 1 : 0;
        }

        // kids
        kidTimer -= dt;
        if (kidTimer < 0 && kids.length < 10) { spawnKid(false); kidTimer = 1.4 + r() * 2.2; }

        for (const p of people) {
            p.t += dt;
            if (p.role === "potty") continue;
            if (p.role === "work") { p.frame = p.rate ? 3 + (Math.floor(p.t * p.rate) % 2) : 0; if (p.water && p.frame === 4 && r() < dt * 12) parts.push({ k: "drop", x: p.x + 5 * p.dir, y: p.y - 3, vy: 0, life: 0.5 }); if (p.sparks && p.frame === 4 && r() < dt * 6) parts.push({ k: "spark", x: p.x + 5 * p.dir, y: p.y - 4, vx: (r() - 0.5) * 30, vy: -20 - r() * 20, life: 0.3 }); continue; }
            if (p.role === "stroll") {
                if (p.wait > 0) { p.wait -= dt; p.frame = 0; continue; }
                const dx = p.tx - p.x;
                if (Math.abs(dx) < 1) { p.wait = p.dog ? 0.3 + r() * 1.2 : 1 + r() * 3.5; p.tx = p.min + r() * (p.max - p.min); p.ty = bandY(); continue; }
                const step = Math.sign(dx) * Math.min(Math.abs(dx), p.speed * dt);
                p.x += step; p.dir = Math.sign(dx) || p.dir; p.dist += Math.abs(step);
                p.y += (p.ty - p.y) * Math.min(1, dt * 0.8);
                p.frame = 1 + (Math.floor(p.dist / (p.dog ? 2 : 3)) % 2);
                continue;
            }
            if (p.role === "kid") {
                if (p.state === "out") {   // stepping out of the gate
                    p.y += 10 * dt; p.frame = 1 + (Math.floor(p.t * 8) % 2);
                    if (p.y >= GY + 3) p.state = "run";
                    continue;
                }
                if (p.state === "wave") { p.frame = 3 + (Math.floor(p.t * 4) % 2); p.wait -= dt; if (p.wait < 0) { if (r() < 0.35) { p.state = "home"; p.tx = gateX; } else { p.state = "run"; p.tx = clamp(p.x + (r() - 0.5) * 300, 40, WW - 40); p.ty = bandY(); } } continue; }
                const dx = p.tx - p.x;
                if (Math.abs(dx) < 1.5) {
                    if (p.state === "home") { p.y -= 10 * dt; if (p.y < GY - 1) p.dead = true; p.frame = 1 + (Math.floor(p.t * 8) % 2); continue; }
                    p.state = "wave"; p.wait = 0.8 + r() * 2; continue;
                }
                const step = Math.sign(dx) * Math.min(Math.abs(dx), p.speed * dt);
                p.x += step; p.dir = Math.sign(dx); p.dist += Math.abs(step);
                p.y += ((p.state === "home" ? GY + 3 : p.ty) - p.y) * Math.min(1, dt * 1.5);
                p.frame = 1 + (Math.floor(p.dist / 2.5) % 2);
                p.hopY = Math.floor(p.dist / 2.5) % 2 ? -1 : 0;
            }
        }
        for (let i = people.length - 1; i >= 0; i--) if (people[i].dead) { const k = kids.indexOf(people[i]); if (k >= 0) kids.splice(k, 1); people.splice(i, 1); }

        // smoke from the chimney, balloons from the vendor, birds
        if (r() < dt * 2.2) parts.push({ k: "smoke", x: house.x0 + 72 + (r() - 0.5) * 3, y: house.y0 + 12, vx: 3 + r() * 3, vy: -7 - r() * 3, life: 3.5, age: 0 });
        if (vendor && r() < dt * 0.12) parts.push({ k: "balloon", x: vendor.x + 3, y: vendor.y - 30, vx: 0, vy: -9 - r() * 4, life: 30, age: 0, c: pickOf(["#e2553c", "#f3c23a", "#4aa2e0", "#b45ad8", "#f08ac0"], r) });
        birdTimer -= dt;
        if (birdTimer < 0) {
            birdTimer = 6 + r() * 10;
            const dir = r() < 0.5 ? 1 : -1, y = -20 + r() * 90, n = 3 + Math.floor(r() * 3);
            for (let i = 0; i < n; i++) birds.push({ x: dir > 0 ? -10 - i * 7 : VW + 10 + i * 7, y: y + Math.abs(i - n / 2) * 4, v: dir * (22 + r() * 4), ph: r() * 6 });
        }
        for (const b of birds) b.x += b.v * dt;
        for (let i = birds.length - 1; i >= 0; i--) if (birds[i].x < -40 || birds[i].x > VW + 40) birds.splice(i, 1);
        for (const q of parts) {
            q.life -= dt; q.age = (q.age || 0) + dt;
            if (q.k === "fw") { if (q.delay > 0) { q.delay -= dt; q.life += dt; continue; } q.vy += 18 * dt; q.vx *= 0.97; q.vy *= 0.97; q.x += q.vx * dt; q.y += q.vy * dt; continue; }
            if (q.k === "drop") { q.vy += 120 * dt; q.y += q.vy * dt; }
            else if (q.k === "spark") { q.vy += 80 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
            else { q.x += (q.vx + (q.k === "balloon" ? Math.sin(q.age * 2) * 4 : 0)) * dt; q.y += q.vy * dt; }
        }
        for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0 || parts[i].y + oy < -30) parts.splice(i, 1);

        updateRide(dt);
        // the toilet regular
        {
            const p = pottyGuy;
            if (p.state === "walk") {
                if (p.wait > 0) { p.wait -= dt; p.frame = 0; }
                else {
                    const dx = p.tx - p.x;
                    if (Math.abs(dx) < 1) { p.wait = 1 + r() * 2; if (r() < 0.45) { p.state = "go"; p.tx = D.potty + 6; } else p.tx = 985 + r() * 90; }
                    else { const st = Math.sign(dx) * Math.min(Math.abs(dx), p.speed * dt); p.x += st; p.dir = Math.sign(dx); p.dist += Math.abs(st); p.frame = 1 + (Math.floor(p.dist / 3) % 2); }
                }
            } else if (p.state === "go") {
                const dx = p.tx - p.x;
                if (Math.abs(dx) < 1) { p.state = "in"; p.hidden = true; p.wait = 4 + r() * 4; pottyDoor = 0.6; }
                else { const st = Math.sign(dx) * Math.min(Math.abs(dx), p.speed * dt); p.x += st; p.dir = Math.sign(dx); p.dist += Math.abs(st); p.frame = 1 + (Math.floor(p.dist / 3) % 2); p.y += (GY + 3 - p.y) * dt; }
            } else if (p.state === "in") {
                p.wait -= dt;
                if (p.wait < 0) { p.state = "walk"; p.hidden = false; pottyDoor = 1.2; p.tx = 990 + r() * 70; p.wait = 0.8; say(p, "star", 1.4); }
            }
            pottyDoor = Math.max(0, pottyDoor - dt);
        }
        // ducks paddle about
        for (const [i, d] of ducks.entries()) {
            if (d.follow !== undefined) { const m = ducks[d.follow]; const gap = (i - d.follow) * 6; const tx = m.x - m.dir * gap; d.x += (tx - d.x) * Math.min(1, dt * 2); d.dir = m.dir; continue; }
            d.x += d.dir * d.v * dt;
            if (Math.abs(d.x - D.pond.x) > D.pond.rx - 6) { d.dir *= -1; d.x = D.pond.x + Math.sign(d.x - D.pond.x) * (D.pond.rx - 6); }
            if (r() < dt * 0.15) d.dir *= -1;
        }
        // pigeons sometimes all take off
        if (r() < dt * 0.03) { const t0 = time; pigeons.forEach((g, i) => (g.fly = { t0: t0 + i * 0.12, dir: r() < 0.5 ? -1 : 1 })); }
        for (const g of pigeons) if (g.fly && time - g.fly.t0 > 6.5) g.fly = null;
        // confetti out of the gate
        confettiT -= dt;
        if (confettiT < 0) {
            confettiT = 6 + r() * 6;
            const cols = ["#e2553c", "#f3c23a", "#4aa2e0", "#6cc04a", "#f08ac0", "#ffffff", "#b45ad8"];
            for (let i = 0; i < 40; i++) parts.push({ k: "conf", x: head.x0 + 74.5 + (r() - 0.5) * 10, y: GY - 14, vx: (r() - 0.5) * 80, vy: -45 - r() * 55, life: 2.2 + r(), c: pickOf(cols, r) });
        }
        // steam from the lab, drips from the air conditioners, zzz from the bench
        if (r() < dt * 1.6) parts.push({ k: "steam", x: lab.x0 + 104 + (r() - 0.5) * 6, y: lab.y0 + 62, vx: 3, vy: -8, life: 1.6, age: 0 });
        if (r() < dt * 0.6) { const a = pickOf(office.acs, r); parts.push({ k: "drop", x: office.x0 + a.x, y: office.y0 + a.y, vy: 0, life: 0.6 }); }
        // somebody always has something to say
        emoteT -= dt;
        if (emoteT < 0) {
            emoteT = 2 + r() * 3;
            const vis = people.filter((p) => !p.hidden && !p.dog);
            if (vis.length) say(pickOf(vis, r), pickOf(Object.keys(GLYPH), r));
        }
        for (const b of bubbles) b.t -= dt;
        for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].t <= 0) bubbles.splice(i, 1);
        for (const p of people) if (p.hopT > 0) p.hopT -= dt;
        // a plane with a banner, now and then
        planeT -= dt;
        if (planeT < 0 && !plane) { plane = { x: VW + 20 }; planeT = 28 + r() * 20; }
        if (plane) { plane.x -= 26 * dt; if (plane.x < -bannerPx.w - 40) plane = null; }
        // my head winks sometimes
        winkT -= dt;
        if (winkT < 0) { head.blink = 2; if (winkT < -0.45) { head.blink = 0; winkT = 8 + r() * 8; } }

        // the office: lights going on and off
        if (r() < dt * 0.5) { const w = pickOf(wins, r); w.in = !w.in; }
    }

    function draw() {
        const ci = Math.round(cam);
        ctx.drawImage(skyCv, 0, 0);
        // clouds drift
        for (const c of clouds) {
            const span = VW + c.cv.width + 200;
            let x = (c.x + time * c.v - cam * c.p) % span; if (x < 0) x += span;
            ctx.drawImage(c.cv, Math.round(x - c.cv.width - 100), Math.round(c.y + oy));
        }
        // birds
        for (const b of birds) {   // three wing positions, a body and a beak
            const ph = Math.floor(time * 8 + b.ph) % 4, wing = [-2, -1, 0, 1][ph === 3 ? 1 : ph];
            const x = Math.round(b.x), y = Math.round(b.y + oy), d = Math.sign(b.v);
            for (const sd of [-1, 1]) { dot(x + sd, y, "#2a2440"); dot(x + sd * 2, y + Math.round(wing / 2), "#2a2440"); dot(x + sd * 3, y + wing, "#3a3458"); }
            dot(x, y, "#2a2440"); dot(x + d, y - 1, "#2a2440"); dot(x + d * 2, y - 1, "#f39a2c"); dot(x - d, y + 1, "#5a5478");
        }

        ctx.drawImage(islandsCv, -Math.round(cam * 0.22), oy + Math.round(Math.sin(time * 0.6) * 1.5));
        { // a hot-air balloon drifting along, its burner flaring now and then
            const span = VW + 120;
            let x = (260 + time * 2.4 - cam * 0.18) % span; if (x < 0) x += span;
            const bx = Math.round(x - 60), by = Math.round(oy + 52 + Math.sin(time * 0.5) * 3);
            ctx.drawImage(balloonCv, bx, by);
            if (Math.floor(time * 2) % 7 === 0) { dot(bx + 13, by + 31, "#ffe17a"); dot(bx + 14, by + 30, "#f39a2c"); dot(bx + 13, by + 30, "#fff4c2"); }
        }
        if (plane) { // a little plane towing a banner
            const px = Math.round(plane.x), py = Math.round(oy + 18 + Math.sin(time * 1.3) * 2);
            ctx.drawImage(planeCv, px - 4, py - 6);
            const prop = Math.floor(time * 24) % 3;
            box(px - 1, py - 1 + prop, 1, 3, "#e0e6f0"); dot(px - 1, py + 4 - prop, "#aeb7ce"); dot(px, py + 1, "#2c3046");
            pline(px + 14, py + 1, px + 18, py + 4, "#2c3046");
            const bw = bannerPx.w;
            for (let col = 0; col < bw; col++) {
                const off = Math.round(Math.sin(col * 0.22 - time * 7) * 1.2);
                for (let row = 0; row < 9; row++) { const c = bannerPx.d[row * bw + col]; if (c) { ctx.fillStyle = (c === WHITE) ? "#f6efe2" : "#b8322e"; ctx.fillRect(px + 18 + col, py + row + off, 1, 1); } }
                dot(px + 18 + col, py - 1 + off, "#2c3046"); dot(px + 18 + col, py + 9 + off, "#2c3046");
            }
        }
        ctx.drawImage(farCv, -Math.round(cam * 0.4), oy);
        ctx.drawImage(midCv, -Math.round(cam * 0.65), oy);
        ctx.drawImage(groundCv, -ci, oy);
        const X = (x) => Math.round(x) - ci, Y = (y) => Math.round(y) + oy;

        drawWheel(X, Y);
        // bunting from the head to two poles
        {
            const poles = [[rocket.x0 + rocket.light.x, rocket.y0 + 4, true], [P.head.x + 104, GY - 60]];
            for (const [px, py, tied] of poles) { if (tied) continue; box(X(px) - 1, Y(py), 4, GY - py + 1, "#1a1220"); box(X(px), Y(py), 2, GY - py + 1, "#8a5a32"); box(X(px), Y(py), 1, GY - py + 1, "#b07a48"); box(X(px) - 1, Y(py) - 3, 4, 3, "#f3c23a"); }
            const ends = [[poles[0], [P.head.x - 66, GY - 92]], [[P.head.x + 66, GY - 92], poles[1]]];
            const cols = ["#e2553c", "#f3c23a", "#4aa2e0", "#ffffff", "#6cc04a"];
            for (const [[ax, ay], [bx, by]] of ends) {
                const n = 12;
                for (let i = 0; i <= n; i++) {
                    const t = i / n, sag = Math.sin(Math.PI * t) * (10 + Math.sin(time * 1.3) * 1.2);
                    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t + sag;
                    dot(X(x), Y(y), "#3a2a20");
                    if (i % 2 === 0 && i < n) {
                        const c = cols[(i / 2) % 5], fx = X(x), fy = Y(y) + 1;
                        box(fx - 3, fy - 1, 7, 2, "#1a1220"); box(fx - 2, fy + 1, 5, 1, "#1a1220"); box(fx - 1, fy + 2, 3, 2, "#1a1220"); dot(fx, fy + 4, "#1a1220");
                        box(fx - 2, fy, 5, 1, c); box(fx - 1, fy + 1, 3, 1, c); dot(fx, fy + 2, c); dot(fx - 2, fy, "#ffffff66"); dot(fx + 1, fy + 1, "#00000033");
                    }
                }
            }
        }
        // the head
        const hcv = headCanvas(head.gx, head.blink);
        ctx.drawImage(hcv, X(head.x0), Y(head.y0));
        ctx.drawImage(frontCv, -ci, oy);
        // chase lights round the gate
        {
            const gcx = head.x0 + 74.5, top = head.y0 + GATE_TOP, rr = GATE_HW + 2;
            const n = 16;
            for (let i = 0; i <= n; i++) {
                const a = Math.PI + (i / n) * Math.PI;
                const x = gcx + Math.cos(a) * rr, y = top + rr + Math.sin(a) * rr;
                const on = (i + Math.floor(time * 6)) % 3 === 0;
                dot(X(x), Y(y), on ? "#fff4c2" : "#b8722a");
            }
            for (let y = top + rr; y < GY; y += 3) {
                const on = (Math.floor((y - top) / 3) + Math.floor(time * 6)) % 3 === 0;
                dot(X(gcx - rr), Y(y), on ? "#fff4c2" : "#b8722a"); dot(X(gcx + rr), Y(y), on ? "#fff4c2" : "#b8722a");
            }
        }
        if (Math.floor(time * 1.3) % 2) dot(X(rocket.x0 + rocket.light.x), Y(rocket.y0 + rocket.light.y), "#ff4a3a");
        // lab: a blinking mast and bubbling flasks in the window
        {
            if (Math.floor(time * 1.5) % 2 === 0) { dot(X(lab.x0 + lab.mast.x), Y(lab.y0 + lab.mast.y), "#ff4a3a"); }
            const w = lab.win;
            for (const fx of [w.x0 + 12, w.x0 + 58, w.x0 + 100]) {
                const bx = X(lab.x0 + fx), by = Y(lab.y0 + w.y1);
                box(bx - 4, by - 1, 12, 1, "#2a3a4a");
                box(bx, by - 4, 3, 3, "#7cf08a"); box(bx + 1, by - 6, 1, 2, "#d0f0f0");
                const b = Math.floor(time * 3 + fx) % 4;
                dot(bx + 1, by - 7 - b, "#c8ffd0");
            }
            // a scientist at the bench
            const sx = X(lab.x0 + w.x0 + 34 + Math.round(Math.sin(time * 0.5) * 6)), sy = Y(lab.y0 + w.y1);
            box(sx, sy - 8, 3, 3, "#e0ae84"); box(sx, sy - 9, 3, 1, "#1c1410"); box(sx - 1, sy - 5, 5, 4, "#f4f6fa");
        }
        // office windows
        for (const w of wins) {
            const x = X(office.x0 + w.x), y = Y(office.y0 + w.y);
            if (!w.in) continue;
            box(x, y, w.w, w.h, "#f2d58c"); box(x, y + w.h - 3, w.w, 3, "#c9a060");
            box(x + 6, y, 1, w.h, "#8c3b33");
            const bob = Math.floor(time * 2 + w.t) % 5 === 0 ? 1 : 0;
            box(x + 2, y + 3 + bob, 3, 3, w.skin); box(x + 2, y + 2 + bob, 3, 1, w.hair); box(x + 1, y + 6, 5, 3, w.shirt);
            const flick = Math.floor(time * 4 + w.t * 3) % 6 === 0;
            box(x + 8, y + 3, 4, 4, "#1a1a28"); box(x + 9, y + 4, 2, 2, flick ? "#ffffff" : w.hue); box(x + 9, y + 7, 2, 1, "#1a1a28");
        }
        // antenna light, flag
        if (Math.floor(time * 1.2) % 2 === 0) dot(X(office.x0 + office.antenna.x), Y(office.y0 + office.antenna.y), "#ff4a3a");
        {
            const fx = X(office.x0 + office.flag.x), fy = Y(office.y0 + office.flag.y);
            box(fx, fy, 1, 22, "#7a84a2");
            for (let i = 1; i <= 10; i++) { const wv = Math.round(Math.sin(time * 6 - i * 0.6) * (i / 10) * 1.5); box(fx + i, fy + 1 + wv, 1, 6, i % 4 < 2 ? "#e2553c" : "#f6efe2"); }
        }
        // crane: trolley and a swinging load
        {
            const j = site.jib, tx = j.x0 + (j.x1 - j.x0) * (0.5 + 0.4 * Math.sin(time * 0.25));
            const hx = X(site.x0 + tx), hy = Y(site.y0 + j.y);
            const len = 70 + Math.sin(time * 0.4) * 20, sw = Math.sin(time * 1.1) * 3;
            box(hx - 2, hy, 5, 2, "#2c3046");
            pline(hx, hy + 2, hx + sw, hy + len, "#2c3046");
            box(hx + sw - 5, hy + len, 11, 2, "#71462a"); box(hx + sw - 4, hy + len - 4, 9, 4, "#b25941"); box(hx + sw - 4, hy + len - 4, 9, 1, "#d48159");
            if (Math.floor(time * 1.5) % 2 === 0) dot(X(site.x0 + 128), Y(site.y0 + site.lightY), "#ff4a3a");
        }
        // smoke behind people
        for (const q of parts) if (q.k === "smoke") {
            const rad = 1 + q.age * 1.3, a = q.life / 3.5;
            const c = a > 0.6 ? "#eef0f4" : a > 0.3 ? "#c9cfdc" : "#a7afc2";
            const cx = X(q.x), cy = Y(q.y);
            fill(c);
            for (let yy = -Math.ceil(rad); yy <= Math.ceil(rad); yy++) { const hw = Math.floor(Math.sqrt(Math.max(0, rad * rad - yy * yy))); ctx.fillRect(cx - hw, cy + yy, hw * 2 + 1, 1); }
        }
        drawDetails(X, Y);
        // people, back to front
        const order = people.slice().sort((a, b) => (a.z ?? 0) - (b.z ?? 0) || a.y - b.y);
        for (const p of order) {
            if (p.hidden) continue;
            const img = (p.dir < 0 ? p.spr.L : p.spr.R)[p.frame || 0];
            const x = X(p.x - p.spr.ax), y = Y(p.y - p.spr.ay + (p.role === "kid" ? (p.hopY || 0) : 0) + (p.hop ? -(Math.floor(p.dist / 2) % 2) : 0) - (p.hopT > 0 ? Math.round(Math.sin(p.hopT / 0.35 * Math.PI) * 3) : 0));
            if (p.balloon) { const bx = X(p.x) + p.dir * 4; pline(X(p.x) + p.dir * 3, y + 12, bx, y - 2, "#ffffffaa"); ctx.drawImage(balloonOf(p.balloon), bx - 6, y - 14); }
            if (p.vendor) {
                const cols = ["#e2553c", "#f3c23a", "#4aa2e0", "#b45ad8", "#f08ac0", "#6cc04a"];
                for (let i = 0; i < 6; i++) {
                    const bx = X(p.x) + (i - 2.5) * 6 + Math.round(Math.sin(time * 1.4 + i) * 1), by = y - 16 - (i % 2) * 6 + Math.round(Math.cos(time * 1.2 + i) * 1);
                    pline(X(p.x) + 2, y + 12, bx + 2, by + 6, "#ffffff99");
                    ctx.drawImage(balloonOf(cols[i]), bx - 4, by - 4);
                }
            }
            ctx.drawImage(img, x, y);
        }
        // other particles
        for (const q of parts) {
            if (q.k === "drop") dot(X(q.x), Y(q.y), "#8fd0ff");
            else if (q.k === "spark") dot(X(q.x), Y(q.y), "#ffe17a");
            else if (q.k === "fw") { if (q.delay > 0) continue; dot(X(q.x), Y(q.y), q.life < 0.4 && Math.floor(q.life * 20) % 2 ? "#ffffff" : q.c); if (q.life > 0.8) dot(X(q.x - q.vx * 0.04), Y(q.y - q.vy * 0.04), q.c + "88"); }
            else if (q.k === "conf") { const flip = Math.floor(q.age * 12 + q.x) % 2; box(X(q.x), Y(q.y), flip ? 2 : 1, flip ? 1 : 2, q.c); }
            else if (q.k === "zzz") { const x = X(q.x + Math.sin(q.age * 3) * 2), y = Y(q.y); const c = "#f6efe2"; box(x, y, 3, 1, c); dot(x + 1, y + 1, c); box(x, y + 2, 3, 1, c); }
            else if (q.k === "steam") { const rad = 0.8 + q.age * 1.2, cx = X(q.x), cy = Y(q.y); fill(q.life > 0.8 ? "#ffffff" : "#e6ecf4"); for (let yy = -Math.ceil(rad); yy <= Math.ceil(rad); yy++) { const hw = Math.floor(Math.sqrt(Math.max(0, rad * rad - yy * yy))); ctx.fillRect(cx - hw, cy + yy, hw * 2 + 1, 1); } }
            else if (q.k === "balloon") { const x = X(q.x), y = Y(q.y); ctx.drawImage(balloonOf(q.c), x - 4, y - 4); pline(x + 2, y + 7, x + 2 + Math.round(Math.sin(q.age * 3) * 2), y + 14, "#ffffff99"); }
        }
        // speech bubbles
        for (const b of bubbles) {
            const f = b.follow;
            let bx, by;
            if (f.spr) { if (f.hidden) continue; bx = X(f.x); by = Y(f.y - f.spr.ay) - 3; }
            else { bx = X(f.x); by = Y(f.y) - 6; }
            const pop = b.max - b.t < 0.12 ? 1 : 0;
            if (GLYPH[b.content]) {
                box(bx - 5, by - 10 + pop, 11, 9, "#140f1c"); box(bx - 4, by - 9 + pop, 9, 7, "#ffffff"); dot(bx, by - 1 + pop, "#140f1c"); dot(bx, by - 2 + pop, "#ffffff");
                const g = GLYPH[b.content]; fill(GLYPH_COL[b.content]);
                for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (g[j][i] === "1") ctx.fillRect(bx - 2 + i, by - 8 + j + pop, 1, 1);
            } else {
                const w = textW(b.content) + 4;
                box(bx - Math.floor(w / 2) - 1, by - 10, w + 2, 9, "#140f1c"); box(bx - Math.floor(w / 2), by - 9, w, 7, "#ffffff"); dot(bx, by - 1, "#140f1c");
                glyphs(b.content, bx - Math.floor(w / 2) + 2, by - 8, "#140f1c");
            }
        }
        // hover: a blinking outline round the place
        if (hovered) {
            const o = SPOT[hovered].o;
            if (halos[hovered] && (Math.floor(time * 4) % 4 !== 0 || reduced)) ctx.drawImage(halos[hovered], X(o.x0) - 1, Y(o.y0) - 1);
        }
        ctx.drawImage(fgCv, -Math.round(cam * 1.25), oy);
        placeSpots();
    }

    function frame(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        update(dt);
        draw();
        requestAnimationFrame(frame);
    }

    let rt = null;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
    layout();
    if (reduced) {
        // a still frame; it redraws when you move around
        const sim = /sim/.test(location.search) ? 900 : 1;   // ?sim: run the world for a while first (for testing)
        for (let i = 0; i < sim; i++) update(0.016);
        draw();
        const redraw = () => { cam = camT; draw(); };
        ["pointermove", "wheel", "keydown", "pointerup"].forEach((ev) => window.addEventListener(ev, () => requestAnimationFrame(redraw), { passive: true }));
        window.addEventListener("focusin", () => requestAnimationFrame(redraw));
    } else requestAnimationFrame((t) => { last = t; frame(t); });
    if (onReady) onReady();
    if (/sim/.test(location.search)) window.__world = { update, draw, startRide, brake, endRide, get ride() { return ride; }, get wa() { return wa; } };
    return { lookAt, setInset, startRide };
}
