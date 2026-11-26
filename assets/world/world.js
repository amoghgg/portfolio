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
    for (let y = by; y >= top + size * 0.3; y--) {
        const w = 1.5 + (by - y < 4 ? 1.5 : 0);
        for (let i = -w; i <= w; i++) p.set(cx + i, y, tone(BARK, 2.4 - (i / w) * 1.3, Math.round(cx + i), y));
    }
    const blobs = [];
    const n = 6 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = r() * size * 0.28;
        blobs.push([cx + Math.cos(a) * d * 1.2, top + size * 0.38 + Math.sin(a) * d * 0.8, size * (0.2 + r() * 0.12)]);
    }
    blobs.sort((a, b) => a[1] - b[1]);
    const ccx = cx, ccy = top + size * 0.38, cr = size * 0.5;
    for (const [bx, byy, br] of blobs) {
        p.disc(bx, byy, br, (x, y, nx, ny) => {
            const gx = (x - ccx) / cr, gy = (y - ccy) / cr;
            const v = 2.4 + sphereLight(nx, ny) * 1.1 + sphereLight(clamp(gx, -1, 1), clamp(gy, -1, 1)) * 1.6 + (hash(x, y, seed) - 0.5) * 0.6;
            return tone(LEAF, v, x, y);
        });
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
    return { px: p.outline(), ax: 78, door: 78, win: { x0: L + 6, y0: wy0, x1: Rr - 6, y1: wy1 }, mast: { x: mx + 2, y: top - 59 } };
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
    return { px: p.outline(), ax: 56, door: 56, wins, antenna: { x: 86, y: top - 31 }, flag: { x: 66, y: top - 22 } };
}

function makeRocket() {
    const w = 34, h = 76, p = new Px(w, h);
    const cx = 17, by = h - 1;
    for (let y = 4; y <= by - 8; y++) {
        const t = (y - 4) / (by - 12);
        const half = t < 0.3 ? 1 + Math.sqrt(t / 0.3) * 6 : 7 - Math.max(0, t - 0.8) * 8;
        for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
            const nx = (x + 0.5 - cx) / (half + 0.5);
            const band = t < 0.22 || (t > 0.55 && t < 0.62);
            p.set(x, y, tone(band ? RED : METAL, (band ? 3 : 3.2) - nx * 1.6, x, y));
        }
    }
    p.disc(cx, 34, 4, METAL[1]);
    p.disc(cx, 34, 3, (x, y, nx, ny) => tone(GLASS, 3 - ny * 1.5 + (nx < 0 && ny < 0 ? 1 : 0), x, y));
    for (const s of [-1, 1]) for (let i = 0; i < 14; i++) {
        p.rect(cx + s * (6 + Math.floor(i / 3)), by - 22 + i, cx + s * (6 + Math.floor(i / 3)) + (s > 0 ? 1 : -1), by - 22 + i, RED[s < 0 ? 3 : 2]);
    }
    p.fill(cx - 4, by - 8, cx + 4, by - 6, () => METAL[1]);
    p.fill(2, by - 3, w - 3, by, (x, y) => tone(STONE, y === by - 3 ? 3.6 : 2.2, x, y));
    return { px: p.outline(), ax: cx };
}

function makeSite() {
    // a building going up: scaffolding, half a wall, a crane
    const w = 150, h = 184, p = new Px(w, h);
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
    p.rect(26, by - 6, 46, by, C("#f2c23a"));
    text(p, "SOON", 28, by - 5, OUT);
    return { px: p.outline(), ax: 60, jib: { x0: 24, x1: 110, y: by - 159 }, planks: [by - 80, by - 52, by - 26] };
}

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
    const buf = drawSprite({ browL: 0, browR: 0, eyeL: blink ? 0 : 2, eyeR: blink ? 0 : 2, squint: false, gx, gy: 0, hx: 0, hy: 0, mouth: { w: 2, open: 0, smile: 1, skew: 0 }, duck: 0 });
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

function makePerson(spec) {
    const kid = !!spec.kid;
    const W = kid ? 9 : 13, H = kid ? 12 : 17;
    const frames = [];
    for (let f = 0; f < 5; f++) {
        const p = new Px(W, H);
        const s = (x, y, c) => p.set(x + 1, y + 1, C(c));
        const r = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s(x, y, c); };
        const dark = (h) => { const n = parseInt(h.slice(1), 16); const k = (v) => Math.round(v * 0.72).toString(16).padStart(2, "0"); return "#" + k(n >> 16) + k((n >> 8) & 255) + k(n & 255); };
        const shirt = spec.coat ? "#f4f6fa" : spec.shirt, shirtD = dark(shirt);
        if (!kid) {
            r(2, 1, 5, 4, spec.skin);
            s(5, 3, "#1a1210");
            // hair or hat
            if (spec.hat) { r(2, 0, 5, 0, spec.hat); r(1, 1, 6, 1, spec.hat); s(2, 2, spec.hair); }
            else if (spec.style === 1) { r(2, 0, 5, 0, spec.hair); r(1, 1, 5, 1, spec.hair); r(1, 2, 2, 5, spec.hair); }
            else if (spec.style === 2) { r(1, -1, 5, 0, spec.hair); r(0, 1, 5, 1, spec.hair); r(0, 2, 2, 3, spec.hair); s(6, 0, spec.hair); }
            else { r(2, 0, 5, 0, spec.hair); r(2, 1, 4, 1, spec.hair); s(2, 2, spec.hair); }
            r(2, 5, 5, 9, shirt); r(2, 5, 2, 9, shirtD);
            if (spec.coat) r(2, 10, 5, 10, shirt);
            const legs = f === 1 ? [[2, 11, 2, 12], [5, 11, 5, 12]] : [[3, 11, 3, 12], [4, 11, 4, 12]];
            r(2, 10, 5, 10, spec.coat ? shirt : spec.pants);
            for (const [a, b, c2, d] of legs) { r(a, b, c2, d - 1, spec.pants); s(a, d, "#1a1210"); }
            const act = f >= 3 ? spec.act : null, alt = f === 4;
            if (!act) {
                if (f === 1) { r(5, 6, 5, 7, shirtD); s(6, 8, spec.skin); }
                else if (f === 2) { r(3, 6, 3, 8, shirtD); s(2, 9, spec.skin); }
                else { r(4, 6, 4, 8, shirtD); s(4, 9, spec.skin); }
                if (spec.carry) r(5, 6, 8, 8, spec.carry);
                if (spec.brief && f !== 1) { r(4, 10, 6, 11, "#5a3a22"); }
            } else if (act === "hammer") {
                if (!alt) { r(5, 3, 5, 5, shirtD); s(6, 2, spec.skin); r(6, 0, 8, 1, "#8a93a6"); s(7, 2, "#6b4a30"); }
                else { r(5, 6, 6, 6, shirtD); s(7, 7, spec.skin); r(8, 7, 9, 9, "#8a93a6"); }
            } else if (act === "water") {
                r(5, 6, 5, 7, shirtD); s(6, 8, spec.skin);
                r(6, 8, 8, 10, "#3c9a5a"); s(9, alt ? 10 : 8, "#3c9a5a");
            } else if (act === "sweep") {
                r(5, 6, 5, 7, shirtD); s(6, 8, spec.skin);
                if (!alt) { s(7, 9, "#b07a3a"); s(8, 10, "#b07a3a"); r(8, 11, 10, 12, "#d8b060"); }
                else { s(6, 9, "#b07a3a"); s(6, 10, "#b07a3a"); r(5, 11, 7, 12, "#d8b060"); }
            } else if (act === "wave") {
                if (!alt) { r(6, 2, 6, 5, shirtD); s(6, 1, spec.skin); }
                else { r(6, 3, 6, 5, shirtD); s(7, 2, spec.skin); }
            } else if (act === "type") {
                r(5, 7, 6, 7, shirtD); s(7, 7 + (alt ? 1 : 0), spec.skin);
            }
        } else {
            r(1, 1, 3, 3, spec.skin);
            s(3, 2, "#1a1210");
            r(1, 0, 3, 0, spec.hair); s(1, 1, spec.hair);
            if (spec.style === 1) { s(0, 1, spec.hair); s(0, 2, spec.hair); }
            r(1, 4, 3, 6, shirt); r(1, 4, 1, 6, shirtD);
            const wave = f >= 3;
            if (wave) { r(4, 1, 4, 3, shirtD); s(4, f === 4 ? 0 : 1, spec.skin); }
            else if (f === 1) s(4, 5, spec.skin);
            else if (f === 2) s(0, 6, spec.skin);
            else s(2, 6, spec.skin);
            if (f === 1) { s(1, 7, spec.pants); s(3, 7, spec.pants); s(0, 8, "#1a1210"); s(4, 8, "#1a1210"); }
            else { s(1, 7, spec.pants); s(3, 7, spec.pants); s(1, 8, "#1a1210"); s(3, 8, "#1a1210"); }
        }
        p.outline();
        frames.push(p.canvas());
    }
    const flip = frames.map((cv) => {
        const o = document.createElement("canvas"); o.width = cv.width; o.height = cv.height;
        const c = o.getContext("2d"); c.translate(cv.width, 0); c.scale(-1, 1); c.drawImage(cv, 0, 0);
        return o;
    });
    return { R: frames, L: flip, ax: kid ? 3.5 : 4.5, ay: kid ? 9 : 13 };
}

function makeDog() {
    const frames = [];
    for (let f = 0; f < 3; f++) {
        const p = new Px(12, 9);
        const s = (x, y, c) => p.set(x + 1, y + 1, C(c));
        const body = "#b0703c", d = "#7a4822";
        for (let x = 1; x <= 6; x++) for (let y = 3; y <= 4; y++) s(x, y, body);
        s(7, 2, body); s(8, 2, body); s(7, 3, body); s(8, 3, body); s(9, 3, "#2a1a10"); s(7, 1, d); s(8, 4, d);
        s(0, f === 1 ? 1 : 2, body);
        const legs = f === 1 ? [1, 3, 5, 6] : [2, 2, 5, 5];
        for (const x of legs) s(x, 5, d);
        s(8, 2, "#1a1210");
        p.outline();
        frames.push(p.canvas());
    }
    const flip = frames.map((cv) => { const o = document.createElement("canvas"); o.width = cv.width; o.height = cv.height; const c = o.getContext("2d"); c.translate(cv.width, 0); c.scale(-1, 1); c.drawImage(cv, 0, 0); return o; });
    return { R: [frames[0], frames[1], frames[2], frames[0], frames[0]], L: [flip[0], flip[1], flip[2], flip[0], flip[0]], ax: 5, ay: 7 };
}

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
        wheel: { x: 720 }, office: { x: 840 }, site: { x: 1010 },
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
    const groundCv = ground.canvas();

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
    };
    for (const k in SPOT) halos[k] = SPOT[k].o.px.halo(WHITE).canvas();
    let hovered = null;

    // ── who's about ──
    const people = [];
    const parts = [];
    const r = rng(9001);
    const bandY = () => GY + 5 + r() * 10;
    function spawn(o) {
        const spr = o.dog ? makeDog() : makePerson(o.spec);
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
    function onDown(e) {
        if (e.button !== 0) return;
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
        e.preventDefault();
        camT = clamp(camT + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / s, minCam(), maxCam());
        hideHint();
    }, { passive: false });
    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") camT = clamp(camT - 60, minCam(), maxCam());
        else if (e.key === "ArrowRight") camT = clamp(camT + 60, minCam(), maxCam());
        else return;
        hideHint();
    });
    let hintHidden = false;
    function hideHint() { if (!hintHidden) { hintHidden = true; document.body.classList.add("explored"); } }

    const minCam = () => (VW >= WW ? (WW - VW) / 2 : 0);
    const maxCam = () => (VW >= WW ? (WW - VW) / 2 : WW - VW);
    const spotX = (key) => (key === "head" ? P.head.x : SPOT[key].o.x0 + SPOT[key].o.px.w / 2);
    function lookAt(key) { camT = clamp(spotX(key) - VW / 2, minCam(), maxCam()); }

    // spots: links over each place
    for (const a of spots) {
        const k = a.dataset.place;
        a.addEventListener("pointerenter", () => { hovered = k; });
        a.addEventListener("pointerleave", () => { if (hovered === k) hovered = null; });
        a.addEventListener("focus", () => { hovered = k; lookAt(k); });
        a.addEventListener("blur", () => { if (hovered === k) hovered = null; });
        a.setAttribute("draggable", "false");
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

    function update(dt) {
        time += dt;
        // camera glide + inertia
        if (!drag) {
            if (Math.abs(camV) > 2) { camT = clamp(camT + camV * dt, minCam(), maxCam()); camV *= Math.pow(0.04, dt); } else camV = 0;
            cam += (camT - cam) * Math.min(1, dt * 8);
        }
        // head: blink, and look toward the pointer
        head.nextBlink -= dt;
        if (head.nextBlink < 0) { head.blink = 1; if (head.nextBlink < -0.14) { head.blink = 0; head.nextBlink = 2 + r() * 3.5; } }
        if (pointer.x >= 0) {
            const wx = pointer.x / s + cam;
            head.gx = wx < P.head.x - 60 ? -1 : wx > P.head.x + 60 ? 1 : 0;
        }

        // kids
        kidTimer -= dt;
        if (kidTimer < 0 && kids.length < 10) { spawnKid(false); kidTimer = 1.4 + r() * 2.2; }

        for (const p of people) {
            p.t += dt;
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
            if (q.k === "drop") { q.vy += 120 * dt; q.y += q.vy * dt; }
            else if (q.k === "spark") { q.vy += 80 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
            else { q.x += (q.vx + (q.k === "balloon" ? Math.sin(q.age * 2) * 4 : 0)) * dt; q.y += q.vy * dt; }
        }
        for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0 || parts[i].y + oy < -30) parts.splice(i, 1);

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
        for (const b of birds) {
            const up = Math.floor(time * 6 + b.ph) % 2;
            const x = Math.round(b.x), y = Math.round(b.y + oy);
            dot(x, y, "#2a2440"); dot(x - 1, y - up, "#2a2440"); dot(x + 1, y - up, "#2a2440"); dot(x - 2, y - up * 2 + (up ? 0 : 1), "#2a2440"); dot(x + 2, y - up * 2 + (up ? 0 : 1), "#2a2440");
        }
        ctx.drawImage(islandsCv, -Math.round(cam * 0.22), oy + Math.round(Math.sin(time * 0.6) * 1.5));
        ctx.drawImage(farCv, -Math.round(cam * 0.4), oy);
        ctx.drawImage(midCv, -Math.round(cam * 0.65), oy);
        ctx.drawImage(groundCv, -ci, oy);
        const X = (x) => Math.round(x) - ci, Y = (y) => Math.round(y) + oy;

        // the big wheel
        {
            const cx = X(P.wheel.x), cy = Y(GY - 50), rad = 38, a0 = time * 0.25;
            pline(cx, cy, cx - 24, Y(GY), "#3a3f5c"); pline(cx + 1, cy, cx - 23, Y(GY), "#7a84a2");
            pline(cx, cy, cx + 24, Y(GY), "#3a3f5c"); pline(cx + 1, cy, cx + 25, Y(GY), "#5a6280");
            for (let i = 0; i < 10; i++) { const a = a0 + i * Math.PI / 5; pline(cx, cy, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, "#c9cfe0"); }
            fill("#f6efe2");
            for (let k = 0; k < 220; k++) { const a = k / 220 * Math.PI * 2; ctx.fillRect(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), 1, 1); }
            fill("#e2553c");
            for (let k = 0; k < 200; k++) { const a = k / 200 * Math.PI * 2; ctx.fillRect(Math.round(cx + Math.cos(a) * (rad - 2)), Math.round(cy + Math.sin(a) * (rad - 2)), 1, 1); }
            box(cx - 2, cy - 2, 5, 5, "#3a3f5c"); box(cx - 1, cy - 1, 3, 3, "#f3c23a");
            const cols = ["#e2553c", "#f3c23a", "#4aa2e0", "#6cc04a", "#b45ad8"];
            for (let i = 0; i < 10; i++) {
                const a = a0 + i * Math.PI / 5, gx = Math.round(cx + Math.cos(a) * rad), gy = Math.round(cy + Math.sin(a) * rad);
                box(gx - 3, gy + 1, 7, 6, "#140f1c"); box(gx - 2, gy + 2, 5, 4, cols[i % 5]); box(gx - 2, gy + 2, 5, 1, "#ffffff55"); dot(gx, gy + 1, "#140f1c");
            }
        }
        // bunting from the head to two poles
        {
            const poles = [[P.head.x - 104, GY - 60], [P.head.x + 104, GY - 60]];
            for (const [px, py] of poles) { box(X(px), Y(py), 2, GY - py + 1, "#5a3a22"); box(X(px) - 1, Y(py) - 2, 4, 2, "#f3c23a"); }
            const ends = [[poles[0], [P.head.x - 66, GY - 92]], [[P.head.x + 66, GY - 92], poles[1]]];
            const cols = ["#e2553c", "#f3c23a", "#4aa2e0", "#ffffff", "#6cc04a"];
            for (const [[ax, ay], [bx, by]] of ends) {
                const n = 14;
                for (let i = 0; i <= n; i++) {
                    const t = i / n, sag = Math.sin(Math.PI * t) * (10 + Math.sin(time * 1.3) * 1.2);
                    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t + sag;
                    dot(X(x), Y(y), "#3a2a20");
                    if (i % 2 === 0 && i < n) { const c = cols[(i / 2) % 5]; box(X(x) - 1, Y(y) + 1, 3, 1, c); dot(X(x), Y(y) + 2, c); }
                }
            }
        }
        // the head
        const hcv = headCanvas(head.gx, head.blink);
        ctx.drawImage(hcv, X(head.x0), Y(head.y0));
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
            if (Math.floor(time * 1.5) % 2 === 0) dot(X(site.x0 + 128), Y(site.y0 + site.px.h - 1 - 178 + 1), "#ff4a3a");
        }
        // smoke behind people
        for (const q of parts) if (q.k === "smoke") {
            const rad = 1 + q.age * 1.3, a = q.life / 3.5;
            const c = a > 0.6 ? "#eef0f4" : a > 0.3 ? "#c9cfdc" : "#a7afc2";
            const cx = X(q.x), cy = Y(q.y);
            fill(c);
            for (let yy = -Math.ceil(rad); yy <= Math.ceil(rad); yy++) { const hw = Math.floor(Math.sqrt(Math.max(0, rad * rad - yy * yy))); ctx.fillRect(cx - hw, cy + yy, hw * 2 + 1, 1); }
        }
        // people, back to front
        const order = people.slice().sort((a, b) => (a.z ?? 0) - (b.z ?? 0) || a.y - b.y);
        for (const p of order) {
            const img = (p.dir < 0 ? p.spr.L : p.spr.R)[p.frame || 0];
            const x = X(p.x - p.spr.ax), y = Y(p.y - p.spr.ay + (p.role === "kid" ? (p.hopY || 0) : 0) + (p.hop ? -(Math.floor(p.dist / 2) % 2) : 0));
            if (p.balloon) { pline(X(p.x) + p.dir * 2, y + 3, X(p.x) + p.dir * 3, y - 9, "#ffffffaa"); box(X(p.x) + p.dir * 3 - 2, y - 15, 5, 6, p.balloon); dot(X(p.x) + p.dir * 3 - 1, y - 14, "#ffffff"); }
            if (p.vendor) {
                const cols = ["#e2553c", "#f3c23a", "#4aa2e0", "#b45ad8", "#f08ac0", "#6cc04a"];
                for (let i = 0; i < 6; i++) {
                    const bx = X(p.x) + (i - 2.5) * 5 + Math.round(Math.sin(time * 1.4 + i) * 1), by = y - 18 - (i % 2) * 5 + Math.round(Math.cos(time * 1.2 + i) * 1);
                    pline(X(p.x) + 1, y + 7, bx + 2, by + 6, "#ffffff99");
                    box(bx, by, 5, 6, cols[i]); box(bx + 1, by - 1, 3, 1, cols[i]); box(bx + 1, by + 6, 3, 1, cols[i]); dot(bx + 1, by + 1, "#ffffff");
                }
            }
            ctx.drawImage(img, x, y);
        }
        // other particles
        for (const q of parts) {
            if (q.k === "drop") dot(X(q.x), Y(q.y), "#8fd0ff");
            else if (q.k === "spark") dot(X(q.x), Y(q.y), "#ffe17a");
            else if (q.k === "balloon") { const x = X(q.x), y = Y(q.y); box(x, y, 5, 6, q.c); box(x + 1, y - 1, 3, 1, q.c); box(x + 1, y + 6, 3, 1, q.c); dot(x + 1, y + 1, "#ffffff"); pline(x + 2, y + 7, x + 2 + Math.round(Math.sin(q.age * 3) * 2), y + 14, "#ffffff99"); }
        }
        // hover: a blinking outline round the place
        if (hovered) {
            const o = SPOT[hovered].o;
            if (Math.floor(time * 4) % 4 !== 0 || reduced) ctx.drawImage(halos[hovered], X(o.x0) - 1, Y(o.y0) - 1);
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
    return { lookAt };
}
