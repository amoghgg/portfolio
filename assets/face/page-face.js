/* Wires the caricature into a paper page:
   - he watches the cursor, and looks back at the reader when it stops
   - hovering anything with data-face="<expression>" makes him react to it,
     so his face belongs to whatever you're reading
   - data-face-fx="pixel" additionally renders him in Game Boy green      */

import { createFace } from "/assets/face/face.js";

export function initPageFace({ selector = "#page-face", expression = "resting" } = {}) {
    const el = document.querySelector(selector);
    if (!el) return null;

    const face = createFace(el, { expression });
    face.setExpression(expression, { hold: true });

    let idle = null;
    window.addEventListener("pointermove", (e) => {
        face.lookAt(e.clientX, e.clientY);
        clearTimeout(idle);
        idle = setTimeout(() => face.lookAt(innerWidth / 2, innerHeight / 2), 2600);
    }, { passive: true });

    document.querySelectorAll("[data-face]").forEach((row) => {
        const enter = () => {
            face.setExpression(row.dataset.face);
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

    return face;
}
