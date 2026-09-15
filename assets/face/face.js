/* ─────────────────────────────────────────────────────────────
   A drawn caricature of Amogh: big hair, big square glasses.
   Everything expressive is a live parameter — brows, lids, mouth,
   head tilt, and pupils that track a point on the screen.

   const face = createFace(el);
   face.setExpression("amused");
   face.lookAt(clientX, clientY);
   ───────────────────────────────────────────────────────────── */

const VB = { w: 360, h: 400 };

// browY: negative = raised. eyeOpen: 1 = wide. mouthCurve: bigger = happier.
const EXPRESSIONS = {
    resting: { browL: 0, browR: 0, eyeOpen: 1.0, curve: 6, open: 1, width: 28, skew: 0, tilt: 0 },
    curious: { browL: -14, browR: -9, eyeOpen: 1.08, curve: 9, open: 5, width: 25, skew: 3, tilt: -4 },
    amused: { browL: -8, browR: -8, eyeOpen: 0.72, curve: 26, open: 15, width: 36, skew: 0, tilt: 3 },
    wry: { browL: -13, browR: 5, eyeOpen: 0.86, curve: 12, open: 2, width: 30, skew: 10, tilt: 4 },
    direct: { browL: 8, browR: 8, eyeOpen: 1.04, curve: -3, open: 0, width: 24, skew: 0, tilt: 0 },
    warm: { browL: -6, browR: -5, eyeOpen: 0.9, curve: 20, open: 7, width: 33, skew: -3, tilt: -2 },
};

export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS);

// The hair is the biggest thing about him, so it gets drawn twice: a mass behind
// the head, and a fringe of curls falling over the forehead.
const HAIR_BACK = [
    [180, 118, 82], [112, 140, 58], [248, 140, 58], [86, 186, 42], [274, 186, 42],
    [138, 88, 52], [222, 88, 52], [180, 76, 46], [96, 232, 30], [264, 232, 30],
];
const HAIR_FRONT = [
    [124, 132, 28], [160, 120, 30], [202, 120, 30], [238, 134, 27],
    [104, 158, 22], [256, 158, 22], [142, 142, 20], [220, 142, 20], [181, 138, 18],
];

const svg = (s) => s.replace(/\s+/g, " ").trim();

function markup(id) {
    return svg(`
    <svg class="face-svg" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="A drawn caricature of Amogh Bajpai">
      <defs>
        <clipPath id="eyeL-${id}"><ellipse cx="141" cy="207" rx="20" ry="14"/></clipPath>
        <clipPath id="eyeR-${id}"><ellipse cx="219" cy="207" rx="20" ry="14"/></clipPath>
      </defs>

      <!-- shoulders, jacket and the printed collar -->
      <path class="f-coat" d="M28 400 C 44 340 106 316 180 316 C 254 316 316 340 332 400 Z"/>
      <path class="f-shirt" d="M152 318 C 160 356 200 356 208 318 L 196 312 L 180 336 L 164 312 Z"/>
      <path class="f-coat-line" d="M150 320 L 180 396 M210 320 L 180 396"/>
      <rect class="f-neck" x="156" y="276" width="48" height="50" rx="18"/>

      <g id="head-${id}">
        <!-- hair behind the head -->
        <g class="f-hair">${HAIR_BACK.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>

        <!-- ears -->
        <ellipse class="f-skin f-line" cx="97" cy="216" rx="13" ry="20"/>
        <ellipse class="f-skin f-line" cx="263" cy="216" rx="13" ry="20"/>

        <!-- face -->
        <path class="f-skin f-line" d="M98 190 C 98 136 130 116 180 116 C 230 116 262 136 262 190
              C 262 242 248 282 214 298 C 198 306 162 306 146 298 C 112 282 98 242 98 190 Z"/>
        <path class="f-stubble" d="M112 232 C 118 278 146 302 180 302 C 214 302 242 278 248 232
              C 244 276 214 292 180 292 C 146 292 116 276 112 232 Z"/>

        <!-- the fringe, falling over the forehead -->
        <g class="f-hair">${HAIR_FRONT.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>

        <!-- brows, heavy -->
        <path id="browL-${id}" class="f-brow" d="M112 182 Q 139 170 166 180"/>
        <path id="browR-${id}" class="f-brow" d="M194 180 Q 221 170 248 182"/>

        <!-- eyes -->
        <ellipse class="f-eye" cx="141" cy="207" rx="20" ry="14"/>
        <ellipse class="f-eye" cx="219" cy="207" rx="20" ry="14"/>
        <g clip-path="url(#eyeL-${id})">
          <circle id="pupilL-${id}" class="f-pupil" cx="141" cy="207" r="8"/>
          <rect id="lidL-${id}" class="f-skin" x="119" y="174" width="44" height="22"/>
        </g>
        <g clip-path="url(#eyeR-${id})">
          <circle id="pupilR-${id}" class="f-pupil" cx="219" cy="207" r="8"/>
          <rect id="lidR-${id}" class="f-skin" x="197" y="174" width="44" height="22"/>
        </g>
        <ellipse class="f-eye-line" cx="141" cy="207" rx="20" ry="14"/>
        <ellipse class="f-eye-line" cx="219" cy="207" rx="20" ry="14"/>

        <!-- the glasses, oversized on purpose -->
        <g class="f-specs">
          <rect x="102" y="184" width="76" height="52" rx="9"/>
          <rect x="182" y="184" width="76" height="52" rx="9"/>
          <path d="M178 198 L 182 198"/>
          <path d="M102 196 L 86 204"/>
          <path d="M258 196 L 274 204"/>
        </g>

        <!-- nose and mouth -->
        <path class="f-nose" d="M182 216 C 179 236 174 246 181 252 C 187 256 194 253 196 248"/>
        <path class="f-stache" d="M156 262 Q 180 254 204 262"/>
        <path id="mouth-${id}" class="f-mouth" d="M154 274 Q 180 284 206 274"/>
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
        pupilL: q("pupilL"), pupilR: q("pupilR"), lidL: q("lidL"), lidR: q("lidR"), mouth: q("mouth"),
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const state = { ...EXPRESSIONS.resting, gx: 0, gy: 0, blink: 1 };
    const target = { ...state };
    let blinkAt = performance.now() + 2200;
    let blinkPhase = 0;
    let raf = null;

    function setExpression(name) {
        const e = EXPRESSIONS[name] || EXPRESSIONS.resting;
        Object.assign(target, e);
    }

    // Point the eyes at a page coordinate.
    function lookAt(clientX, clientY) {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const cx = r.left + r.width * 0.5;
        const cy = r.top + r.height * 0.5;
        target.gx = Math.max(-1, Math.min(1, (clientX - cx) / (r.width * 1.5)));
        target.gy = Math.max(-1, Math.min(1, (clientY - cy) / (r.height * 1.6)));
    }

    function render(now) {
        raf = requestAnimationFrame(render);

        for (const k of ["browL", "browR", "eyeOpen", "curve", "open", "width", "skew", "tilt", "gx", "gy"]) {
            state[k] += (target[k] - state[k]) * (k === "gx" || k === "gy" ? 0.18 : 0.09);
        }

        // Blink: quick close, quick open, at human-ish intervals.
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

        // Brows ride above the glasses; negative browY is raised.
        refs.browL.setAttribute("d", `M112 ${182 + state.browL} Q 139 ${170 + state.browL * 1.3} 166 ${180 + state.browL * 0.6}`);
        refs.browR.setAttribute("d", `M194 ${180 + state.browR * 0.6} Q 221 ${170 + state.browR * 1.3} 248 ${182 + state.browR}`);

        // Pupils move inside the eye; the clip keeps them from escaping.
        const px = state.gx * 9.5, py = state.gy * 6;
        refs.pupilL.setAttribute("cx", (141 + px).toFixed(2));
        refs.pupilL.setAttribute("cy", (207 + py).toFixed(2));
        refs.pupilR.setAttribute("cx", (219 + px).toFixed(2));
        refs.pupilR.setAttribute("cy", (207 + py).toFixed(2));

        // Lids drop from above the eye.
        const lidY = 193 - 29 + (1 - openness) * 29;
        refs.lidL.setAttribute("y", lidY.toFixed(2));
        refs.lidR.setAttribute("y", lidY.toFixed(2));

        // Mouth: a curve that opens into a shape when he grins.
        const w = state.width, c = state.curve, o = state.open, sk = state.skew;
        const x0 = 180 - w, x1 = 180 + w, y0 = 274 + sk * 0.4, y1 = 274 - sk * 0.4;
        const d = o > 0.6
            ? `M${x0} ${y0} Q 180 ${274 + c} ${x1} ${y1} Q 180 ${274 + c - o * 1.9} ${x0} ${y0} Z`
            : `M${x0} ${y0} Q 180 ${274 + c} ${x1} ${y1}`;
        refs.mouth.setAttribute("d", d);
        refs.mouth.classList.toggle("is-open", o > 0.6);
    }

    setExpression(opts.expression || "resting");
    Object.assign(state, EXPRESSIONS[opts.expression || "resting"]);
    raf = requestAnimationFrame(render);

    return {
        el,
        setExpression,
        lookAt,
        destroy() { cancelAnimationFrame(raf); el.innerHTML = ""; },
    };
}
