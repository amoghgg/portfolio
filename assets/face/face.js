/* ─────────────────────────────────────────────────────────────
   A drawn caricature of Amogh, from his own photographs: a round
   face, tight curls that rise and taper at the sides, heavy black
   rectangular glasses, light stubble, a silver chain.

   Everything expressive is a live parameter — brows, lids, mouth,
   head tilt, and pupils that track a point on the screen.

       const face = createFace(el, { expression: "curious" });
       face.setExpression("amused");
       face.lookAt(clientX, clientY);
   ───────────────────────────────────────────────────────────── */

const VB = { w: 360, h: 400 };

// browL/browR: negative = raised, positive = furrowed.
// eyeOpen: 1 = normal. curve: mouth corners up. open: lips apart. skew: one-sided.
const EXPRESSIONS = {
    resting: { browL: 0, browR: 0, eyeOpen: 1.0, curve: 5, open: 0, width: 25, skew: 2, tilt: 0 },
    curious: { browL: -13, browR: -8, eyeOpen: 1.08, curve: 7, open: 3, width: 24, skew: 3, tilt: -4 },
    amused: { browL: -7, browR: -7, eyeOpen: 0.7, curve: 24, open: 13, width: 34, skew: 0, tilt: 3 },
    wry: { browL: -12, browR: 5, eyeOpen: 0.85, curve: 11, open: 1, width: 29, skew: 11, tilt: 4 },
    direct: { browL: 7, browR: 7, eyeOpen: 1.04, curve: -2, open: 0, width: 23, skew: 0, tilt: 0 },
    warm: { browL: -5, browR: -4, eyeOpen: 0.9, curve: 18, open: 5, width: 32, skew: -3, tilt: -2 },
    // reactions
    dazzled: { browL: 6, browR: 6, eyeOpen: 0.42, curve: 9, open: 2, width: 27, skew: 0, tilt: -2 },
    amazed: { browL: -17, browR: -17, eyeOpen: 1.25, curve: 10, open: 16, width: 26, skew: 0, tilt: -1 },
    unsettled: { browL: -14, browR: 8, eyeOpen: 1.2, curve: -8, open: 4, width: 22, skew: 4, tilt: 5 },
    talking: { browL: -6, browR: -4, eyeOpen: 1.0, curve: 6, open: 19, width: 24, skew: 0, tilt: -2 },
};

export const EXPRESSION_NAMES = ["resting", "curious", "amused", "wry", "direct", "warm"];

// The curls rise off the crown and taper down the sides, rather than ballooning
// into a circle. Back layer first, then the ones that fall over the forehead.
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


// Hands. Each pose places both hands: [x, y, rotation, shape] or null for "down".
// Shapes: open palm, fist, pointing index, flat palm.
// Only poses that work in a head-and-shoulders frame: the arm leaves the shoulder,
// passes behind him, and the hand comes forward no higher than his cheek.
const POSES = {
    none:    { L: null, R: null },
    think:   { L: null, R: [222, 296, -20, "fist"] },                        // knuckles at the chin
    sign:    { L: null, R: [292, 246, -6, "point"] },                        // a question, held beside his cheek
    palms:   { L: [62, 250, -20, "open"], R: [298, 250, 20, "open"] },       // both palms up
    clap:    { L: [150, 318, 60, "open"], R: [210, 318, -60, "open"] },      // hands together
    camera:  { L: [126, 334, -10, "fist"], R: [234, 334, 10, "fist"] },
    letter:  { L: null, R: [214, 322, -8, "fist"] },
};

export const POSE_NAMES = Object.keys(POSES);

const HAND_SHAPES = {
    // palm with four fanned fingers and a thumb — reads as a hand at small sizes
    open: '<g><rect x="-13" y="-34" width="9" height="26" rx="4.5" transform="rotate(-8 -9 -8)"/>' +
          '<rect x="-4.5" y="-38" width="9" height="30" rx="4.5"/>' +
          '<rect x="4" y="-36" width="9" height="28" rx="4.5" transform="rotate(5 8 -8)"/>' +
          '<rect x="12" y="-30" width="9" height="23" rx="4.5" transform="rotate(12 16 -8)"/>' +
          '<rect x="-19" y="-10" width="10" height="20" rx="5" transform="rotate(-42 -14 0)"/>' +
          '<path d="M-17 -10 C -17 -16 17 -16 17 -10 L 17 12 C 17 22 -17 22 -17 12 Z"/></g>',
    fist: '<g><path d="M-19 16 C -24 -4 -15 -21 0 -21 C 15 -21 24 -4 19 16 C 12 27 -12 27 -19 16 Z"/>' +
          '<path class="f-knuckle" d="M-11 -7 L 11 -7 M-11 1 L 11 1"/></g>',
    point: '<g><rect x="-6" y="-48" width="12" height="36" rx="6"/>' +
           '<path d="M-18 15 C -23 -1 -15 -16 0 -16 C 15 -16 23 -1 18 15 C 11 26 -11 26 -18 15 Z"/></g>',
};

const SHOULDER = { L: [112, 340], R: [248, 340] };

const armMarkup = (side, id) => `
  <g id="arm${side}-${id}" class="f-arm" opacity="0">
    <path id="armbare${side}-${id}" class="f-forearm" stroke="url(#armgrad${side}-${id})"/>
  </g>`;

const handMarkup = (side, id) => `
  <g id="hand${side}-${id}" class="f-hand" opacity="0">
    ${Object.entries(HAND_SHAPES).map(([name, d]) =>
        `<g class="f-hand-shape" data-shape="${name}" opacity="${name === "open" ? 1 : 0}">${d}</g>`).join("")}
  </g>`;

const svg = (s) => s.replace(/\s+/g, " ").trim();

function markup(id) {
    return svg(`
    <svg class="face-svg" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="A drawn caricature of Amogh Bajpai">
      <defs>
        <linearGradient id="armgradL-${id}" gradientUnits="userSpaceOnUse">
          <stop offset="0" class="f-stop-sleeve"/><stop offset="0.3" class="f-stop-sleeve"/>
          <stop offset="0.46" class="f-stop-skin"/><stop offset="1" class="f-stop-skin"/>
        </linearGradient>
        <linearGradient id="armgradR-${id}" gradientUnits="userSpaceOnUse">
          <stop offset="0" class="f-stop-sleeve"/><stop offset="0.3" class="f-stop-sleeve"/>
          <stop offset="0.46" class="f-stop-skin"/><stop offset="1" class="f-stop-skin"/>
        </linearGradient>
        <clipPath id="eyeL-${id}"><ellipse cx="142" cy="209" rx="18" ry="12.5"/></clipPath>
        <clipPath id="eyeR-${id}"><ellipse cx="218" cy="209" rx="18" ry="12.5"/></clipPath>
      </defs>

      <g class="f-figure" transform="translate(25.2 32.2) scale(0.86)">
      <!-- oversized tee and the chain he always wears -->
      <path class="f-tee" d="M22 400 C 40 344 104 320 180 320 C 256 320 320 344 338 400 Z"/>
      <path class="f-tee-neck" d="M143 324 C 155 350 205 350 217 324 C 205 332 155 332 143 324 Z"/>
      <path class="f-chain" d="M150 322 C 162 352 198 352 210 322"/>
      <circle class="f-chain-drop" cx="180" cy="351" r="3.4"/>
      <path class="f-neck" d="M152 272 L 152 314 C 152 326 208 326 208 314 L 208 272 Z"/>
      <path class="f-neck-shade" d="M152 272 L 208 272 L 208 288 C 190 300 170 300 152 288 Z"/>

      ${armMarkup("L", id)}
      ${armMarkup("R", id)}

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
      ${handMarkup("L", id)}
      ${handMarkup("R", id)}
      </g>

      <!-- props, shown by class on the wrapper -->
      <g class="f-prop f-prop-camera">
        <path class="f-prop-strap" d="M124 306 C 150 280 214 280 240 320"/>
        <rect x="132" y="306" width="96" height="58" rx="9"/>
        <rect x="156" y="296" width="26" height="12" rx="4"/>
        <circle class="f-prop-lens" cx="180" cy="335" r="22"/>
        <circle class="f-prop-glass" cx="180" cy="335" r="11"/>
        <circle class="f-prop-shutter" cx="216" cy="302" r="4"/>
      </g>
      <g class="f-prop f-prop-letter">
        <rect x="188" y="284" width="74" height="50" rx="4"/>
        <path class="f-prop-fold" d="M188 286 L 225 312 L 262 286"/>
      </g>
    </svg>`);
}

let uid = 0;

export function createFace(el, opts = {}) {
    const id = `f${++uid}`;
    el.innerHTML = markup(id);
    const q = (name) => el.querySelector(`#${name}-${id}`);
    const refs = {
        head: q("head"), browL: q("browL"), browR: q("browR"),
        handL: q("handL"), handR: q("handR"), svg: el.querySelector(".face-svg"),
        armL: q("armL"), armR: q("armR"),
        bareL: q("armbareL"), bareR: q("armbareR"),
        gradL: q("armgradL"), gradR: q("armgradR"),
        pupilL: q("pupilL"), pupilR: q("pupilR"), lidL: q("lidL"), lidR: q("lidR"), mouth: q("mouth"),
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const base = opts.expression && EXPRESSIONS[opts.expression] ? opts.expression : "resting";
    const HAND_REST = { L: [120, 372, 0], R: [240, 372, 0] };   // out of frame, below the shoulders
    const handState = { L: { x: 120, y: 372, r: 0, on: 0 }, R: { x: 240, y: 372, r: 0, on: 0 } };
    const handTarget = { L: { ...handState.L }, R: { ...handState.R } };

    const state = { ...EXPRESSIONS[base], gx: 0, gy: 0, blink: 1 };
    const target = { ...state };
    let resting = base;                 // what he returns to when a reaction ends
    let blinkAt = performance.now() + 2200;
    let blinkPhase = 0;
    let raf = null;

    function setExpression(name, { hold = false } = {}) {
        const e = EXPRESSIONS[name] || EXPRESSIONS.resting;
        if (hold) resting = name;
        Object.assign(target, e);
    }
    function setPose(name) {
        const pose = POSES[name] || POSES.none;
        for (const side of ["L", "R"]) {
            const p = pose[side];
            const t = handTarget[side];
            if (p) {
                t.x = p[0]; t.y = p[1]; t.r = p[2]; t.on = 1;
                refs[`hand${side}`].querySelectorAll(".f-hand-shape").forEach((g) =>
                    g.setAttribute("opacity", g.dataset.shape === p[3] ? 1 : 0));
            } else {
                t.x = HAND_REST[side][0]; t.y = HAND_REST[side][1]; t.r = 0; t.on = 0;
            }
        }
    }

    // Props ride along with the pose.
    function setProp(name) {
        refs.svg.classList.remove("has-camera", "has-letter");
        if (name) refs.svg.classList.add(`has-${name}`);
    }

    // A reaction that decays back to whatever he was doing before.
    function react(name, ms = 1400) {
        setExpression(name);
        clearTimeout(react._t);
        react._t = setTimeout(() => setExpression(resting), ms);
    }

    function lookAt(clientX, clientY) {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const cx = r.left + r.width * 0.5;
        const cy = r.top + r.height * 0.45;
        target.gx = Math.max(-1, Math.min(1, (clientX - cx) / (r.width * 1.4)));
        target.gy = Math.max(-1, Math.min(1, (clientY - cy) / (r.height * 1.5)));
    }

    function render(now) {
        raf = requestAnimationFrame(render);

        for (const k of ["browL", "browR", "eyeOpen", "curve", "open", "width", "skew", "tilt", "gx", "gy"]) {
            state[k] += (target[k] - state[k]) * (k === "gx" || k === "gy" ? 0.18 : 0.09);
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

        const openness = Math.max(0.04, state.eyeOpen * state.blink);

        refs.head.setAttribute("transform", `rotate(${state.tilt.toFixed(2)} 180 250)`);

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
        const d = o > 0.6
            ? `M${x0} ${y0} Q 180 ${274 + c} ${x1} ${y1} Q 180 ${274 + c - o * 1.9} ${x0} ${y0} Z`
            : `M${x0} ${y0} Q 180 ${274 + c} ${x1} ${y1}`;
        refs.mouth.setAttribute("d", d);
        refs.mouth.classList.toggle("is-open", o > 0.6);

        for (const side of ["L", "R"]) {
            const h = handState[side], t = handTarget[side];
            h.x += (t.x - h.x) * 0.12;
            h.y += (t.y - h.y) * 0.12;
            h.r += (t.r - h.r) * 0.12;
            h.on += (t.on - h.on) * 0.12;
            const el = refs[`hand${side}`];
            el.setAttribute("transform", `translate(${h.x.toFixed(1)} ${h.y.toFixed(1)}) rotate(${h.r.toFixed(1)})`);
            el.setAttribute("opacity", h.on.toFixed(3));

            // The arm follows: a sleeve at the shoulder, then a bare forearm to the wrist.
            const [sx, sy] = SHOULDER[side];
            const dx = h.x - sx, dy = h.y - sy;
            const len = Math.hypot(dx, dy) || 1;
            const bow = side === "L" ? -1 : 1;                       // elbow swings outward
            const cx2 = sx + dx * 0.5 + (-dy / len) * 26 * bow;
            const cy2 = sy + dy * 0.5 + (dx / len) * 26 * bow;
            refs[`bare${side}`].setAttribute("d", `M${sx} ${sy} Q ${cx2.toFixed(1)} ${cy2.toFixed(1)} ${h.x.toFixed(1)} ${h.y.toFixed(1)}`);
            const g = refs[`grad${side}`];
            g.setAttribute("x1", sx); g.setAttribute("y1", sy);
            g.setAttribute("x2", h.x.toFixed(1)); g.setAttribute("y2", h.y.toFixed(1));
            refs[`arm${side}`].setAttribute("opacity", h.on.toFixed(3));
        }
    }

    setPose(opts.pose || "none");
    if (opts.prop) setProp(opts.prop);
    raf = requestAnimationFrame(render);

    return {
        el,
        setExpression,
        setPose,
        setProp,
        react,
        lookAt,
        destroy() { cancelAnimationFrame(raf); el.innerHTML = ""; },
    };
}
