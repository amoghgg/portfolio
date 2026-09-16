# The caricature

`face.js` draws Amogh as vector art and animates it. Brows, eyelids, mouth,
head tilt, pupils and both hands are live parameters, so he can look at a point
on the screen, change expression, and hold a pose.

    import { createFace } from "/assets/face/face.js";
    const face = createFace(el, { expression: "curious", pose: "think" });
    face.lookAt(clientX, clientY);
    face.setExpression("amused");   // resting curious amused wry direct warm
                                    // dazzled amazed unsettled talking
    face.setPose("palms");          // none think shield wave sign palms clap
                                    // point level swipe camera letter
    face.setProp("camera");         // camera | letter | null
    face.react("amazed", 1400);     // decays back to the page's resting face

`page-face.js` wires him into a paper page: he follows the cursor, and anything
with `data-face` / `data-pose` / `data-prop` makes him react on hover.

Colours are CSS custom properties on `.face-art` (see `face.css`), so the same
drawing works on the dark landing page and the paper section pages.
`preview.html` renders every expression on both backgrounds.

No photograph of him is used anywhere on the site.
