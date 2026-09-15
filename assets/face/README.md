# Face frames

Every frame here is Amogh's own portrait (a single 2019 photograph), with the
expression and eye direction edited by LivePortrait's retargeting sliders. No
other person's face is involved, and no face is invented.

- `stage/<expression>_<ix><iy>.webp` — 6 expressions × 5 horizontal × 3 vertical
  gaze positions, used by the landing page so the eyes follow the follow spot.
  `ix` 0 = looking screen-left … 4 = screen-right. `iy` 0 = down, 1 = level, 2 = up.
- `page/<section>.webp` — one duotone frame per section page.

Regenerate with `~/Projects/liveportrait/make_expressions.py` (source photo:
`assets/amogh_face.jpg` there), then the conversion script that grades, mattes
and writes WebP.

Note: LivePortrait's code is MIT, but it uses InsightFace models that are
licensed for non-commercial research use.
