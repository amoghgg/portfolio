# The caricature

`face.js` draws Amogh as vector art and animates it: brows, eyelids, mouth,
head tilt and pupils are all live parameters, so the eyes can follow a point on
the screen and the expression can change on the fly.

    import { createFace, EXPRESSION_NAMES } from "/assets/face/face.js";
    const face = createFace(el, { expression: "curious" });
    face.lookAt(clientX, clientY);
    face.setExpression("amused");

Expressions: resting, curious, amused, wry, direct, warm.

Colours come from CSS custom properties on `.face-art` (see `face.css`), so the
same drawing works on the dark landing page and the paper section pages.
`preview.html` renders every expression on both backgrounds.

No photograph of him is used anywhere on the site.
