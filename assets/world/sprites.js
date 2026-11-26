/* Hand-drawn sprites for the world.

   Each one is written out pixel by pixel as a little text grid, one letter
   per colour, the way you'd draw it in an editor. A one-pixel dark outline is
   added around the silhouette automatically, so the grids hold only colour.
   Light comes from the upper left: every object has a light, a mid and a
   shadow tone.

   People are chibi (big heads) and much bigger than they'd really be next to
   the buildings. At this resolution that's the only way a face, a newspaper
   or a watering can reads.                                                    */

const OUTLINE = "#1a1220";

function hexToU32(h) { const n = parseInt(h.slice(1, 7), 16); return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)) >>> 0; }
export function shade(hex, k) {   // k < 1 darker (and a touch cooler), k > 1 lighter (and warmer)
    const n = parseInt(hex.slice(1, 7), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (k < 1) { r = r * k; g = g * k; b = b * k + (255 - b) * (1 - k) * 0.12; }
    else { r = r + (255 - r) * (k - 1); g = g + (255 - g) * (k - 1) * 0.92; b = b + (255 - b) * (k - 1) * 0.7; }
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return "#" + c(r) + c(g) + c(b);
}

// Build a canvas from a text grid. pal maps letters to colours; "." is empty.
// over: extra [x, y, letter] pixels (may sit outside the grid, e.g. a raised arm).
export function art(rows, pal, { over = [], pad = 4, outline = true, flip = false } = {}) {
    const aw = Math.max(...rows.map((r) => r.length)), ah = rows.length;
    const w = aw + pad * 2, h = ah + pad * 2;
    const d = new Uint32Array(w * h);
    const put = (x, y, ch) => { const c = pal[ch]; if (!c) return; const X = x + pad, Y = y + pad; if (X >= 0 && Y >= 0 && X < w && Y < h) d[Y * w + X] = hexToU32(c); };
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== ".") put(x, y, row[x]); });
    for (const [x, y, ch] of over) { if (ch === ".") { const X = x + pad, Y = y + pad; if (X >= 0 && Y >= 0 && X < w && Y < h) d[Y * w + X] = 0; } else put(x, y, ch); }
    let out = d;
    if (outline) {
        out = d.slice();
        const ink = hexToU32(OUTLINE);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (d[y * w + x]) continue;
            const at = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[yy * w + xx];
            if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) out[y * w + x] = ink;
        }
    }
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d"); const im = ctx.createImageData(w, h);
    new Uint32Array(im.data.buffer).set(out); ctx.putImageData(im, 0, 0);
    if (!flip) return { cv, pad, w, h };
    const f = document.createElement("canvas"); f.width = w; f.height = h;
    const fx = f.getContext("2d"); fx.translate(w, 0); fx.scale(-1, 1); fx.drawImage(cv, 0, 0);
    return { cv: f, pad, w, h };
}

// ── people ──────────────────────────────────────────────────────
// Adult: 10 × 18, facing right. H hair, h hair shadow, S skin, s skin shadow,
// E eye, m cheek, C shirt, c shirt shadow, P trousers, p trouser shadow, B shoes.
const A_HEAD = [
    "..HHHHHH..",
    ".HHHHHHHH.",
    "HHHHHHHHHH",
    "HHHHHHSSHH",
    "hHHHSSSSSH",
    "hHHSSSSESS",
    "hHsSSSSESS",
    ".hsSSSSSmS",
    "..ssSSSSs.",
];
const A_BODY = {
    stand: ["...CCCC...", "..CCCCCC..", "..cCCcCC..", "..cCCcCC..", "..cCCSCC.."],
    fwd:   ["...CCCC...", "..CCCCCC..", "..cCCCcC..", "..cCCCCcS.", "..cCCCCC.."],
    back:  ["...CCCC...", "..CCCCCC..", ".ccCCCCC..", ".SccCCCC..", "..cCCCCC.."],
};
const A_LEGS = {
    stand: ["..PPPPPP..", "..PPp.PP..", "..PP..PP..", "..BB..BBB."],
    strideA: ["..PPPPPP..", ".PPp..PP..", "PP.....PP.", "BB.....BBB"],
    strideB: ["..PPPPPP..", "...PPpP...", "...PP.PP..", "...BBBBB.."],
};
const K_HEAD = [".HHHHH..", "HHHHHHHH", "HHHHSSSH", "hHSSSSES", "hHsSSSES", ".hSSSSmS", "..sSSSs."];
const K_BODY = { stand: ["..CCCC..", ".cCCCCC.", ".cCCSCC."], fwd: ["..CCCC..", ".cCCCCCS", ".cCCCCC."], back: ["..CCCC..", "ScCCCCC.", ".cCCCCC."] };
const K_LEGS = { stand: ["..PPPP..", "..P..P..", "..B..BB."], strideA: ["..PPPP..", ".P....P.", "BB....BB"], strideB: ["..PPPP..", "...PP...", "...BBB.."] };

function palFor(spec) {
    const shirt = spec.coat ? "#f4f6fa" : spec.shirt;
    return {
        H: spec.hair, h: shade(spec.hair, 0.72), S: spec.skin, s: shade(spec.skin, 0.84), E: "#1a1210", m: shade(spec.skin, 0.9).replace(/^#(..)/, (m0, r) => "#" + Math.min(255, parseInt(r, 16) + 30).toString(16).padStart(2, "0")),
        C: shirt, c: shade(shirt, 0.78), P: spec.coat ? shirt : spec.pants, p: shade(spec.coat ? shirt : spec.pants, 0.75), B: "#2a1a14",
        A: spec.hat || "#f3c23a", a: shade(spec.hat || "#f3c23a", 0.75),
        w: "#a8703a", W: "#c88a4a", M: "#9aa3b8", K: "#5c6378", g: "#3c9a5a", G: "#5cc07a", y: "#e8c060", Y: "#c89a3a", b: "#b25941", r: "#d48159", k: "#5a3a22", n: "#7a4a2a", Q: "#9adfff",
    };
}
function hairOver(spec, kid) {
    const o = [];
    if (spec.hat) {   // a hard hat or a cap: replaces the top of the hair
        const top = kid ? [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1]] :
            [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2]];
        top.forEach(([x, y], i) => o.push([x, y, y === (kid ? 1 : 2) ? "a" : "A"]));
    } else if (spec.style === 1) {   // long hair down the back
        const n = kid ? 3 : 5;
        for (let i = 0; i < n; i++) { o.push([kid ? 0 : 0, (kid ? 5 : 7) + i, "h"]); o.push([kid ? 1 : 1, (kid ? 5 : 7) + i, "H"]); }
    } else if (spec.style === 2) {   // big curls
        for (const [x, y] of (kid ? [[-1, 1], [-1, 2], [0, 0], [2, -1], [4, -1], [8, 2]] : [[-1, 2], [-1, 3], [-1, 4], [0, 1], [1, 0], [3, -1], [5, -1], [7, -1], [9, 1], [10, 3]])) o.push([x, y, "H"]);
    }
    return o;
}
// tools and poses, as extra pixels on top of the standing frame
const ACTS = {
    hammer: [
        [[7, 9, "C"], [8, 8, "C"], [9, 7, "S"], [9, 6, "w"], [9, 5, "w"], [8, 3, "M"], [9, 3, "M"], [10, 3, "M"], [8, 4, "K"], [9, 4, "M"], [10, 4, "K"]],
        [[8, 11, "C"], [9, 11, "S"], [10, 11, "w"], [11, 11, "w"], [12, 9, "M"], [12, 10, "M"], [12, 11, "M"], [13, 10, "K"]],
    ],
    water: [
        [[8, 11, "C"], [9, 12, "S"], [9, 13, "g"], [10, 13, "G"], [11, 13, "g"], [9, 14, "g"], [10, 14, "g"], [11, 14, "g"], [12, 12, "g"], [13, 11, "g"], [10, 12, "K"]],
        [[8, 11, "C"], [9, 12, "S"], [9, 13, "g"], [10, 13, "G"], [11, 13, "g"], [9, 14, "g"], [10, 14, "g"], [11, 14, "g"], [12, 14, "g"], [13, 15, "g"], [10, 12, "K"]],
    ],
    sweep: [
        [[8, 12, "S"], [9, 13, "w"], [10, 14, "w"], [11, 15, "w"], [10, 16, "y"], [11, 16, "y"], [12, 16, "Y"], [13, 16, "y"], [10, 17, "Y"], [11, 17, "y"], [12, 17, "Y"], [13, 17, "y"]],
        [[8, 12, "S"], [8, 13, "w"], [8, 14, "w"], [8, 15, "w"], [6, 16, "y"], [7, 16, "Y"], [8, 16, "y"], [9, 16, "y"], [6, 17, "Y"], [7, 17, "y"], [8, 17, "Y"], [9, 17, "y"]],
    ],
    squeegee: [
        [[8, 10, "C"], [9, 9, "S"], [10, 8, "w"], [11, 7, "M"], [11, 6, "M"], [11, 8, "M"], [12, 7, "Q"]],
        [[8, 11, "C"], [9, 11, "S"], [10, 10, "w"], [11, 10, "M"], [11, 9, "M"], [11, 11, "M"]],
    ],
};
const CARRY = [[6, 9, "b"], [7, 9, "r"], [8, 9, "b"], [9, 9, "r"], [6, 10, "b"], [7, 10, "b"], [8, 10, "b"], [9, 10, "b"], [6, 11, "r"], [7, 11, "b"], [8, 11, "r"], [9, 11, "b"], [9, 12, "S"]];
const BRIEF = [[5, 14, "k"], [6, 14, "k"], [7, 14, "k"], [5, 15, "n"], [6, 15, "k"], [7, 15, "n"], [6, 13, "B"]];
const WAVE_K = [[[6, 7, "C"], [7, 6, "C"], [7, 5, "S"]], [[6, 7, "C"], [7, 6, "C"], [8, 5, "S"]]];

export function makePerson(spec) {
    const kid = !!spec.kid, pal = palFor(spec);
    const H = kid ? K_HEAD : A_HEAD, Bd = kid ? K_BODY : A_BODY, Lg = kid ? K_LEGS : A_LEGS;
    const frames = [
        [...H, ...Bd.stand, ...Lg.stand],
        [...H, ...Bd.fwd, ...Lg.strideA],
        [...H, ...Bd.back, ...Lg.strideB],
    ];
    const hair = hairOver(spec, kid);
    const extra = (f) => [...hair, ...(spec.carry && !kid ? CARRY : []), ...(spec.brief && !kid && f !== 1 ? BRIEF : [])];
    const acts = kid ? WAVE_K : ACTS[spec.act] || [[], []];
    const all = [
        ...frames.map((rows, f) => ({ rows, over: extra(f) })),
        { rows: frames[0], over: [...hair, ...acts[0]] },
        { rows: frames[0], over: [...hair, ...acts[1]] },
    ];
    const R = all.map((fr) => art(fr.rows, pal, { over: fr.over }).cv);
    const L = all.map((fr) => art(fr.rows, pal, { over: fr.over, flip: true }).cv);
    const pad = 4, artW = kid ? 8 : 10, artH = H.length + Bd.stand.length + Lg.stand.length;
    return { R, L, ax: pad + artW / 2, ay: pad + artH - 1 };
}

// Someone sitting, facing right, feet at the bottom. pose: "rest" | "read" | "flip" | "peek" | "eat"
const SIT_BODY = ["...CCCC...", "..CCCCCC..", "..cCCCCCS.", "..cCCCCC..", "..PPPPPPPP", "..pPPPPPPP", "........PP", "........BBB"];
const PAPER = { read: { x: 7, y: 3, w: 6, h: 9 }, flip: { x: 7, y: 3, w: 3, h: 9 }, peek: { x: 7, y: 7, w: 6, h: 6 } };
export function makeSitter(spec, pose = "rest") {
    const pal = { ...palFor(spec), w: "#f6efe2", l: "#9a948a", R: "#e2553c", F: "#f3c23a", D: "#c89a6a" };
    const over = [...hairOver(spec, false)];
    if (PAPER[pose]) {
        const p = PAPER[pose];
        for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
            const edge = x === p.w - 1 || y === p.h - 1;
            over.push([p.x + x, p.y + y, edge ? "l" : (y % 2 === 1 && x > 0 && x < p.w - 1 && y > 1) ? "l" : "w"]);
        }
        over.push([p.x - 1, p.y + p.h - 2, "S"]);
    }
    if (pose === "eat") over.push([9, 10, "D"], [10, 10, "F"], [10, 9, "D"], [9, 9, "R"]);   // a sandwich
    return art([...A_HEAD, ...SIT_BODY], pal, { over }).cv;
}

// ── critters ────────────────────────────────────────────────────
export function makeDog() {
    const pal = { D: "#c07a3c", d: "#8a5226", L: "#e8b070", E: "#1a1210", N: "#1a1210", T: "#e2553c" };
    const head = ["......DD..", ".....DLDD.", ".....DDEDN", "......DDT."];
    const body = ["DDDDDDDD..", "dDLLLDDd..", ".dDDDDd..."];
    const legsA = [".D.D.D.D..", ".d.d.d.d.."], legsB = ["D..DD..D..", "d..dd..d.."];
    const tail = [[-1, 3, "D"], [-2, 2, "D"]], tail2 = [[-1, 4, "D"], [-2, 4, "D"]];
    const mk = (legs, t, flip) => art([...head, ...body, ...legs], pal, { over: t, flip }).cv;
    const R = [mk(legsA, tail), mk(legsB, tail2), mk(legsA, tail2)], L = [mk(legsA, tail, true), mk(legsB, tail2, true), mk(legsA, tail2, true)];
    return { R: [R[0], R[1], R[2], R[0], R[0]], L: [L[0], L[1], L[2], L[0], L[0]], ax: 4 + 5, ay: 4 + 8 };
}

export function makeCat() {
    // a tuxedo cat sitting on the roof ridge; three tail positions and a blink
    const pal = { k: "#2e2a36", K: "#46404f", w: "#f2eee6", Y: "#f3c23a", p: "#f08a9a" };
    const rows = [
        ".k...k....",
        ".kK.Kk....",
        ".kKKKk....",
        ".kYKYk....",
        ".kKpKk....",
        "..wwwk....",
        ".kwwwKk...",
        ".kwwKKKk..",
        ".kwwKKKKk.",
        "..kkkkkk..",
    ];
    const tails = [[[8, 7, "k"], [9, 6, "k"], [9, 5, "k"], [9, 4, "k"], [8, 3, "k"]], [[8, 8, "k"], [9, 7, "k"], [10, 6, "k"], [10, 5, "k"], [10, 4, "k"]], [[8, 8, "k"], [9, 8, "k"], [10, 7, "k"], [11, 6, "k"], [11, 5, "k"]]];
    const frames = tails.map((t) => art(rows, pal, { over: t }).cv);
    const blink = art(rows, pal, { over: [...tails[0], [2, 3, "k"], [4, 3, "k"]] }).cv;
    return { frames, blink, ax: 4 + 5, ay: 4 + 9 };
}

export function makeDuck(kind = "mallard") {
    const pal = kind === "mallard" ? { G: "#2f8a4a", g: "#1f6a3a", E: "#1a1210", O: "#f39a2c", W: "#f4f1ea", w: "#c9c4b8", B: "#8a6a4a", n: "#ffffff" }
        : { G: "#a07a50", g: "#7a5a3a", E: "#1a1210", O: "#f39a2c", W: "#c8a070", w: "#9a784e", B: "#7a5a3a", n: "#c8a070" };
    const rows = ["......GG..", ".....GGEG.", ".....nGGOO", "W....wWW..", "WWWBBBWWW.", ".wWWWWWWw.", "..wwwwww.."];
    const dip = ["..........", "..........", "......GG..", "W....GGEGO", "WWWBBBWWWO", ".wWWWWWWw.", "..wwwwww.."];
    const R = [art(rows, pal).cv, art(dip, pal).cv], L = [art(rows, pal, { flip: true }).cv, art(dip, pal, { flip: true }).cv];
    return { R, L, ax: 4 + 5, ay: 4 + 5 };
}
export function makeDuckling() {
    const pal = { Y: "#f6d24a", y: "#d8a82a", O: "#f39a2c", E: "#1a1210" };
    const rows = ["...YY.", "..YYEO", "Y.YYY.", "YYYYy.", ".yyy.."];
    return { R: [art(rows, pal).cv], L: [art(rows, pal, { flip: true }).cv], ax: 4 + 3, ay: 4 + 3 };
}
export function makePigeon() {
    const pal = { B: "#8a8fa8", b: "#6c7290", n: "#5aa88a", E: "#e2553c", O: "#3a3442", W: "#aeb3c8" };
    const stand = ["....bb.", "...bbEO", "..nnb..", "BBBBBb.", "bBBBBb.", ".O..O.."];
    const peck = [".......", ".......", "..nbbb.", "BBBBbEO", "bBBBBb.", ".O..O.."];
    const fly = ["W.....W", "WW...WW", ".WBBBW.", "..BBbEO", "..bbb..", "......."];
    const fly2 = [".......", ".......", "WWBBBWW", "W.BBbEO", "..bbb..", "......."];
    return { stand: art(stand, pal).cv, peck: art(peck, pal).cv, fly: [art(fly, pal).cv, art(fly2, pal).cv], ax: 4 + 3, ay: 4 + 5 };
}

// ── props ───────────────────────────────────────────────────────
export function makeBench() {
    const pal = { W: "#d8a060", w: "#a8703a", d: "#6e4426", m: "#3c3442", M: "#5c5466" };
    const rows = [
        "WWWWWWWWWWWWWWWWWWWWWW",
        "wwwwwwwwwwwwwwwwwwwwww",
        ".M..................M.",
        "WWWWWWWWWWWWWWWWWWWWWW",
        "wwwwwwwwwwwwwwwwwwwwww",
        ".M..................M.",
        ".M..................M.",
        "WWWWWWWWWWWWWWWWWWWWWW",
        "wwwwwwwwwwwwwwwwwwwwww",
        "dddddddddddddddddddddd",
        ".mm................mm.",
        ".mm................mm.",
        "mmmm..............mmmm",
    ];
    return { cv: art(rows, pal).cv, ax: 4 + 11, ay: 4 + 12, seatY: 7 };
}

export function makeLaundry() {
    // four things on a line, each with a light and a shadow side; two sway frames
    const items = {
        shirt: { pal: { R: "#e2553c", r: "#a8322a", W: "#f6efe2" }, rows: ["RR.W.RR", "RRRWRRR", "RRRRRRR", ".RRRRr.", ".RRRRr.", ".RRRRr.", ".rrrrr."] },
        jeans: { pal: { B: "#3a6cc8", b: "#24448a", Y: "#f3c23a" }, rows: ["BBBBBB", "BBYBBb", "BBBBBb", "BBb.Bb", "BBb.Bb", "BBb.Bb", "BBb.Bb", "bbb.bb"] },
        dress: { pal: { P: "#f08ac0", p: "#b85a8a", W: "#ffffff" }, rows: [".PP.PP.", ".PPPPp.", ".PWPPp.", "..PPp..", ".PPPPp.", "PPPPPPp", "PPPPPPp", "ppppppp"] },
        socks: { pal: { Y: "#f3c23a", y: "#c89a2a", R: "#e2553c" }, rows: ["YY.YY", "RR.RR", "YY.YY", "YY.YY", "YYy.YYy", "yyy.yyy"] },
    };
    const out = {};
    for (const [k, it] of Object.entries(items)) {
        const a = art(it.rows, it.pal);
        // second frame: the bottom half blown a pixel sideways
        const rows2 = it.rows.map((r, i) => (i >= Math.floor(it.rows.length / 2) ? "." + r : r));
        out[k] = { frames: [a.cv, art(rows2, it.pal).cv], w: Math.max(...it.rows.map((r) => r.length)), pad: 4 };
    }
    return out;
}

export function makeBalloon(color) {
    const pal = { B: color, b: shade(color, 0.72), W: "#ffffff", w: shade(color, 1.35) };
    const rows = [".BBB.", "BWwBB", "BwBBB", "BBBBb", "BBBBb", ".BBb.", "..b.."];
    return art(rows, pal).cv;
}

export function makeCCTV() {
    const pal = { W: "#e8ecf2", w: "#aeb7ce", d: "#7a84a2", K: "#1a1220", L: "#4a5a7a", R: "#ff3a2a" };
    const rows = ["...WWWWWW.", ".RwWWWWWWK", "..wwwwwwKL", "...ddddd..", "....d....."];
    return { R: art(rows, pal).cv, L: art(rows, pal, { flip: true }).cv, ax: 4 + 4, ay: 4 + 4 };
}

export function makeBasket() {
    const pal = { W: "#d8a060", w: "#a8703a", d: "#6e4426", R: "#e2553c", r: "#f6efe2", G: "#6cc04a" };
    const rows = ["..dddd..", ".d....d.", "rRrRrRrR", "WwWwWwWw", "wWwWwWwW", "WwWwWwWw", "dddddddd"];
    return art(rows, pal).cv;
}

// A Ferris wheel cabin: a striped canopy, posts, and whoever is riding.
// riders: list of { hair, skin }. you: the player's cabin gets a pennant.
export function makeCabin(color, riders = [], you = false) {
    const pal = { R: color, r: shade(color, 0.72), W: shade(color, 1.45), m: "#5c5466", M: "#9aa3b8", B: color, b: shade(color, 0.62), w: "#f6efe2",
        h: riders[0] ? riders[0].hair : "#000", S: riders[0] ? riders[0].skin : "#000", H: riders[1] ? riders[1].hair : "#000", T: riders[1] ? riders[1].skin : "#000",
        E: "#1a1210", Y: "#f3c23a", y: "#c89a2a", F: "#e2553c", G: "#1c1410", g: "#2a2a2a" };
    const rows = [
        "....MM....",
        "...wRRw...",
        ".wRRwRRwR.",
        "RRwRRwRRwR",
        "rrrrrrrrrr",
        ".m......m.",
        ".m......m.",
        ".m......m.",
        "BBBBBBBBBB",
        "BWBBBBBBBb",
        "bBBBBBBBBb",
        ".bbbbbbbb.",
    ];
    const over = [];
    if (riders[0]) over.push([2, 5, "h"], [3, 5, "h"], [4, 5, "h"], [2, 6, "h"], [3, 6, "S"], [4, 6, "S"], [3, 7, "S"], [4, 7, "E"]);
    if (riders[1]) over.push([5, 5, "H"], [6, 5, "H"], [7, 5, "H"], [5, 6, "T"], [6, 6, "T"], [7, 6, "H"], [5, 7, "E"], [6, 7, "T"]);
    if (you) {   // a curly head with glasses, and a flag on top
        over.length = 0;
        over.push([2, 5, "G"], [3, 4, "G"], [4, 4, "G"], [5, 4, "G"], [6, 4, "G"], [7, 5, "G"], [2, 6, "G"], [3, 5, "G"], [4, 5, "G"], [5, 5, "G"], [6, 5, "G"],
            [3, 6, "g"], [4, 6, "g"], [5, 6, "g"], [6, 6, "g"], [7, 6, "G"], [3, 7, "S"], [4, 7, "S"], [5, 7, "S"], [6, 7, "S"]);
        pal.S = "#dcae8a";
        over.push([5, -1, "m"], [5, -2, "m"], [5, -3, "m"], [6, -3, "F"], [7, -3, "F"], [8, -2, "F"], [6, -2, "F"], [7, -2, "F"]);
    }
    return { cv: art(rows, pal, { over }).cv, ax: 4 + 5, ay: 4 };
}
