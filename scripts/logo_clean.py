#!/usr/bin/env python3
"""Produce a CLEAN, glow-free KVL CRM logo from the wall-mockup source.
Keeps only the saturated gold/green logo body (+ bright metallic highlights)
and drops the low-saturation yellow glow haze and gray wall."""
import numpy as np
from PIL import Image

src = "public/kvl-logo.png"
img = Image.open(src).convert("RGB")
a = np.asarray(img).astype(np.float32)
h, w, _ = a.shape

R, G, B = a[..., 0], a[..., 1], a[..., 2]
mx = a.max(axis=2)
mn = a.min(axis=2)
sat = np.where(mx > 0, (mx - mn) / np.clip(mx, 1, None), 0)   # 0..1
val = mx / 255.0                                              # 0..1

# Pure saturation key: logo gold/green have sat ~0.7-0.9 (even dark bevels),
# the yellow glow haze is only ~0.39 and the gray wall ~0.02. Threshold cleanly
# between them so the glow disappears and the crisp logo body stays.
s_lo, s_hi = 0.62, 0.74
alpha = np.clip((sat - s_lo) / (s_hi - s_lo), 0, 1)
alpha = (alpha * 255).astype(np.uint8)

rgba = np.dstack([a.astype(np.uint8), alpha])
im = Image.fromarray(rgba, "RGBA")

# Tight trim to solid content
ys, xs = np.where(alpha > 40)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
pad = 10
im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))
im.save("public/kvl-logo-trans.png")
print("clean logo size", im.size)

# Icon = tight square around the KM mark (left cluster). Detect first solid column gap.
al = np.asarray(im)[..., 3]
colsolid = (al > 120).sum(axis=0)
th = colsolid.max() * 0.10
xs2 = np.where(colsolid > th)[0]
start = xs2[0]; end = start; gap = 0
for c in range(start, im.size[0]):
    if colsolid[c] > th:
        end = c; gap = 0
    else:
        gap += 1
        if gap > 55:   # bigger gap = space before "KVL" text
            break
markcrop = im.crop((max(0, start - 8), 0, min(im.size[0], end + 8), im.size[1]))
mm = np.asarray(markcrop)[..., 3]
ys3 = np.where((mm > 120).any(axis=1))[0]
markcrop = markcrop.crop((0, max(0, ys3.min() - 8), markcrop.size[0], min(markcrop.size[1], ys3.max() + 8)))
s = max(markcrop.size)
sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
sq.paste(markcrop, ((s - markcrop.size[0]) // 2, (s - markcrop.size[1]) // 2), markcrop)
sq.save("public/kvl-icon.png")
print("icon size", sq.size)

# previews on dark + light
for bgcol, name in [((13, 18, 32, 255), "dark"), ((245, 245, 245, 255), "light")]:
    bg = Image.new("RGBA", im.size, bgcol); bg.alpha_composite(im)
    bg.convert("RGB").save(f"public/_logo_{name}.png")
