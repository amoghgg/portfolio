/* ─────────────────────────────────────────────────────────────
   A drawn caricature of Amogh, from his own photographs: a round
   face, tight curls that rise and taper at the sides, heavy black
   rectangular glasses, light stubble, a silver chain.

   Head and shoulders only. Hands were tried and cut: there is nowhere
   in this frame for a shoulder or an elbow, so a raised hand always
   read as detached.

   Everything expressive is a live parameter — brows, lids, mouth,
   head tilt, and pupils that track a point on the screen.

       const face = createFace(el, { expression: "curious" });
       face.setExpression("amused");
       face.lookAt(clientX, clientY);
   ───────────────────────────────────────────────────────────── */

const VB = { w: 360, h: 400 };

// browL/browR: negative = raised, positive = furrowed.
// eyeOpen: 1 = normal. curve: mouth corners up. open: lips apart. skew: one-sided.
// Every expression is a set of muscles, not a face:
//   browL/browR  negative = raised, positive = furrowed (asymmetry reads as thought)
//   eyeOpen      lid height        squint  cheek raise under the eye (a real smile squints)
//   curve/open   mouth corners and how far the lips part
//   skew         one corner higher than the other
//   tilt         head roll
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


const svg = (s) => s.replace(/\s+/g, " ").trim();

function markup(id) {
    return svg(`
    <svg class="face-svg" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="A drawn caricature of Amogh Bajpai">
      <defs>
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
          <rect id="lowL-${id}" class="f-skin f-lowlid" x="120" y="222" width="44" height="22"/>
        </g>
        <g clip-path="url(#eyeR-${id})">
          <circle id="pupilR-${id}" class="f-pupil" cx="218" cy="209" r="7.6"/>
          <circle class="f-spark" cx="221" cy="205" r="2.2"/>
          <rect id="lidR-${id}" class="f-skin" x="196" y="176" width="44" height="22"/>
          <rect id="lowR-${id}" class="f-skin f-lowlid" x="196" y="222" width="44" height="22"/>
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

      <!-- props, shown by class on the wrapper -->
    </svg>`);
}

let uid = 0;

export function createFace(el, opts = {}) {
    const id = `f${++uid}`;
    el.innerHTML = markup(id);
    const q = (name) => el.querySelector(`#${name}-${id}`);
    const refs = {
        head: q("head"), browL: q("browL"), browR: q("browR"),

        pupilL: q("pupilL"), pupilR: q("pupilR"), lidL: q("lidL"), lidR: q("lidR"),
        lowL: q("lowL"), lowR: q("lowR"), mouth: q("mouth"),
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const base = opts.expression && EXPRESSIONS[opts.expression] ? opts.expression : "resting";
    const state = { ...EXPRESSIONS[base], gx: 0, gy: 0, blink: 1, blinkR: 1 };
    const target = { ...state };
    // where the eyes are actually pointed, vs where the cursor is
    const look = { x: 0, y: 0, vx: 0, vy: 0 };
    let glanceAt = performance.now() + 3000;
    let lastPointerAt = 0;
    let idleFace = performance.now() + 9000;
    let resting = base;                 // what he returns to when a reaction ends
    let blinkAt = performance.now() + 2200;
    let blinkPhase = 0;
    let raf = null;

    function setExpression(name, { hold = false } = {}) {
        const e = EXPRESSIONS[name] || EXPRESSIONS.resting;
        if (hold) resting = name;
        Object.assign(target, e);
    }
    // Kept so pages can call them; the drawing is face-only.
    function setPose() {}
    function setProp() {}

    // A wink: one eye closes while that brow lifts, then it all comes back.
    function wink(side = "R", ms = 420) {
        const key = side === "L" ? "blink" : "blinkR";
        target[key] = 0.04;
        target[side === "L" ? "browL" : "browR"] -= 7;
        clearTimeout(wink._t);
        wink._t = setTimeout(() => {
            target[key] = 1;
            setExpression(resting);
        }, ms);
    }

    // Look somewhere that isn't the reader, briefly.
    function glance(dx = (Math.random() - 0.5) * 1.8, dy = (Math.random() - 0.5) * 1.2, ms = 900) {
        look.x = dx; look.y = dy;
        clearTimeout(glance._t);
        glance._t = setTimeout(() => { look.x = 0; look.y = 0; }, ms);
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
        look.x = Math.max(-1, Math.min(1, (clientX - cx) / (r.width * 1.4)));
        look.y = Math.max(-1, Math.min(1, (clientY - cy) / (r.height * 1.5)));
        const now = performance.now();
        // an eyebrow flash the first time someone moves after a while: hello
        if (now - lastPointerAt > 6000 && now > 2000) { react("curious", 700); glanceAt = now + 2600; }
        lastPointerAt = now;
        idleFace = now + 9000;
    }

    function render(now) {
        raf = requestAnimationFrame(render);

        for (const k of ["browL", "browR", "eyeOpen", "squint", "curve", "open", "width", "skew", "tilt"]) {
            state[k] += (target[k] - state[k]) * 0.09;
        }

        // Eyes move in saccades: a fast jump with a little overshoot, then stillness.
        // A spring gives that shape for free.
        if (!reduced) {
            const stiff = 0.42, damp = 0.62;
            look.vx = (look.vx + (look.x - state.gx) * stiff) * damp;
            look.vy = (look.vy + (look.y - state.gy) * stiff) * damp;
            state.gx += look.vx;
            state.gy += look.vy;
            // micro-drift, so the eyes are never dead still
            state.gx += Math.sin(now * 0.0013) * 0.004;
            state.gy += Math.cos(now * 0.0017) * 0.003;
        } else {
            state.gx += (look.x - state.gx) * 0.2;
            state.gy += (look.y - state.gy) * 0.2;
        }

        if (!reduced) {
            // blinks, both eyes unless one is winking
            if (blinkPhase === 0 && now > blinkAt) { blinkPhase = 1; blinkAt = now; }
            if (blinkPhase === 1) {
                const t = (now - blinkAt) / 90;
                state.blink = Math.max(0.06, 1 - t);
                if (t >= 1) { blinkPhase = 2; blinkAt = now; }
            } else if (blinkPhase === 2) {
                const t = (now - blinkAt) / 130;
                state.blink = Math.min(1, 0.06 + t);
                if (t >= 1) { blinkPhase = 0; blinkAt = now + 2400 + Math.random() * 4200; }
            }

            // when nobody is moving, he looks around the room and thinks
            if (now > glanceAt) {
                glance();
                glanceAt = now + 4000 + Math.random() * 7000;
                blinkAt = Math.min(blinkAt, now + 120);      // eyes blink as they jump
            }
            if (now > idleFace) {
                const idlers = ["thinking", "smirk", "curious", "reading", "resting"];
                react(idlers[Math.floor(Math.random() * idlers.length)], 2200 + Math.random() * 1800);
                idleFace = now + 7000 + Math.random() * 9000;
            }
        }
        state.blinkR += ((target.blinkR ?? 1) - state.blinkR) * 0.3;

        // the head turns a little towards whatever he's looking at
        refs.head.setAttribute("transform",
            `rotate(${(state.tilt + state.gx * 2.2).toFixed(2)} 180 250) translate(${(state.gx * 3).toFixed(1)} ${(state.gy * 1.6).toFixed(1)})`);

        refs.browL.setAttribute("d", `M116 ${174 + state.browL} Q 142 ${166 + state.browL * 1.3} 168 ${172 + state.browL * 0.6}`);
        refs.browR.setAttribute("d", `M192 ${172 + state.browR * 0.6} Q 218 ${166 + state.browR * 1.3} 244 ${174 + state.browR}`);

        const px = state.gx * 8.5, py = state.gy * 5.5;
        refs.pupilL.setAttribute("cx", (142 + px).toFixed(2));
        refs.pupilL.setAttribute("cy", (209 + py).toFixed(2));
        refs.pupilR.setAttribute("cx", (218 + px).toFixed(2));
        refs.pupilR.setAttribute("cy", (209 + py).toFixed(2));

        // Upper lids ride the gaze — look down and they follow, which is most of
        // what makes drawn eyes look alive. Lower lids rise with a real smile.
        const gazeLid = Math.max(0, state.gy) * 0.18;
        for (const [side, blink] of [["L", state.blink], ["R", Math.min(state.blink, state.blinkR)]]) {
            const openness = Math.max(0.03, state.eyeOpen * blink - gazeLid);
            refs[`lid${side}`].setAttribute("y", (196 - 30 + (1 - openness) * 30).toFixed(2));
            refs[`low${side}`].setAttribute("y", (222 - state.squint * 9).toFixed(2));
        }

        const w = state.width, c = state.curve, o = state.open, sk = state.skew;
        const x0 = 180 - w, x1 = 180 + w, y0 = 274 + sk * 0.4, y1 = 274 - sk * 0.4;
        refs.mouth.setAttribute("d", o > 0.6
            ? `M${x0} ${y0} Q 180 ${274 + c} ${x1} ${y1} Q 180 ${274 + c - o * 1.9} ${x0} ${y0} Z`
            : `M${x0} ${y0} Q 180 ${274 + c} ${x1} ${y1}`);
        refs.mouth.classList.toggle("is-open", o > 0.6);
    }

    raf = requestAnimationFrame(render);

    return {
        el,
        setExpression,
        wink,
        glance,
        setPose,
        setProp,
        react,
        lookAt,
        destroy() { cancelAnimationFrame(raf); el.innerHTML = ""; },
    };
}
