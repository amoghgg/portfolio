/* Wires the pixel sprite into a paper page:
   - he watches the cursor, and looks back at the reader when it stops
   - hovering or focusing something with data-face changes his face
   - click him and he winks and laughs
   - data-face-fx="pixel" additionally renders him in Game Boy green      */

import { createFace } from "/assets/face/face.js?v=px8";

export function initPageFace({ selector = "#page-face", expression = "resting", say = "" } = {}) {
    const el = document.querySelector(selector);
    if (!el) return null;

    const face = createFace(el, { expression });
    face.setExpression(expression, { hold: true });

    // ── watching ──
    let idle = null, hide = null, ducked = false;
    const wake = () => {
        if (ducked) { face.duck(false); ducked = false; }
        clearTimeout(hide);
        // Peek-a-boo: if the reader goes quiet, he drops out of frame and waits.
        hide = setTimeout(() => { face.duck(true); ducked = true; }, 16000);
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
    el.addEventListener("click", () => { face.wink("R"); face.react("laughing", 1400); });

    document.querySelectorAll("[data-face]").forEach((row) => {
        const enter = () => {
            if (row.dataset.face) face.setExpression(row.dataset.face);
            if (row.dataset.faceFx) el.classList.add(`is-${row.dataset.faceFx}`);
        };
        const leave = () => {
            face.setExpression(expression);
            el.classList.remove("is-pixel");
        };
        row.addEventListener("pointerenter", enter);
        row.addEventListener("focus", enter);
        row.addEventListener("pointerleave", leave);
        row.addEventListener("blur", leave);
    });

    // Lores mode (the Konami code in site.js) recolours him.
    document.addEventListener("lores", () => face.recolor && face.recolor());

    return face;
}
