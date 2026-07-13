#!/usr/bin/env python3
"""Extract the KVL CRM logo with the glow FULLY removed, using an edge/silhouette
method: the logo has sharp metallic edges, the glow is a smooth gradient. We
detect sharp edges, fill the enclosed silhouette, and drop everything smooth."""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

T_EDGE = float(sys.argv[1]) if len(sys.argv) > 1 else 10.0

img = Image.open("public/kvl-logo.png").convert("RGB")
a = np.asarray(img).astype(np.float32)
h, w, _ = a.shape

mx = a.max(2); mn = a.min(2)
sat = np.where(mx > 0, (mx - mn) / np.clip(mx, 1, None), 0)
val = mx  # brightness proxy

# 1. Sharp edges (logo has them, glow doesn't)
gy, gx = np.gradient(val)
gmag = np.hypot(gx, gy)
edges = gmag > T_EDGE

# 2. connect edges, fill the enclosed logo silhouette, shrink back
edges_d = ndimage.binary_dilation(edges, iterations=3)
filled = ndimage.binary_fill_holes(edges_d)
mask = ndimage.binary_erosion(filled, iterations=2)

# 3. keep only large connected blobs (drop stray specks/film-grain edges)
lbl, n = ndimage.label(mask)
if n:
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = sizes > (0.0008 * h * w)
    mask = keep[lbl]

# 4. drop anything that is actually gray wall (low saturation) that got enclosed
mask = mask & (sat > 0.25)
mask = ndimage.binary_closing(mask, iterations=2)

alpha = (mask * 255).astype(np.uint8)
im = Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), "RGBA")
# soft 1px anti-alias on the alpha edge
im.putalpha(im.getchannel("A").filter(ImageFilter.GaussianBlur(0.6)))

ys, xs = np.where(np.asarray(im)[..., 3] > 40)
pad = 8
im = im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad),
              min(w, xs.max() + pad), min(h, ys.max() + pad)))
im.save("public/kvl-logo-trans.png")
print("edge logo size", im.size, "T_EDGE", T_EDGE)

# preview on dark
bg = Image.new("RGBA", im.size, (13, 18, 32, 255)); bg.alpha_composite(im)
bg.convert("RGB").save("public/_edge.png")
