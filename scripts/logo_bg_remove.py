#!/usr/bin/env python3
"""Remove the gray wall background from the KVL CRM logo mockup.
Keys out pixels by distance from the corner background color, keeping the
bright glowing logo. Produces a trimmed transparent PNG."""
import numpy as np
from PIL import Image

src = "public/kvl-logo.png"
out = "public/kvl-logo-trans.png"

img = Image.open(src).convert("RGB")
a = np.asarray(img).astype(np.float32)
h, w, _ = a.shape

# Background color = median of the four corner patches
k = 40
corners = np.concatenate([
    a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3),
    a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3),
])
bg = np.median(corners, axis=0)

# Distance of each pixel from the background color
dist = np.sqrt(((a - bg) ** 2).sum(axis=2))

# Also use brightness + saturation so the logo's bright/colored parts stay solid
mx = a.max(axis=2); mn = a.min(axis=2)
sat = (mx - mn)
bright = mx

# Soft alpha ramp from background distance
t_low, t_high = 22.0, 60.0
alpha = np.clip((dist - t_low) / (t_high - t_low), 0, 1)
# Force-keep clearly-logo pixels (very bright or saturated)
alpha = np.maximum(alpha, np.clip((sat - 30) / 40, 0, 1))
alpha = np.maximum(alpha, np.clip((bright - 200) / 40, 0, 1))
alpha = (alpha * 255).astype(np.uint8)

rgba = np.dstack([a.astype(np.uint8), alpha])
im = Image.fromarray(rgba, "RGBA")

# Trim to the non-transparent bounding box (with small padding)
ys, xs = np.where(alpha > 12)
if len(xs):
    x0, x1 = xs.min(), xs.max(); y0, y1 = ys.min(), ys.max()
    pad = 20
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(w, x1 + pad); y1 = min(h, y1 + pad)
    im = im.crop((x0, y0, x1, y1))

im.save(out)
print(f"bg={bg.astype(int).tolist()} size={im.size} saved={out}")
