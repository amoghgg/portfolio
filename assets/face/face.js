/* ─────────────────────────────────────────────────────────────
   Amogh as a pixel-art sprite: 48 × 54 pixels, drawn in code from his
   photo and blown up with hard edges. A big wide cloud of curls, a
   round full face, thick straight brows, chunky black aviator-style
   glasses with a double bridge, a broad nose, full lips, stubble, a
   light blue checked shirt.

   Every feature is real pixels, not a filter: brows move up and
   down a row, pupils step across the lens, lids drop a row to blink,
   the mouth swaps between pixel shapes. The animation brain (springy
   saccades, blinks, idle glances, reactions) drives those pixels.

       const face = createFace(el, { expression: "curious" });
       face.setExpression("amused");
       face.lookAt(clientX, clientY);
       face.wink("R"); face.react("laughing", 2000); face.duck(true);
   ───────────────────────────────────────────────────────────── */

export const W = 48, H = 54;
const TOP = 1;          // headroom so the tallest curls keep their outline

const EXPRESSIONS = {
    resting:   { browL: 0, browR: 0, eyeOpen: 1.0, squint: 0.06, curve: 5, open: 0, width: 25, skew: 2, tilt: 0 },
    curious:   { browL: -13, browR: -7, eyeOpen: 1.08, squint: 0, curve: 7, open: 3, width: 24, skew: 4, tilt: -4 },
    amused:    { browL: -7, browR: -7, eyeOpen: 0.78, squint: 0.55, curve: 24, open: 12, width: 34, skew: 0, tilt: 3 },
    wry:       { browL: -12, browR: 5, eyeOpen: 0.88, squint: 0.3, curve: 11, open: 1, width: 29, skew: 11, tilt: 4 },
    direct:    { browL: 7, browR: 7, eyeOpen: 1.04, squint: 0, curve: -2, open: 0, width: 23, skew: 0, tilt: 0 },
    warm:      { browL: -5, browR: -4, eyeOpen: 0.92, squint: 0.42, curve: 18, open: 4, width: 32, skew: -3, tilt: -2 },

    // reactions
    dazzled:   { browL: 6, browR: 6, eyeOpen: 0.4, squint: 0.5, curve: 9, open: 2, width: 27, skew: 0, tilt: -2 },
    amazed:    { browL: -18, browR: -18, eyeOpen: 1.28, squint: 0, curve: 10, open: 17, width: 26, skew: 0, tilt: -1 },
    unsettled: { browL: -15, browR: 8, eyeOpen: 1.22, squint: 0, curve: -8, open: 4, width: 22, skew: 4, tilt: 5 },
    talking:   { browL: -6, browR: -4, eyeOpen: 1.0, squint: 0.05, curve: 6, open: 19, width: 24, skew: 0, tilt: -2 },
    smirk:     { browL: -9, browR: 2, eyeOpen: 0.92, squint: 0.35, curve: 9, open: 0, width: 27, skew: 14, tilt: 3 },
    skeptical: { browL: -16, browR: 7, eyeOpen: 0.9, squint: 0.3, curve: 2, open: 0, width: 24, skew: 7, tilt: 2 },
    thinking:  { browL: -8, browR: 3, eyeOpen: 0.95, squint: 0.15, curve: 3, open: 1, width: 23, skew: 5, tilt: -3 },
    laughing:  { browL: -10, browR: -10, eyeOpen: 0.45, squint: 0.9, curve: 30, open: 22, width: 36, skew: 0, tilt: 5 },
    sleepy:    { browL: 3, browR: 3, eyeOpen: 0.28, squint: 0.2, curve: 3, open: 0, width: 22, skew: 3, tilt: 6 },
    reading:   { browL: -3, browR: -1, eyeOpen: 0.96, squint: 0.1, curve: 4, open: 0, width: 24, skew: 2, tilt: -2 },

    // the two halves of the SignFlip figure
    question:  { browL: -22, browR: -22, eyeOpen: 1.15, squint: 0, curve: 4, open: 2, width: 24, skew: 0, tilt: -2 },
    flattened: { browL: 1, browR: 1, eyeOpen: 0.98, squint: 0.04, curve: 1, open: 0, width: 24, skew: 0, tilt: 0 },
};

export const EXPRESSION_NAMES = ["resting", "curious", "amused", "wry", "direct", "warm"];

// palette slots; pages can recolour them with --f-* custom properties
const SLOTS = {
    hair: ["--f-hair", "#1c1410"], curl: ["--f-curl", "#4b392c"], skin: ["--f-skin", "#dcae8a"],
    shade: ["--f-shade", "#c2916d"], jaw: ["--f-jaw", "#8f5f43"], stub: ["--f-stub", "#b48c72"], line: ["--f-line", "#2b1d12"],
    specs: ["--f-specs", "#0f0c0a"], rivet: ["--f-rivet", "#d9dde3"], glare: ["--f-glare", "#8f8cf0"],
    eye: ["--f-eye", "#f4efe6"], pupil: ["--f-pupil", "#241a12"],
    lip: ["--f-lip", "#c98676"], lipDark: ["--f-lip-dark", "#9a5a50"], mouth: ["--f-mouth", "#5e241a"],
    shirt: ["--f-shirt", "#e4eaf1"], check: ["--f-check", "#9fb2c9"], checkDark: ["--f-check-dark", "#5d7391"],
    collar: ["--f-collar", "#f6f8fb"], chain: ["--f-chain", "#cfd4da"], edge: ["--f-edge", "#0e0b08"],
};
const ORDER = Object.keys(SLOTS);
const IDX = Object.fromEntries(ORDER.map((k, i) => [k, i + 1]));   // 0 = empty

// A big, wide cloud of curls: wider than the face, hanging over the temples.
const CURLS_BACK = [[24, 9.5, 9.5], [15, 10.5, 7], [33, 10.5, 7], [9, 15.5, 5.6], [39, 15.5, 5.6],
    [19, 5.2, 6], [29, 5.2, 6], [24, 3.6, 5], [12, 6.8, 4.6], [36, 6.8, 4.6],
    [6.8, 20.5, 3.6], [41.2, 20.5, 3.6], [9.2, 24.5, 2.6], [38.8, 24.5, 2.6], [5, 12, 3], [43, 12, 3]];
// the hairline: clear forehead in the middle, curls falling at the temples
const CURLS_FRONT = [[14, 14.5, 3.3], [34, 14.5, 3.3], [11.6, 18.6, 2.7], [36.4, 18.6, 2.7],
    [18.4, 12.6, 2.7], [29.6, 12.6, 2.7], [24, 11.6, 2.5], [21, 12, 1.8], [27, 12, 1.8]];

const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };

function makeBuffer() { return new Uint8Array(W * H); }

export function drawSprite(p) {
    // p: { browL, browR, eyeL, eyeR (0..3 rows open), squint, gx, gy, mouth, hx, hy, duck }
    const buf = makeBuffer();
    const D = Math.round(p.duck || 0);
    const set = (x, y, c) => {
        x = Math.round(x); y = Math.round(y) + D + TOP;
        if (x >= 0 && x < W && y >= 0 && y < H) buf[y * W + x] = IDX[c];
    };
    const get = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? buf[y * W + x] : 0);
    const at = (x, y) => get(Math.round(x), Math.round(y) + D + TOP);
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
    const disc = (cx, cy, r, c) => {
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
            for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
                const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
                if (dx * dx + dy * dy <= r * r) set(x, y, c);
            }
    };

    // ── shirt: light blue and white checks, open collar (doesn't move with the head) ──
    const BOT = H - TOP;
    for (let y = 43; y < BOT; y++) {
        const t = (y - 43) / (BOT - 43);
        const half = 12 + Math.round(Math.sqrt(t) * 12.5);
        for (let x = 24 - half; x <= 23 + half; x++) {
            const vx = (x + 1) % 4 === 0, hy = (y + 2) % 4 === 0;
            set(x, y, vx && hy ? "checkDark" : vx || hy ? "check" : "shirt");
        }
    }
    rect(20, 37, 28, 46, "shade");                                    // neck: narrower than the jaw, in shadow
    for (let i = 0; i < 4; i++) { rect(20 + i, 44 + i, 20 + i, 44 + i, "shade"); rect(28 - i, 44 + i, 28 - i, 44 + i, "shade"); }
    rect(22, 46, 26, 49, "skin");                                     // the open V of the shirt, catching light
    rect(23, 50, 25, 50, "skin");
    // collar points
    for (const [x, y] of [[17, 43], [18, 43], [18, 44], [19, 45], [20, 46], [21, 47], [17, 44], [18, 45], [19, 46], [20, 47]]) set(x, y, "collar");
    for (const [x, y] of [[31, 43], [30, 43], [30, 44], [29, 45], [28, 46], [27, 47], [31, 44], [30, 45], [29, 46], [28, 47]]) set(x, y, "collar");
    set(24, 52, "collar");                                            // a button

    // ── head (shifts a pixel as he looks around) ──
    const hx = p.hx | 0, hy = p.hy | 0;
    const X = (x) => x + hx, Y = (y) => y + hy;
    const hd = (cx, cy, r, c) => disc(X(cx), Y(cy), r, c);
    const hr = (x0, y0, x1, y1, c) => rect(X(x0), Y(y0), X(x1), Y(y1), c);
    const hs = (x, y, c) => set(X(x), Y(y), c);
    const ha = (x, y) => at(X(x), Y(y));

    for (const [x, y, r] of CURLS_BACK) hd(x, y, r, "hair");
    // stray curls: the outline of his hair is never clean
    for (let y = 0; y < 27; y++) for (let x = 1; x < W - 1; x++) {
        if (ha(x, y)) continue;
        const n = ha(x - 1, y) === IDX.hair || ha(x + 1, y) === IDX.hair || ha(x, y + 1) === IDX.hair;
        if (n && hash(x, y) < 0.22) hs(x, y, "hair");
    }
    // ears, mostly lost in the curls
    hr(10, 27, 12, 32, "skin"); hr(10, 28, 10, 31, "shade");
    hr(36, 27, 38, 32, "skin"); hr(38, 28, 38, 31, "shade");
    // face: round and full, wide cheeks, a soft double chin
    for (let y = 12; y <= 42; y++) {
        let half;
        if (y < 14) half = 8.5; else if (y < 16) half = 10.5; else if (y < 31) half = 12.5;
        else half = 12.5 - Math.pow((y - 31) / 10, 1.9) * 6.2;
        if (y > 41) break;
        hr(Math.round(24 - half), y, Math.round(23 + half), y, "skin");
    }
    for (let y = 26; y <= 37; y++) hs(Math.round(23 + 12.5 - (y > 31 ? Math.pow((y - 31) / 10, 1.9) * 6.2 : 0)), y, "shade");
    // stubble: dithered along the jaw and chin, a patch under the lip
    for (let y = 33; y <= 42; y++) for (let x = 10; x <= 38; x++) {
        const v = ha(x, y);
        if (v !== IDX.skin && v !== IDX.shade) continue;
        const jaw = y >= 39 || ((x <= 13 || x >= 35) && y >= 35);
        if (jaw && (x + y) % 2 === 0) hs(x, y, "stub");
    }
    hr(23, 37, 25, 37, "stub"); hs(24, 38, "stub");
    // define the jaw: a darker contour along the lower face, and the shadow the chin throws on the neck
    const isFace = (x, y) => { const v = ha(x, y); return v === IDX.skin || v === IDX.shade || v === IDX.stub; };
    for (let y = 31; y <= 41; y++) {
        let l = -1, r = -1;
        for (let x = 8; x <= 40; x++) if (isFace(x, y)) { if (l < 0) l = x; r = x; }
        if (l < 0) continue;
        if (y >= 34) hs(l, y, "jaw");
        hs(r, y, "jaw");
        if (y >= 36) hs(r - 1, y, "shade");
    }
    for (let x = 14; x <= 34; x++) {
        let b = -1;
        for (let y = 33; y <= 42; y++) if (isFace(x, y)) b = y;
        if (b < 0) continue;
        hs(x, b, "jaw");                                              // the underside of the chin
        if (ha(x, b + 1) === IDX.shade) { hs(x, b + 1, "jaw"); }      // cast shadow on the neck
    }
    // the curls at the hairline, then texture: little lit arcs and a scatter of brown
    for (const [x, y, r] of CURLS_FRONT) hd(x, y, r, "hair");
    // texture: a staggered field of tiny lit "c" curls, each cell nudged a little
    const isHair = (x, y) => ha(x, y) === IDX.hair;
    for (let cy = -2; cy < 28; cy += 4) for (let cx = -2; cx < W; cx += 5) {
        const ox = cx + ((cy / 4) % 2 ? 2 : 0) + (hash(cx, cy) < 0.5 ? 0 : 1);
        const oy = cy + (hash(cy, cx) < 0.5 ? 0 : 1);
        const flip = hash(cx + 9, cy + 4) < 0.5;
        const motif = flip ? [[1, 0], [2, 0], [3, 1], [2, 2]] : [[1, 0], [2, 0], [0, 1], [1, 2]];
        const ok = motif.every(([dx, dy]) => isHair(ox + dx, oy + dy) && isHair(ox + dx, oy + dy - 1) && isHair(ox + dx + 1, oy + dy) && isHair(ox + dx - 1, oy + dy));
        if (ok) for (const [dx, dy] of motif) hs(ox + dx, oy + dy, "curl");
    }

    // brows: thick and straight, two rows
    const brow = (x0, x1, lift, innerSide) => {
        const y = 19 + lift;
        hr(x0, y, x1, y, "hair");
        hr(x0 + 1, y + 1, x1 - 1, y + 1, "hair");
        if (innerSide) hs(innerSide === "R" ? x1 : x0, y + 2, "hair");   // furrowed: inner end drops
    };
    brow(14, 21, p.browL, p.browL > 0 ? "R" : "");
    brow(27, 34, p.browR, p.browR > 0 ? "L" : "");

    // glasses: chunky aviator-style frames, a thick flat top bar, a double bridge
    hr(11, 22, 37, 23, "specs");                                       // the top bar
    for (const x0 of [12, 26]) {
        hr(x0, 22, x0 + 10, 31, "specs");
        hs(x0, 31, "skin"); hs(x0 + 10, 31, "skin");                   // cut lower corners
    }
    hr(22, 26, 26, 26, "specs");                                       // lower bridge
    hr(23, 24, 25, 25, "skin");                                        // the gap between the bridges
    hr(9, 23, 10, 23, "specs"); hr(38, 23, 39, 23, "specs");          // temples
    hs(12, 23, "rivet"); hs(36, 23, "rivet");                         // little silver rivets
    // lenses: skin behind, a bit of blue-light glare, then the eyes
    for (const [lx, open] of [[14, p.eyeL], [28, p.eyeR]]) {
        hr(lx, 24, lx + 6, 29, "skin");
        hs(lx + 5, 24, "glare"); hs(lx + 6, 25, "glare");
        if (open <= 0) { hr(lx + 1, 27, lx + 5, 27, "line"); continue; }
        const bot = 27, top = bot - Math.min(open, 3) + 1;
        hr(lx + 1, top, lx + 5, bot, "eye");
        if (open <= 2) hr(lx + 1, top - 1, lx + 5, top - 1, "line");   // heavy, hooded lids
        const px = lx + 2 + p.gx, py = Math.max(top, bot - 1 + p.gy);
        hr(px, py, px + 1, Math.min(bot, py + 1), "pupil");
        if (p.squint) hr(lx + 1, 28, lx + 5, 28, "shade");
    }

    // a broad, rounded nose
    hs(23, 30, "shade"); hs(22, 31, "shade"); hs(22, 32, "shade"); hs(26, 31, "shade"); hs(26, 32, "shade");
    hr(23, 33, 25, 33, "shade"); hs(22, 33, "line"); hs(26, 33, "line");

    // full lips
    const m = p.mouth;
    const cy = 35;
    const L = 24 - m.w, R = 23 + m.w + 1;
    if (m.open > 0 && m.w <= 2 && m.smile <= 0) {
        const h = m.open + 1;                                         // a round "o"
        hr(23, cy - 1, 25, cy - 1, "lipDark"); hr(23, cy + h, 25, cy + h, "lip");
        hr(22, cy, 22, cy + h - 1, "lipDark"); hr(26, cy, 26, cy + h - 1, "lipDark");
        hr(23, cy, 25, cy + h - 1, "mouth");
    } else if (m.open > 0) {
        const lift = m.smile > 0 ? 1 : 0, sk = m.skew > 0 ? 1 : 0;
        hr(L, cy, R, cy, "lipDark");
        hs(L - 1, cy - lift, "lipDark"); hs(R + 1, cy - lift - sk, "lipDark");
        hr(L, cy + 1, R, cy + m.open, "mouth");
        if (m.open >= 2) hr(L + 1, cy + 1, R - 1, cy + 1, "eye");     // teeth
        hr(L + 1, cy + m.open + 1, R - 1, cy + m.open + 1, "lip");
    } else {
        const lc = cy - (m.smile > 0 ? 1 : 0) + (m.smile < 0 ? 1 : 0);
        hr(L, cy, R, cy, "lipDark");                                   // upper lip / the line between
        hr(L + 1, cy + 1, R - 1, cy + 1, "lip");                       // a full lower lip
        hs(L - 1, lc, "lipDark"); hs(R + 1, lc - (m.skew > 0 ? 1 : 0), "lipDark");
        if (m.smile >= 2) { hs(L - 2, lc - 1, "lipDark"); hs(R + 2, lc - 1 - (m.skew > 0 ? 1 : 0), "lipDark"); }
        if (m.skew > 0 && m.smile >= 1) hs(R + 2, lc - 2, "lipDark");
    }

    // ── one-pixel dark outline around the whole silhouette ──
    const out = buf.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (buf[y * W + x]) continue;
        if (get(x - 1, y) || get(x + 1, y) || get(x, y - 1) || get(x, y + 1)) out[y * W + x] = IDX.edge;
    }
    return out;
}

// Map the continuous expression state to whole pixels.
function toPixels(s) {
    const blinkL = s.eyeOpen * s.blink, blinkR = s.eyeOpen * Math.min(s.blink, s.blinkR);
    const rows = (o) => (o < 0.22 ? 0 : o < 0.62 ? 1 : o < 1.14 ? 2 : 3);
    const lift = (b) => (b <= -15 ? -2 : b <= -6 ? -1 : b >= 5 ? 1 : 0);
    const c = s.curve, o = s.open;
    return {
        browL: lift(s.browL), browR: lift(s.browR),
        eyeL: rows(blinkL - Math.max(0, s.gy) * 0.18), eyeR: rows(blinkR - Math.max(0, s.gy) * 0.18),
        squint: s.squint > 0.4,
        gx: s.gx < -0.33 ? -1 : s.gx > 0.33 ? 1 : 0,
        gy: s.gy < -0.4 ? -1 : 0,
        hx: Math.round(s.gx * 0.9 + s.tilt * 0.12), hy: s.gy > 0.6 ? 1 : 0,
        mouth: {
            w: s.width > 31 ? 3 : s.width > 26 ? 2 : 2,
            open: o > 15 ? 2 : o > 7 ? 1 : 0,
            smile: c > 17 ? 2 : c > 8 ? 1 : c < -3 ? -1 : 0,
            skew: s.skew > 8 ? 1 : 0,
        },
        duck: s.duck,
    };
}

let uid = 0;

export function createFace(el, opts = {}) {
    const id = ++uid;
    el.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.className = "face-sprite";
    // Size and crispness live here too, so a stale or missing stylesheet can't shrink him to 40px.
    Object.assign(canvas.style, { display: "block", width: "100%", height: "auto", imageRendering: "pixelated" });
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "A pixel-art caricature of Amogh Bajpai");
    el.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(W, H);

    let pal = [];
    function readPalette() {
        const cs = getComputedStyle(el);
        pal = [null, ...ORDER.map((k) => {
            const v = (cs.getPropertyValue(SLOTS[k][0]) || "").trim() || SLOTS[k][1];
            const n = parseInt(v.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        })];
    }
    readPalette();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const base = opts.expression && EXPRESSIONS[opts.expression] ? opts.expression : "resting";
    const state = { ...EXPRESSIONS[base], gx: 0, gy: 0, blink: 1, blinkR: 1, duck: 0 };
    const target = { ...state };
    const look = { x: 0, y: 0, vx: 0, vy: 0 };
    let glanceAt = performance.now() + 3000, lastPointerAt = 0, idleFace = performance.now() + 9000;
    let resting = base, blinkAt = performance.now() + 2200, blinkPhase = 0, raf = null, lastKey = "";

    function setExpression(name, { hold = false } = {}) {
        const e = EXPRESSIONS[name] || EXPRESSIONS.resting;
        if (hold) resting = name;
        Object.assign(target, e);
    }
    function wink(side = "R", ms = 420) {
        const key = side === "L" ? "blink" : "blinkR";
        target[key] = 0.04;
        target[side === "L" ? "browL" : "browR"] -= 9;
        clearTimeout(wink._t);
        wink._t = setTimeout(() => { target[key] = 1; setExpression(resting); }, ms);
    }
    function glance(dx = (Math.random() - 0.5) * 1.8, dy = (Math.random() - 0.5) * 1.2, ms = 900) {
        look.x = dx; look.y = dy;
        clearTimeout(glance._t);
        glance._t = setTimeout(() => { look.x = 0; look.y = 0; }, ms);
    }
    function react(name, ms = 1400) {
        setExpression(name);
        clearTimeout(react._t);
        react._t = setTimeout(() => setExpression(resting), ms);
    }
    function lookAt(clientX, clientY) {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        look.x = Math.max(-1, Math.min(1, (clientX - (r.left + r.width / 2)) / (r.width * 1.4)));
        look.y = Math.max(-1, Math.min(1, (clientY - (r.top + r.height * 0.45)) / (r.height * 1.5)));
        const now = performance.now();
        if (now - lastPointerAt > 6000 && now > 2000) { react("curious", 700); glanceAt = now + 2600; }
        lastPointerAt = now; idleFace = now + 9000;
    }
    // Peek-a-boo: he sinks out of frame, and pops back up.
    function duck(down = true) { target.duck = down ? 30 : 0; }

    function paint(px) {
        const key = JSON.stringify(px);
        if (key === lastKey) return;
        lastKey = key;
        const buf = drawSprite(px);
        const d = img.data;
        for (let i = 0; i < buf.length; i++) {
            const c = pal[buf[i]];
            if (c) { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255; }
            else d[i * 4 + 3] = 0;
        }
        ctx.putImageData(img, 0, 0);
    }

    let lastFrame = 0;
    function render(now) {
        raf = requestAnimationFrame(render);
        if (now - lastFrame < 33) return;           // ~30 fps is plenty for 40 × 44 pixels
        lastFrame = now;
        for (const k of ["browL", "browR", "eyeOpen", "squint", "curve", "open", "width", "skew", "tilt"]) {
            state[k] += (target[k] - state[k]) * 0.2;
        }
        // duck in whole-pixel steps, like a sprite on a stage lift
        if (state.duck !== target.duck) state.duck += Math.sign(target.duck - state.duck) * 2;
        if (!reduced) {
            look.vx = (look.vx + (look.x - state.gx) * 0.42) * 0.62;
            look.vy = (look.vy + (look.y - state.gy) * 0.42) * 0.62;
            state.gx += look.vx; state.gy += look.vy;
            if (blinkPhase === 0 && now > blinkAt) { blinkPhase = 1; blinkAt = now; }
            if (blinkPhase === 1) { state.blink = 0.06; if (now - blinkAt > 110) { blinkPhase = 2; blinkAt = now; } }
            else if (blinkPhase === 2) { state.blink = 0.5; if (now - blinkAt > 60) { blinkPhase = 0; state.blink = 1; blinkAt = now + 2400 + Math.random() * 4200; } }
            if (now > glanceAt) { glance(); glanceAt = now + 4000 + Math.random() * 7000; blinkAt = Math.min(blinkAt, now + 120); }
            if (now > idleFace) {
                const idlers = ["thinking", "smirk", "curious", "reading", "resting"];
                react(idlers[Math.floor(Math.random() * idlers.length)], 2200 + Math.random() * 1800);
                idleFace = now + 7000 + Math.random() * 9000;
            }
        } else {
            state.gx += (look.x - state.gx) * 0.3; state.gy += (look.y - state.gy) * 0.3;
        }
        state.blinkR += ((target.blinkR ?? 1) - state.blinkR) * 0.5;
        paint(toPixels(state));
    }
    paint(toPixels(state));
    raf = requestAnimationFrame(render);

    return {
        el, canvas, setExpression, wink, glance, react, lookAt, duck,
        recolor: () => { readPalette(); lastKey = ""; },
        destroy() { cancelAnimationFrame(raf); el.innerHTML = ""; },
    };
}
