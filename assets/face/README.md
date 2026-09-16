# The caricature

`face.js` draws Amogh as vector art — head and shoulders — and animates the
face: brows, upper and lower lids, mouth and pupils are live parameters.

    import { createFace } from "/assets/face/face.js";
    const face = createFace(el, { expression: "curious" });
    face.lookAt(clientX, clientY);   // eyes saccade to a point, head follows a little
    face.setExpression("smirk");
    face.wink("R");                  // one eye, with the brow
    face.glance();                   // looks away, then back
    face.react("laughing", 2000);    // decays back to the page's resting face

Expressions: resting, curious, amused, wry, direct, warm, smirk, skeptical,
thinking, laughing, sleepy, reading, dazzled, amazed, unsettled, plus
question/flattened for the SignFlip figure.

What makes it read as alive: eyes move in spring-driven saccades with
micro-drift rather than gliding; upper lids ride the gaze; lower lids rise on a
real smile; he blinks as his eyes jump; he glances around and cycles small
idle expressions when nobody is moving; and an eyebrow flash greets a returning
cursor. `page-face.js` wires all that into a page, plus `data-face` hover
reactions and a wink when you click him.

Hands and a body were tried twice and cut: this frame has no room for a
shoulder or an elbow, so a raised hand always read as detached.

`preview.html` renders every expression on both backgrounds.
No photograph of him is used anywhere on the site.
