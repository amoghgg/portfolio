/* ─────────────────────────────────────────────────────────────
   Amogh as a drawn character, from his own photographs: round face,
   tight curls that rise and taper at the sides, heavy black glasses,
   light stubble, silver chain, oversized tee — and the Devanagari
   tattoo on his left forearm.

   Head, torso and two jointed arms. Hand targets are solved with
   two-bone inverse kinematics, so elbows bend the way elbows bend.

       const face = createFace(el, { expression: "curious", pose: "think" });
       face.setExpression("amused");   face.setPose("camera");
       face.lookAt(clientX, clientY);  face.duck(true);   // peek-a-boo
   ───────────────────────────────────────────────────────────── */

const VB = { w: 360, h: 560 };

// browL/browR: negative = raised, positive = furrowed.
// eyeOpen: 1 = normal. curve: mouth corners up. open: lips apart. skew: one-sided.
const EXPRESSIONS = {
    resting: { browL: 0, browR: 0, eyeOpen: 1.0, curve: 5, open: 0, width: 25, skew: 2, tilt: 0 },
    curious: { browL: -13, browR: -8, eyeOpen: 1.08, curve: 7, open: 3, width: 24, skew: 3, tilt: -4 },
    amused: { browL: -7, browR: -7, eyeOpen: 0.7, curve: 24, open: 13, width: 34, skew: 0, tilt: 3 },
    wry: { browL: -12, browR: 5, eyeOpen: 0.85, curve: 11, open: 1, width: 29, skew: 11, tilt: 4 },
    direct: { browL: 7, browR: 7, eyeOpen: 1.04, curve: -2, open: 0, width: 23, skew: 0, tilt: 0 },
    warm: { browL: -5, browR: -4, eyeOpen: 0.9, curve: 18, open: 5, width: 32, skew: -3, tilt: -2 },
    dazzled: { browL: 6, browR: 6, eyeOpen: 0.42, curve: 9, open: 2, width: 27, skew: 0, tilt: -2 },
    amazed: { browL: -17, browR: -17, eyeOpen: 1.25, curve: 10, open: 16, width: 26, skew: 0, tilt: -1 },
    unsettled: { browL: -14, browR: 8, eyeOpen: 1.2, curve: -8, open: 4, width: 22, skew: 4, tilt: 5 },
    talking: { browL: -6, browR: -4, eyeOpen: 1.0, curve: 6, open: 19, width: 24, skew: 0, tilt: -2 },
    question: { browL: -22, browR: -22, eyeOpen: 1.15, curve: 4, open: 2, width: 24, skew: 0, tilt: -2 },
    flattened: { browL: 1, browR: 1, eyeOpen: 0.98, curve: 1, open: 0, width: 24, skew: 0, tilt: 0 },
};

export const EXPRESSION_NAMES = ["resting", "curious", "amused", "wry", "direct", "warm"];

const HAIR_BACK = [
    [180, 104, 60], [134, 116, 46], [226, 116, 46], [104, 152, 36], [256, 152, 36],
    [150, 88, 40], [210, 88, 40], [92, 190, 26], [268, 190, 26], [180, 82, 44],
    [116, 178, 28], [244, 178, 28], [98, 216, 18], [262, 216, 18],
];
const HAIR_FRONT = [
    [128, 132, 26], [162, 120, 27], [200, 120, 27], [234, 134, 25],
    [110, 158, 21], [250, 158, 21], [145, 140, 18], [216, 140, 18],
    [181, 136, 16], [122, 186, 16], [240, 186, 16],
];

// Skeleton. L and R are as the viewer sees them, so L is his right arm.
const SHOULDER = { L: [96, 398], R: [264, 398] };
const UPPER = 86, FORE = 84;
const REST = { L: [82, 552], R: [278, 552] };

// Wrist targets: [x, y, wrist rotation, hand shape]
const POSES = {
    none:    { L: null, R: null },
    think:   { L: null, R: [230, 320, -34, "fist"] },                       // knuckles under the chin
    sign:    { L: null, R: [274, 256, -12, "point"] },                      // a question, held up
    palms:   { L: [86, 296, -22, "open"], R: [274, 296, 22, "open"] },      // both palms up
    clap:    { L: [166, 372, 62, "open"], R: [194, 372, -62, "open"] },
    wave:    { L: null, R: [292, 248, 16, "open"] },
    point:   { L: null, R: [286, 240, 2, "point"] },
    level:   { L: null, R: [282, 336, -88, "open"] },
    swipe:   { L: null, R: [300, 288, 34, "open"] },
    camera:  { L: [148, 424, 6, "fist"], R: [214, 424, -6, "fist"] },
    letter:  { L: null, R: [204, 408, -6, "fist"] },
};

export const POSE_NAMES = Object.keys(POSES);

const HAND_SHAPES = {
    open: '<g><rect x="-14" y="-38" width="10" height="30" rx="5" transform="rotate(-8 -9 -8)"/>' +
          '<rect x="-5" y="-42" width="10" height="34" rx="5"/>' +
          '<rect x="4" y="-40" width="10" height="32" rx="5" transform="rotate(5 9 -8)"/>' +
          '<rect x="13" y="-33" width="10" height="26" rx="5" transform="rotate(13 18 -8)"/>' +
          '<rect x="-21" y="-11" width="11" height="22" rx="5.5" transform="rotate(-42 -15 0)"/>' +
          '<path d="M-19 -10 C -19 -17 19 -17 19 -10 L 19 13 C 19 24 -19 24 -19 13 Z"/></g>',
    fist: '<g><path d="M-20 17 C -26 -5 -16 -23 0 -23 C 16 -23 26 -5 20 17 C 13 29 -13 29 -20 17 Z"/>' +
          '<path class="f-knuckle" d="M-12 -8 L 12 -8 M-12 1 L 12 1"/></g>',
    point: '<g><rect x="-6" y="-52" width="13" height="38" rx="6.5"/>' +
           '<path d="M-19 16 C -25 -1 -16 -18 0 -18 C 16 -18 25 -1 19 16 C 12 28 -12 28 -19 16 Z"/></g>',
    relax: '<g><path d="M-16 14 C -21 -4 -13 -19 0 -19 C 13 -19 21 -4 16 14 C 10 25 -10 25 -16 14 Z"/></g>',
};

const armMarkup = (side, id) => `
  <g id="arm${side}-${id}" class="f-arm">
    <path id="upper${side}-${id}" class="f-upperarm"/>
    <path id="fore${side}-${id}" class="f-forearm"/>
    ${side === "R" ? `<g id="ink-${id}" class="f-ink"><image href="/assets/face/tattoo.png" x="-26" y="-9" width="52" height="22"/></g>` : ""}
    <path id="sleeve${side}-${id}" class="f-sleeve"/>
  </g>`;

const handMarkup = (side, id) => `
  <g id="hand${side}-${id}" class="f-hand">
    ${Object.entries(HAND_SHAPES).map(([name, d]) =>
        `<g class="f-hand-shape" data-shape="${name}" opacity="${name === "relax" ? 1 : 0}">${d}</g>`).join("")}
  </g>`;

const svg = (s) => s.replace(/\s+/g, " ").trim();

function markup(id) {
    return svg(`
    <svg class="face-svg" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="A drawn character of Amogh Bajpai">
      <defs>
        <clipPath id="eyeL-${id}"><ellipse cx="142" cy="209" rx="18" ry="12.5"/></clipPath>
        <clipPath id="eyeR-${id}"><ellipse cx="218" cy="209" rx="18" ry="12.5"/></clipPath>
      </defs>

      <g id="body-${id}" class="f-body">
      <g id="breathe-${id}">

      <!-- torso in the oversized tee -->
      <path class="f-neck" d="M152 268 L 152 318 C 152 332 208 332 208 318 L 208 268 Z"/>
      <path class="f-neck-shade" d="M152 268 L 208 268 L 208 286 C 190 300 170 300 152 286 Z"/>
      <path class="f-tee" d="M78 560 C 74 476 70 424 86 394 C 104 358 136 334 156 326
            C 166 348 194 348 204 326 C 224 334 256 358 274 394 C 290 424 286 476 282 560 Z"/>
      <path class="f-tee-fold" d="M112 560 C 108 484 106 434 116 404 M248 560 C 252 484 254 434 244 404"/>
      <path class="f-chain" d="M154 322 C 166 356 194 356 206 322"/>
      <circle class="f-chain-drop" cx="180" cy="355" r="3.6"/>

      ${armMarkup("L", id)}
      ${armMarkup("R", id)}

      <!-- props ride between the hands -->
      <g class="f-prop f-prop-camera">
        <path class="f-prop-strap" d="M140 392 C 158 356 206 356 224 392"/>
        <rect x="140" y="396" width="82" height="52" rx="8"/>
        <rect x="162" y="386" width="24" height="12" rx="4"/>
        <circle class="f-prop-lens" cx="181" cy="422" r="19"/>
        <circle class="f-prop-glass" cx="181" cy="422" r="9"/>
        <circle class="f-prop-shutter" cx="212" cy="392" r="4"/>
      </g>
      <g class="f-prop f-prop-letter">
        <rect x="186" y="378" width="70" height="48" rx="4"/>
        <path class="f-prop-fold" d="M186 380 L 221 406 L 256 380"/>
      </g>

      <g class="f-headscale" transform="translate(10.8 16.8) scale(0.94)">
      <g id="head-${id}">
        <!-- curls behind the head -->
        <g class="f-hair">${HAIR_BACK.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>

        <ellipse class="f-skin f-line" cx="97" cy="218" rx="12" ry="19"/>
        <ellipse class="f-skin f-line" cx="263" cy="218" rx="12" ry="19"/>

        <!-- a round, full face: wide cheeks, soft jaw, rounded chin -->
        <path class="f-skin f-line" d="M96 196 C 96 142 130 120 180 120 C 230 120 264 142 264 196
              C 264 240 254 272 232 290 C 216 303 196 310 180 310 C 164 310 144 303 128 290
              C 106 272 96 240 96 196 Z"/>
        <path class="f-jaw" d="M133 286 C 148 300 212 300 227 286"/>

        <!-- stubble along the jaw, and the little patch under the lip -->
        <path class="f-stubble" d="M112 238 C 120 286 148 306 180 306 C 212 306 240 286 248 238
              C 242 282 212 296 180 296 C 148 296 118 282 112 238 Z"/>
        <path class="f-stubble" d="M166 278 C 172 288 188 288 194 278 C 190 272 170 272 166 278 Z"/>

        <!-- curls over the forehead -->
        <g class="f-hair">${HAIR_FRONT.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>

        <path id="browL-${id}" class="f-brow" d="M116 174 Q 142 166 168 172"/>
        <path id="browR-${id}" class="f-brow" d="M192 172 Q 218 166 244 174"/>

        <ellipse class="f-eye" cx="142" cy="209" rx="18" ry="12.5"/>
        <ellipse class="f-eye" cx="218" cy="209" rx="18" ry="12.5"/>
        <g clip-path="url(#eyeL-${id})">
          <circle id="pupilL-${id}" class="f-pupil" cx="142" cy="209" r="7.6"/>
          <circle class="f-spark" cx="145" cy="205" r="2.2"/>
          <rect id="lidL-${id}" class="f-skin" x="120" y="176" width="44" height="22"/>
        </g>
        <g clip-path="url(#eyeR-${id})">
          <circle id="pupilR-${id}" class="f-pupil" cx="218" cy="209" r="7.6"/>
          <circle class="f-spark" cx="221" cy="205" r="2.2"/>
          <rect id="lidR-${id}" class="f-skin" x="196" y="176" width="44" height="22"/>
        </g>

        <!-- heavy black rectangular frames, flat across the top -->
        <g class="f-specs">
          <path class="f-specs-fill" d="M100 188 L 176 188 L 176 230 Q 176 236 170 236 L 106 236 Q 100 236 100 230 Z"/>
          <path class="f-specs-fill" d="M184 188 L 260 188 L 260 230 Q 260 236 254 236 L 190 236 Q 184 236 184 230 Z"/>
          <path d="M96 188 L 264 188"/>
          <path d="M176 200 L 184 200"/>
          <path d="M96 192 L 84 202"/>
          <path d="M264 192 L 276 202"/>
        </g>

        <path class="f-nose" d="M182 220 C 180 236 175 244 182 248 C 187 250 191 248 193 245"/>
        <path class="f-stache" d="M158 264 Q 180 257 202 264"/>
        <path id="mouth-${id}" class="f-mouth" d="M155 274 Q 180 283 205 274"/>
      </g>
      </g>

      ${handMarkup("L", id)}
      ${handMarkup("R", id)}

      </g>
      </g>
    </svg>`);
}

let uid = 0;

export function createFace(el, opts = {}) {
    const id = `f${++uid}`;
    el.innerHTML = markup(id);
    const q = (name) => el.querySelector(`#${name}-${id}`);
    const refs = {
        body: q("body"), breathe: q("breathe"), head: q("head"),
        browL: q("browL"), browR: q("browR"),
        pupilL: q("pupilL"), pupilR: q("pupilR"), lidL: q("lidL"), lidR: q("lidR"), mouth: q("mouth"),
        svg: el.querySelector(".face-svg"), ink: q("ink"),
        handL: q("handL"), handR: q("handR"),
        upperL: q("upperL"), upperR: q("upperR"),
        foreL: q("foreL"), foreR: q("foreR"),
        sleeveL: q("sleeveL"), sleeveR: q("sleeveR"),
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const base = opts.expression && EXPRESSIONS[opts.expression] ? opts.expression : "resting";
    const state = { ...EXPRESSIONS[base], gx: 0, gy: 0, blink: 1, duck: 0 };
    const target = { ...state };
    const wrist = {
        L: { x: REST.L[0], y: REST.L[1], r: 0, tx: REST.L[0], ty: REST.L[1], tr: 0 },
        R: { x: REST.R[0], y: REST.R[1], r: 0, tx: REST.R[0], ty: REST.R[1], tr: 0 },
    };
    let resting = base;
    let blinkAt = performance.now() + 2200;
    let blinkPhase = 0;
    let waving = false;
    let raf = null;

    function setExpression(name, { hold = false } = {}) {
        const e = EXPRESSIONS[name] || EXPRESSIONS.resting;
        if (hold) resting = name;
        Object.assign(target, e);
    }

    function setPose(name) {
        const pose = POSES[name] || POSES.none;
        waving = name === "wave";
        for (const side of ["L", "R"]) {
            const p = pose[side];
            const w = wrist[side];
            if (p) { w.tx = p[0]; w.ty = p[1]; w.tr = p[2]; }
            else { w.tx = REST[side][0]; w.ty = REST[side][1]; w.tr = 0; }
            const shape = p ? p[3] : "relax";
            refs[`hand${side}`].querySelectorAll(".f-hand-shape").forEach((g) =>
                g.setAttribute("opacity", g.dataset.shape === shape ? 1 : 0));
        }
    }

    function setProp(name) {
        refs.svg.classList.remove("has-camera", "has-letter");
        if (name) refs.svg.classList.add(`has-${name}`);
    }

    // Peek-a-boo: drop out of frame, or pop back up.
    function duck(on = true) { target.duck = on ? 1 : 0; }

    function react(name, ms = 1400) {
        setExpression(name);
        clearTimeout(react._t);
        react._t = setTimeout(() => setExpression(resting), ms);
    }

    function lookAt(clientX, clientY) {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const cx = r.left + r.width * 0.5;
        const cy = r.top + r.height * 0.34;
        target.gx = Math.max(-1, Math.min(1, (clientX - cx) / (r.width * 1.4)));
        target.gy = Math.max(-1, Math.min(1, (clientY - cy) / (r.height * 1.1)));
    }

    // Two-bone IK: given shoulder and wrist, find the elbow.
    function solveElbow(sx, sy, wx, wy, bend) {
        let dx = wx - sx, dy = wy - sy;
        let d = Math.hypot(dx, dy);
        const max = (UPPER + FORE) * 0.985;
        if (d > max) { const k = max / d; dx *= k; dy *= k; d = max; wx = sx + dx; wy = sy + dy; }
        if (d < 1) d = 1;
        const a = (UPPER * UPPER - FORE * FORE + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, UPPER * UPPER - a * a));
        const ux = dx / d, uy = dy / d;
        return [sx + ux * a - uy * h * bend, sy + uy * a + ux * h * bend, wx, wy];
    }

    function render(now) {
        raf = requestAnimationFrame(render);

        for (const k of ["browL", "browR", "eyeOpen", "curve", "open", "width", "skew", "tilt", "gx", "gy", "duck"]) {
            state[k] += (target[k] - state[k]) * (k === "gx" || k === "gy" ? 0.18 : k === "duck" ? 0.14 : 0.09);
        }

        if (!reduced) {
            if (blinkPhase === 0 && now > blinkAt) { blinkPhase = 1; blinkAt = now; }
            if (blinkPhase === 1) {
                const t = (now - blinkAt) / 90;
                state.blink = Math.max(0.06, 1 - t);
                if (t >= 1) { blinkPhase = 2; blinkAt = now; }
            } else if (blinkPhase === 2) {
                const t = (now - blinkAt) / 130;
                state.blink = Math.min(1, 0.06 + t);
                if (t >= 1) { blinkPhase = 0; blinkAt = now + 2600 + Math.random() * 4200; }
            }
        }

        // breathing, and the duck for peek-a-boo
        const breath = reduced ? 0 : Math.sin(now * 0.0016);
        refs.breathe.setAttribute("transform", `translate(0 ${(breath * 2.2).toFixed(2)}) scale(1 ${(1 + breath * 0.004).toFixed(4)})`);
        refs.body.setAttribute("transform", `translate(0 ${(state.duck * VB.h * 0.72).toFixed(1)})`);

        const openness = Math.max(0.04, state.eyeOpen * state.blink);
        refs.head.setAttribute("transform", `rotate(${state.tilt.toFixed(2)} 180 280)`);

        refs.browL.setAttribute("d", `M116 ${174 + state.browL} Q 142 ${166 + state.browL * 1.3} 168 ${172 + state.browL * 0.6}`);
        refs.browR.setAttribute("d", `M192 ${172 + state.browR * 0.6} Q 218 ${166 + state.browR * 1.3} 244 ${174 + state.browR}`);

        const px = state.gx * 8.5, py = state.gy * 5.5;
        refs.pupilL.setAttribute("cx", (142 + px).toFixed(2));
        refs.pupilL.setAttribute("cy", (209 + py).toFixed(2));
        refs.pupilR.setAttribute("cx", (218 + px).toFixed(2));
        refs.pupilR.setAttribute("cy", (209 + py).toFixed(2));

        const lidY = 196 - 30 + (1 - openness) * 30;
        refs.lidL.setAttribute("y", lidY.toFixed(2));
        refs.lidR.setAttribute("y", lidY.toFixed(2));

        const w = state.width, c = state.curve, o = state.open, sk = state.skew;
        const x0 = 180 - w, x1 = 180 + w, y0 = 274 + sk * 0.4, y1 = 274 - sk * 0.4;
        refs.mouth.setAttribute("d", o > 0.6
            ? `M${x0} ${y0} Q 180 ${274 + c} ${x1} ${y1} Q 180 ${274 + c - o * 1.9} ${x0} ${y0} Z`
            : `M${x0} ${y0} Q 180 ${274 + c} ${x1} ${y1}`);
        refs.mouth.classList.toggle("is-open", o > 0.6);

        // arms
        for (const side of ["L", "R"]) {
            const k = wrist[side];
            const wob = waving && side === "R" && !reduced ? Math.sin(now * 0.012) * 16 : 0;
            k.x += (k.tx - k.x) * 0.14;
            k.y += (k.ty - k.y) * 0.14;
            k.r += (k.tr + wob - k.r) * 0.2;

            const [sx, sy] = SHOULDER[side];
            const bend = side === "L" ? -1 : 1;
            const [ex, ey, wx, wy] = solveElbow(sx, sy, k.x, k.y, bend);

            refs[`upper${side}`].setAttribute("d", `M${sx} ${sy} L ${ex.toFixed(1)} ${ey.toFixed(1)}`);
            refs[`fore${side}`].setAttribute("d", `M${ex.toFixed(1)} ${ey.toFixed(1)} L ${wx.toFixed(1)} ${wy.toFixed(1)}`);
            // short sleeve over the top half of the upper arm
            refs[`sleeve${side}`].setAttribute("d",
                `M${sx} ${sy - 4} L ${(sx + (ex - sx) * 0.62).toFixed(1)} ${(sy + (ey - sy) * 0.62).toFixed(1)}`);

            const ang = Math.atan2(wy - ey, wx - ex) * 180 / Math.PI;
            refs[`hand${side}`].setAttribute("transform",
                `translate(${wx.toFixed(1)} ${wy.toFixed(1)}) rotate(${(ang + 90 + k.r).toFixed(1)})`);

            if (side === "R" && refs.ink) {
                const mx = ex + (wx - ex) * 0.52, my = ey + (wy - ey) * 0.52;
                refs.ink.setAttribute("transform", `translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${(ang + 90).toFixed(1)})`);
            }
        }
    }

    setPose(opts.pose || "none");
    if (opts.prop) setProp(opts.prop);
    raf = requestAnimationFrame(render);

    return { el, setExpression, setPose, setProp, react, lookAt, duck,
        destroy() { cancelAnimationFrame(raf); el.innerHTML = ""; } };
}
