/* Wires the pixel sprite into a paper page, and gives him a voice:
   - he watches the cursor, and looks back at the reader when it stops
   - a speech box types out a line: the page's own line on arrival, then
     a line about whatever you hover or focus (data-say), with his mouth
     moving while it types, and data-face setting his face afterwards
   - click him and he winks and says something
   - data-face-fx="pixel" additionally renders him in Game Boy green      */

import { createFace } from "/assets/face/face.js?v=px7";

const QUIPS = [
    "That tickles.",
    "I'm forty pixels wide. Be gentle.",
    "Try the arrow keys. This is basically a game menu.",
    "Every pixel of me was placed by hand. Well, by code.",
    "Psst. Up, up, down, down, left, right, left, right, B, A.",
];

export function initPageFace({ selector = "#page-face", expression = "resting", say = "" } = {}) {
    const el = document.querySelector(selector);
    if (!el) return null;

    // Wrap him so the speech box can float above without moving the layout.
    const col = document.createElement("div");
    col.className = "face-col head-face";
    el.parentNode.insertBefore(col, el);
    col.appendChild(el);
    el.classList.remove("head-face");
    const box = document.createElement("div");
    box.className = "say";
    box.setAttribute("aria-live", "polite");
    box.innerHTML = '<span class="say-text"></span><span class="say-caret" aria-hidden="true">&#9660;</span>';
    col.prepend(box);
    const textEl = box.querySelector(".say-text");

    const face = createFace(el, { expression });
    face.setExpression(expression, { hold: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── the typewriter ──
    let typing = null, after = expression;
    function speak(text, faceAfter = expression) {
        if (!text) return;
        clearInterval(typing);
        after = faceAfter;
        box.classList.add("on");
        box.classList.remove("done");
        if (reduced) { textEl.textContent = text; box.classList.add("done"); face.setExpression(after); return; }
        let i = 0, flap = false;
        textEl.textContent = "";
        typing = setInterval(() => {
            i += 1;
            textEl.textContent = text.slice(0, i);
            if (i % 3 === 0) { flap = !flap; face.setExpression(flap ? "talking" : after); }
            if (i >= text.length) {
                clearInterval(typing);
                face.setExpression(after);
                box.classList.add("done");
            }
        }, 24);
    }

    // ── watching ──
    let idle = null, hide = null, ducked = false;
    const wake = () => {
        if (ducked) { face.duck(false); ducked = false; box.classList.remove("away"); }
        clearTimeout(hide);
        // Peek-a-boo: if the reader goes quiet, he drops out of frame and waits.
        hide = setTimeout(() => { face.duck(true); ducked = true; box.classList.add("away"); }, 16000);
    };
    window.addEventListener("pointermove", (e) => {
        face.lookAt(e.clientX, e.clientY);
        wake();
        clearTimeout(idle);
        idle = setTimeout(() => face.lookAt(innerWidth / 2, innerHeight / 2), 2600);
    }, { passive: true });
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("keydown", wake);
    wake();

    el.style.cursor = "pointer";
    let q = 0;
    el.addEventListener("click", () => { face.wink("R"); speak(QUIPS[q++ % QUIPS.length], expression); });

    document.querySelectorAll("[data-face], [data-say]").forEach((row) => {
        const enter = () => {
            if (row.dataset.say) speak(row.dataset.say, row.dataset.face || expression);
            else face.setExpression(row.dataset.face);
            if (row.dataset.faceFx) el.classList.add(`is-${row.dataset.faceFx}`);
        };
        const leave = () => {
            if (!row.dataset.say) face.setExpression(expression);
            el.classList.remove("is-pixel");
        };
        row.addEventListener("pointerenter", enter);
        row.addEventListener("focus", enter);
        row.addEventListener("pointerleave", leave);
        row.addEventListener("blur", leave);
    });

    // Lores mode (the Konami code in site.js) recolours him.
    document.addEventListener("lores", () => face.recolor && face.recolor());

    setTimeout(() => speak(say, expression), reduced ? 0 : 700);
    return Object.assign(face, { speak });
}
