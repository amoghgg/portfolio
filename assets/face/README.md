# The sprite

`face.js` draws Amogh as a 48 × 54 pixel-art sprite in a `<canvas>`, scaled up
with hard edges, drawn from his photo: a big wide cloud of curls, a round full
face, thick straight brows, chunky black double-bridge glasses, full lips,
light stubble, a light blue checked shirt. Every feature is real
pixels drawn in code (`drawSprite`), with a one-pixel dark outline added around
the silhouette at the end.

    import { createFace } from "/assets/face/face.js";
    const face = createFace(el, { expression: "curious" });
    face.lookAt(clientX, clientY);   // pupils step across the lenses, head shifts a pixel
    face.setExpression("smirk");
    face.wink("R");                  // one eye shuts, that brow lifts
    face.glance();                   // looks away, then back
    face.react("laughing", 2000);    // decays back to the page's resting face
    face.duck(true);                 // sinks out of frame in pixel steps
    face.recolor();                  // re-read the --f-* palette (Lores mode)

Expressions: resting, curious, amused, wry, direct, warm, smirk, skeptical,
thinking, laughing, sleepy, reading, dazzled, amazed, unsettled, talking, plus
question/flattened for the SignFlip figure. Each is a set of continuous
"muscles" (brows, lids, mouth curve/open/width/skew); `toPixels` snaps them to
whole-pixel features: brows move a row, eyes open 0–3 rows, the mouth swaps
between a line, a smile, an open smile with teeth, and a round "o".

Colours come from `--f-*` custom properties on the element, so a page (the dark
home stage, Lores mode) can recolour him without touching the drawing.

`page-face.js` puts him on a paper page with a speech box: he types the page's
line on arrival and a line about whatever you hover (`data-say`), mouth moving
while he talks. `preview.html` shows every expression.
No photograph of him is used anywhere on the site.
