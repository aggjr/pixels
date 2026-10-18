import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

def gaussian_filter(arr, sigma=1.0):
    im = Image.fromarray(np.clip(arr * 255.0, 0, 255).astype(np.uint8), "L")
    return np.asarray(im.filter(ImageFilter.GaussianBlur(radius=sigma)), dtype=np.float32) / 255.0

OUT_DIR = "assets/care"
os.makedirs(OUT_DIR, exist_ok=True)


def render_sphere_pbr(h, w, cx, cy, r, base_color, light_dir=(-0.35, -0.55, 0.75),
                      roughness=0.25, metallic=0.05, rim_strength=0.35, subsurface=0.0,
                      rx=None, ry=None):
    """Ray-cast a 3D ellipsoid/sphere with PBR diffuse, specular, subsurface, and fresnel rim."""
    rx = rx or r
    ry = ry or r
    y, x = np.ogrid[:h, :w]
    dx = (x - cx) / rx
    dy = (y - cy) / ry
    dist2 = dx * dx + dy * dy
    mask = dist2 <= 1.0
    dz = np.zeros_like(dist2, dtype=np.float32)
    dz[mask] = np.sqrt(np.maximum(0.0, 1.0 - dist2[mask]))

    lx, ly, lz = light_dir
    ln = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln

    ndotl = np.maximum(0.0, dx * lx + dy * ly + dz * lz)
    hx, hy, hz = lx, ly, lz + 1.0
    hn = math.sqrt(hx * hx + hy * hy + hz * hz)
    hx, hy, hz = hx / hn, hy / hn, hz / hn
    ndoth = np.maximum(0.0, dx * hx + dy * hy + dz * hz)

    shininess = max(4.0, 2.0 / max(0.04, roughness * roughness) - 2.0)
    spec = (ndoth ** shininess) * (1.2 - 0.7 * roughness)
    rim = ((1.0 - dz) ** 2.4) * rim_strength

    wrap = np.maximum(0.0, (dx * lx + dy * ly + dz * lz + subsurface) / (1.0 + subsurface))
    diff = (0.36 + 0.64 * (wrap if subsurface > 0 else ndotl))

    img = np.zeros((h, w, 4), dtype=np.float32)
    for c in range(3):
        col = base_color[c] * diff + (255.0 * (1.0 - metallic) + base_color[c] * metallic) * spec * 0.55 + 255.0 * rim
        img[:, :, c] = np.clip(col, 0, 255)

    dist = np.sqrt(dist2)
    r_avg = 0.5 * (rx + ry)
    alpha = np.clip((1.0 - dist) * r_avg * 0.85, 0.0, 1.0) * 255.0
    img[:, :, 3] = alpha
    return img, dz, mask


def alpha_over(dst, src):
    """Alpha composite two float32 RGBA arrays (h, w, 4)."""
    sa = src[:, :, 3:4] / 255.0
    da = dst[:, :, 3:4] / 255.0
    out_a = sa + da * (1.0 - sa)
    out_rgb = np.where(
        out_a > 1e-5,
        (src[:, :, :3] * sa + dst[:, :, :3] * da * (1.0 - sa)) / np.maximum(out_a, 1e-5),
        0.0
    )
    res = np.zeros_like(dst)
    res[:, :, :3] = np.clip(out_rgb, 0, 255)
    res[:, :, 3:4] = np.clip(out_a * 255.0, 0, 255)
    return res


def render_iridescent_bubble(h, w, cx, cy, r):
    """Render a bright, pearlescent rainbow soap bubble."""
    y, x = np.ogrid[:h, :w]
    dx = (x - cx) / r
    dy = (y - cy) / r
    dist2 = dx * dx + dy * dy
    mask = dist2 <= 1.0
    dz = np.zeros_like(dist2, dtype=np.float32)
    dz[mask] = np.sqrt(np.maximum(0.0, 1.0 - dist2[mask]))

    fresnel = np.zeros_like(dz)
    fresnel[mask] = (1.0 - dz[mask]) ** 1.6

    angle = np.arctan2(dy, dx)
    irid_r = 250.0 * (1.0 - fresnel) + (235 + 20 * np.sin(angle * 2.0 + dist2 * 3.5)) * fresnel
    irid_g = 253.0 * (1.0 - fresnel) + (230 + 25 * np.sin(angle * 2.0 + dist2 * 3.5 + 2.1)) * fresnel
    irid_b = 255.0 * (1.0 - fresnel) + (245 + 10 * np.sin(angle * 2.0 + dist2 * 3.5 + 4.2)) * fresnel

    spec1 = np.exp(-((dx + 0.36) ** 2 + (dy + 0.40) ** 2) / 0.055) * mask
    spec2 = np.exp(-((dx - 0.34) ** 2 + (dy - 0.36) ** 2) / 0.030) * 0.7 * mask

    out = np.zeros((h, w, 4), dtype=np.float32)
    out[:, :, 0] = np.clip(irid_r + 255 * (spec1 + spec2), 0, 255)
    out[:, :, 1] = np.clip(irid_g + 255 * (spec1 + spec2), 0, 255)
    out[:, :, 2] = np.clip(irid_b + 255 * (spec1 + spec2), 0, 255)

    dist = np.sqrt(dist2)
    edge_aa = np.clip((1.0 - dist) * r * 0.85, 0.0, 1.0)
    alpha = np.clip((0.35 + 0.55 * fresnel + 0.9 * spec1 + 0.55 * spec2) * edge_aa * 255.0, 0, 255)
    out[:, :, 3] = alpha
    return out


def render_3d_strawberry(h, w, cx, cy, scale=1.0, angle_deg=0.0):
    out = np.zeros((h, w, 4), dtype=np.float32)
    y, x = np.ogrid[:h, :w]
    ang = math.radians(angle_deg)
    ca, sa = math.cos(ang), math.sin(ang)
    rx0 = (x - cx) * ca + (y - cy) * sa
    ry0 = -(x - cx) * sa + (y - cy) * ca

    R = 38.0 * scale
    yn = ry0 / R
    taper = np.clip(1.0 - 0.38 * yn - 0.18 * (yn ** 2), 0.15, 1.25)
    xn = rx0 / (R * 0.92 * taper)
    yn_adj = yn + 0.12 * np.exp(-(xn * 2.5) ** 2) * (yn < 0)
    dist2 = xn * xn + yn_adj * yn_adj
    mask = dist2 <= 1.0

    dz = np.zeros_like(dist2, dtype=np.float32)
    dz[mask] = np.sqrt(np.maximum(0.0, 1.0 - dist2[mask]))

    seed_grid = (np.sin(xn * 15.0) * np.sin(yn * 15.0)) > 0.72
    seeds = seed_grid & mask & (yn > -0.65)

    lx, ly, lz = -0.35, -0.55, 0.75
    ndotl = np.maximum(0.0, xn * lx + yn_adj * ly + dz * lz)
    spec = np.maximum(0.0, xn * (-0.2) + yn_adj * (-0.35) + dz * 0.92) ** 22
    rim = ((1.0 - dz) ** 2.2) * 0.35

    r_col = np.where(seeds, 255.0, 248.0 * (0.38 + 0.62 * ndotl) + 255 * spec * 0.6 + 255 * rim)
    g_col = np.where(seeds, 215.0, 32.0 * (0.35 + 0.65 * ndotl) + 255 * spec * 0.55 + 190 * rim)
    b_col = np.where(seeds, 55.0, 58.0 * (0.35 + 0.65 * ndotl) + 255 * spec * 0.55 + 205 * rim)

    out[:, :, 0] = np.clip(r_col, 0, 255)
    out[:, :, 1] = np.clip(g_col, 0, 255)
    out[:, :, 2] = np.clip(b_col, 0, 255)
    out[:, :, 3] = np.clip((1.0 - np.sqrt(dist2)) * R * 0.8, 0, 1) * 255.0

    for lx_off, ly_off, lr_x, lr_y in [(-14, -28, 15, 8), (14, -28, 15, 8), (0, -31, 16, 9), (-24, -22, 12, 7), (24, -22, 12, 7)]:
        px = cx + (lx_off * ca - ly_off * sa) * scale
        py = cy + (lx_off * sa + ly_off * ca) * scale
        leaf, _, _ = render_sphere_pbr(h, w, px, py, 10 * scale, (55, 195, 70), roughness=0.35, rx=lr_x * scale, ry=lr_y * scale)
        out = alpha_over(out, leaf)
    return out


def render_3d_watermelon_slice(h, w, cx, cy, scale=1.0, angle_deg=-8.0):
    out = np.zeros((h, w, 4), dtype=np.float32)
    y, x = np.ogrid[:h, :w]
    ang = math.radians(angle_deg)
    ca, sa = math.cos(ang), math.sin(ang)
    rx0 = (x - cx) * ca + (y - cy) * sa
    ry0 = -(x - cx) * sa + (y - cy) * ca

    R = 54.0 * scale
    dist = np.sqrt(rx0 * rx0 + ry0 * ry0) / R
    wedge_mask = (dist <= 1.0) & (ry0 >= -0.12 * R)
    dz = np.zeros_like(dist, dtype=np.float32)
    dz[wedge_mask] = np.sqrt(np.maximum(0.05, 1.0 - (dist[wedge_mask] ** 2) * 0.75))

    is_dark_rind = dist >= 0.87
    is_light_rind = (dist >= 0.77) & (dist < 0.87)
    seeds = ((np.sin(rx0 * 0.35) * np.cos(ry0 * 0.35)) > 0.78) & (dist < 0.68) & (ry0 > 0.05 * R)

    shade = 0.55 + 0.45 * dz
    r_c = np.where(is_dark_rind, 40 * shade, np.where(is_light_rind, 195 * shade, np.where(seeds, 30, 252 * shade)))
    g_c = np.where(is_dark_rind, 165 * shade, np.where(is_light_rind, 238 * shade, np.where(seeds, 25, 58 * shade)))
    b_c = np.where(is_dark_rind, 65 * shade, np.where(is_light_rind, 155 * shade, np.where(seeds, 35, 78 * shade)))

    out[:, :, 0] = np.clip(r_c, 0, 255)
    out[:, :, 1] = np.clip(g_c, 0, 255)
    out[:, :, 2] = np.clip(b_c, 0, 255)
    out[:, :, 3] = gaussian_filter(wedge_mask.astype(np.float32), sigma=1.0) * 255.0
    return out


def render_3d_carrot(h, w, cx, cy, scale=1.0, angle_deg=25.0):
    out = np.zeros((h, w, 4), dtype=np.float32)
    ang = math.radians(angle_deg)
    ca, sa = math.cos(ang), math.sin(ang)
    for t in np.linspace(-1.0, 1.0, 22):
        seg_x = cx + t * 34.0 * scale * ca
        seg_y = cy + t * 34.0 * scale * sa
        seg_r = (18.0 - 7.5 * t) * scale
        col = (255, int(132 + 12 * np.sin(t * 9)), 28)
        sp, _, _ = render_sphere_pbr(h, w, seg_x, seg_y, seg_r, col, roughness=0.28, subsurface=0.3)
        out = alpha_over(out, sp)
    gx = cx - 42.0 * scale * ca
    gy = cy - 42.0 * scale * sa
    for ox, oy in [(-8, -6), (8, -6), (0, -12)]:
        lf, _, _ = render_sphere_pbr(h, w, gx + ox * scale, gy + oy * scale, 11 * scale, (65, 200, 75), roughness=0.35)
        out = alpha_over(out, lf)
    return out


def render_3d_fish(h, w, cx, cy, scale=1.0, angle_deg=-10.0, color=(95, 195, 250)):
    out = np.zeros((h, w, 4), dtype=np.float32)
    ang = math.radians(angle_deg)
    ca, sa = math.cos(ang), math.sin(ang)
    for ty_off in (-12, 12):
        tx = cx + (38 * ca - ty_off * sa) * scale
        ty = cy + (38 * sa + ty_off * ca) * scale
        tf, _, _ = render_sphere_pbr(h, w, tx, ty, 14 * scale, color, roughness=0.22, rx=16 * scale, ry=10 * scale)
        out = alpha_over(out, tf)
    body, _, _ = render_sphere_pbr(h, w, cx, cy, 28 * scale, color, roughness=0.18, subsurface=0.25, rx=38 * scale, ry=22 * scale)
    out = alpha_over(out, body)
    belly, _, _ = render_sphere_pbr(h, w, cx - 2 * scale, cy + 6 * scale, 18 * scale, (235, 248, 255), roughness=0.2, rx=28 * scale, ry=12 * scale)
    out = alpha_over(out, belly)
    ex = cx - 20 * scale * ca
    ey = cy - 20 * scale * sa - 3 * scale
    eye_w, _, _ = render_sphere_pbr(h, w, ex, ey, 6.5 * scale, (255, 255, 255), roughness=0.1)
    eye_p, _, _ = render_sphere_pbr(h, w, ex - 1 * scale, ey, 4.0 * scale, (25, 25, 40), roughness=0.08)
    out = alpha_over(out, eye_w)
    out = alpha_over(out, eye_p)
    return out


def render_3d_meat_bone(h, w, cx, cy, scale=1.0):
    out = np.zeros((h, w, 4), dtype=np.float32)
    for bx, by in [(-58, -8), (-54, 10), (58, -8), (54, 10)]:
        kn, _, _ = render_sphere_pbr(h, w, cx + bx * scale, cy + by * scale, 16 * scale, (252, 248, 238), roughness=0.3)
        out = alpha_over(out, kn)
    for t in np.linspace(-48, 48, 15):
        sh, _, _ = render_sphere_pbr(h, w, cx + t * scale, cy, 11 * scale, (248, 244, 232), roughness=0.3)
        out = alpha_over(out, sh)
    meat_outer, _, _ = render_sphere_pbr(h, w, cx, cy - 4 * scale, 38 * scale, (195, 58, 48), roughness=0.26, rx=46 * scale, ry=34 * scale)
    out = alpha_over(out, meat_outer)
    meat_face, _, _ = render_sphere_pbr(h, w, cx + 4 * scale, cy - 6 * scale, 28 * scale, (232, 85, 78), roughness=0.22, rx=34 * scale, ry=25 * scale)
    out = alpha_over(out, meat_face)
    marrow_w, _, _ = render_sphere_pbr(h, w, cx + 6 * scale, cy - 6 * scale, 11 * scale, (255, 248, 240), roughness=0.2)
    out = alpha_over(out, marrow_w)
    return out


def build_bath_foam_suit():
    """Generate a dense, solid, snowy-white 3D bath soap foam blanket for the pet's body (below chin)."""
    h, w = 560, 640
    canvas = np.zeros((h, w, 4), dtype=np.float32)

    rng = np.random.default_rng(108)
    puffs = []

    # Solid layered foam cloud covering neck, shoulders, chest, belly, flanks, and paws!
    # Plus two raised cheek-foam puffs at top-left and top-right so it hugs the chin in a U-shape!
    layers = [
        # Outer silhouette ring
        (320, 310, 215, 165, 20, 74, (242, 249, 255)),
        # Mid ring
        (320, 315, 155, 125, 16, 72, (247, 252, 255)),
        # Inner solid core (no hole in chest!)
        (320, 310, 85, 75, 12, 74, (251, 254, 255)),
        (320, 310, 30, 25, 5, 76, (254, 255, 255)),
        # Cheek/shoulder framing puffs at top-left and top-right
        (145, 145, 45, 35, 6, 58, (252, 254, 255)),
        (495, 145, 45, 35, 6, 58, (252, 254, 255)),
        # Bottom paw foam puffs
        (205, 445, 55, 25, 6, 60, (250, 253, 255)),
        (435, 445, 55, 25, 6, 60, (250, 253, 255)),
    ]

    for cx0, cy0, rx, ry, count, r_base, tint in layers:
        for i in range(count):
            ang = (2 * math.pi * i) / count + rng.uniform(-0.18, 0.18)
            rad_scale = rng.uniform(0.72, 1.04)
            px = cx0 + math.cos(ang) * rx * rad_scale
            py = cy0 + math.sin(ang) * ry * rad_scale
            pr = r_base * rng.uniform(0.82, 1.16)
            puffs.append((py, px, pr, tint))

    for py, px, pr, tint in puffs:
        sh = np.zeros((h, w, 4), dtype=np.float32)
        y, x = np.ogrid[:h, :w]
        d2 = ((x - px) / (pr * 1.04)) ** 2 + ((y - (py + pr * 0.12)) / (pr * 1.04)) ** 2
        sh[:, :, :3] = (195, 218, 245)
        sh[:, :, 3] = np.clip((1.0 - np.sqrt(d2)) * 60.0, 0, 45)
        canvas = alpha_over(canvas, sh)

        puff_img, _, _ = render_sphere_pbr(
            h, w, px, py, pr, tint,
            light_dir=(-0.3, -0.6, 0.74), roughness=0.40, metallic=0.0,
            rim_strength=0.48, subsurface=0.72
        )
        canvas = alpha_over(canvas, puff_img)

    bubble_coords = [
        (140, 130, 32), (500, 130, 34), (225, 175, 28), (415, 175, 30),
        (125, 290, 36), (515, 285, 38), (195, 410, 32), (445, 415, 34),
        (320, 235, 30), (255, 315, 32), (385, 310, 32), (320, 395, 36),
        (165, 225, 24), (475, 225, 26), (275, 260, 24), (365, 260, 24),
    ]
    for bx, by, br in bubble_coords:
        bub = render_iridescent_bubble(h, w, bx, by, br)
        canvas = alpha_over(canvas, bub)

    Image.fromarray(canvas.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "bath-foam-suit.png"))


def build_bath_foam_crown():
    """Generate a 3D soap foam crown with a cute 3D yellow rubber ducky on top."""
    h, w = 420, 520
    canvas = np.zeros((h, w, 4), dtype=np.float32)

    foam_puffs = [
        (140, 270, 65), (380, 270, 65),
        (195, 245, 74), (325, 245, 74),
        (260, 235, 82),
        (110, 295, 50), (410, 295, 50),
        (165, 295, 62), (355, 295, 62),
        (230, 285, 68), (290, 285, 68),
    ]
    for px, py, pr in foam_puffs:
        sh = np.zeros((h, w, 4), dtype=np.float32)
        y, x = np.ogrid[:h, :w]
        d2 = ((x - px) / (pr * 1.05)) ** 2 + ((y - (py + 8)) / (pr * 1.05)) ** 2
        sh[:, :, :3] = (195, 218, 245)
        sh[:, :, 3] = np.clip((1.0 - np.sqrt(d2)) * 65.0, 0, 48)
        canvas = alpha_over(canvas, sh)

        puff, _, _ = render_sphere_pbr(
            h, w, px, py, pr, (252, 254, 255),
            light_dir=(-0.3, -0.6, 0.74), roughness=0.40, metallic=0.0,
            rim_strength=0.48, subsurface=0.72
        )
        canvas = alpha_over(canvas, puff)

    duck_body, _, _ = render_sphere_pbr(
        h, w, 265, 165, 48, (255, 215, 35),
        light_dir=(-0.35, -0.55, 0.75), roughness=0.22, subsurface=0.3
    )
    canvas = alpha_over(canvas, duck_body)
    duck_wing, _, _ = render_sphere_pbr(
        h, w, 282, 168, 24, (255, 200, 20),
        light_dir=(-0.35, -0.55, 0.75), roughness=0.25, subsurface=0.25
    )
    canvas = alpha_over(canvas, duck_wing)
    duck_head, _, _ = render_sphere_pbr(
        h, w, 242, 112, 36, (255, 222, 45),
        light_dir=(-0.35, -0.55, 0.75), roughness=0.2, subsurface=0.3
    )
    canvas = alpha_over(canvas, duck_head)
    duck_beak, _, _ = render_sphere_pbr(
        h, w, 212, 118, 16, (255, 115, 25),
        light_dir=(-0.35, -0.55, 0.75), roughness=0.22
    )
    canvas = alpha_over(canvas, duck_beak)
    duck_eye, _, _ = render_sphere_pbr(
        h, w, 232, 104, 6.5, (25, 20, 35),
        light_dir=(-0.4, -0.6, 0.7), roughness=0.08
    )
    canvas = alpha_over(canvas, duck_eye)

    for px, py, pr in [(220, 195, 42), (295, 198, 40), (258, 205, 44)]:
        puff, _, _ = render_sphere_pbr(
            h, w, px, py, pr, (254, 255, 255),
            light_dir=(-0.3, -0.6, 0.74), roughness=0.40, subsurface=0.72
        )
        canvas = alpha_over(canvas, puff)

    for bx, by, br in [(145, 215, 26), (370, 210, 28), (190, 160, 20), (330, 155, 22), (260, 295, 24)]:
        canvas = alpha_over(canvas, render_iridescent_bubble(h, w, bx, by, br))

    Image.fromarray(canvas.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "bath-foam-crown.png"))


def render_3d_bowl_base(h, w, rim_color, body_color, inner_color):
    """Render a 3D glossy ceramic pet bowl sitting flat on the ground."""
    canvas = np.zeros((h, w, 4), dtype=np.float32)
    y, x = np.ogrid[:h, :w]

    sd2 = ((x - w * 0.5) / (w * 0.43)) ** 2 + ((y - h * 0.80) / (h * 0.13)) ** 2
    sh = np.zeros((h, w, 4), dtype=np.float32)
    sh[:, :, :3] = (35, 18, 50)
    sh[:, :, 3] = np.clip((np.maximum(0.0, 1.0 - sd2) ** 1.8) * 115.0, 0, 115)
    canvas = alpha_over(canvas, sh)

    top_y, bot_y = h * 0.48, h * 0.78
    rx_top, rx_bot = w * 0.37, w * 0.42
    ry_top, ry_bot = h * 0.14, h * 0.15

    body_mask = np.zeros((h, w), dtype=bool)
    for s in np.linspace(0.0, 1.0, 85):
        cy_s = top_y + s * (bot_y - top_y)
        rx_s = rx_top + (rx_bot - rx_top) * (s ** 0.75)
        ry_s = ry_top + (ry_bot - ry_top) * s
        d2 = ((x - w * 0.5) / rx_s) ** 2 + ((y - cy_s) / ry_s) ** 2
        body_mask |= (d2 <= 1.0)

    dx_b = (x - w * 0.5) / rx_bot
    dy_b = (y - (top_y + bot_y) * 0.52) / ((bot_y - top_y) * 0.75)
    nz_b = np.sqrt(np.maximum(0.05, 1.0 - np.clip(dx_b * dx_b + dy_b * dy_b * 0.35, 0, 0.95)))

    lx, ly, lz = -0.38, -0.52, 0.76
    ndotl = np.maximum(0.0, dx_b * lx + dy_b * 0.45 * ly + nz_b * lz)
    spec = np.maximum(0.0, dx_b * (-0.25) + dy_b * (-0.35) + nz_b * 0.9) ** 28
    rim = (1.0 - nz_b) ** 2.5 * 0.35

    bowl_layer = np.zeros((h, w, 4), dtype=np.float32)
    for c in range(3):
        col = body_color[c] * (0.35 + 0.65 * ndotl) + 255.0 * spec * 0.55 + 255.0 * rim
        bowl_layer[:, :, c] = np.clip(col, 0, 255)
    bowl_layer[:, :, 3] = gaussian_filter(body_mask.astype(np.float32), sigma=1.1) * 255.0
    canvas = alpha_over(canvas, bowl_layer)

    rim_d2 = ((x - w * 0.5) / (rx_top * 1.03)) ** 2 + ((y - top_y) / (ry_top * 1.06)) ** 2
    rim_m = rim_d2 <= 1.0
    rim_layer = np.zeros((h, w, 4), dtype=np.float32)
    for c in range(3):
        rim_layer[:, :, c] = rim_color[c]
    rim_layer[:, :, 3] = gaussian_filter(rim_m.astype(np.float32), sigma=1.0) * 255.0
    canvas = alpha_over(canvas, rim_layer)

    in_d2 = ((x - w * 0.5) / (rx_top * 0.88)) ** 2 + ((y - top_y) / (ry_top * 0.84)) ** 2
    in_m = in_d2 <= 1.0
    in_layer = np.zeros((h, w, 4), dtype=np.float32)
    in_shade = 0.68 + 0.35 * (((x - w * 0.5) / rx_top) * 0.35 + ((y - top_y) / ry_top) * 0.65)
    for c in range(3):
        in_layer[:, :, c] = np.clip(inner_color[c] * in_shade, 0, 255)
    in_layer[:, :, 3] = gaussian_filter(in_m.astype(np.float32), sigma=1.0) * 255.0
    canvas = alpha_over(canvas, in_layer)

    star_img, _, _ = render_sphere_pbr(h, w, w * 0.5, h * 0.69, w * 0.052, (255, 215, 70), roughness=0.18, metallic=0.35)
    canvas = alpha_over(canvas, star_img)

    return canvas, (w * 0.5, top_y, rx_top * 0.85, ry_top * 0.80)


def build_drink_bowls():
    """Render 3D Water Bowl (full & low) and 3D Vehicle Fuel Bowl."""
    h, w = 360, 480
    base_w, (cx, cy, rx, ry) = render_3d_bowl_base(
        h, w,
        rim_color=(235, 248, 255),
        body_color=(95, 195, 255),
        inner_color=(35, 135, 215)
    )
    y, x = np.ogrid[:h, :w]
    d2 = ((x - cx) / (rx * 0.96)) ** 2 + ((y - (cy + 3)) / (ry * 0.92)) ** 2
    w_mask = d2 <= 1.0
    r_norm = np.sqrt(np.maximum(0.0, d2))
    ripples = 0.5 + 0.5 * np.cos(r_norm * 18.0)
    water = np.zeros((h, w, 4), dtype=np.float32)
    water[:, :, 0] = np.clip(65 + 110 * (1.0 - r_norm) + 75 * ripples * (1.0 - r_norm * 0.5), 0, 255)
    water[:, :, 1] = np.clip(195 + 50 * (1.0 - r_norm) + 45 * ripples, 0, 255)
    water[:, :, 2] = np.clip(245 + 10 * ripples, 0, 255)
    spec_w = np.exp(-(((x - (cx - rx * 0.25)) / (rx * 0.35)) ** 2 + ((y - (cy - ry * 0.18)) / (ry * 0.22)) ** 2))
    for c in range(3):
        water[:, :, c] = np.clip(water[:, :, c] + 255 * spec_w * 0.75, 0, 255)
    water[:, :, 3] = gaussian_filter(w_mask.astype(np.float32), sigma=1.0) * 235.0
    canvas = alpha_over(base_w.copy(), water)
    Image.fromarray(canvas.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "drink-water-bowl.png"))

    # Low water level after drinking
    d2_low = ((x - cx) / (rx * 0.74)) ** 2 + ((y - (cy + 10)) / (ry * 0.68)) ** 2
    water_low = water.copy()
    water_low[:, :, 3] = gaussian_filter((d2_low <= 1.0).astype(np.float32), sigma=1.0) * 200.0
    canvas_low = alpha_over(base_w.copy(), water_low)
    Image.fromarray(canvas_low.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "drink-water-bowl-low.png"))

    canvas_f, (cx, cy, rx, ry) = render_3d_bowl_base(
        h, w,
        rim_color=(255, 215, 90),
        body_color=(225, 60, 70),
        inner_color=(50, 35, 65)
    )
    f_mask = d2 <= 1.0
    fuel = np.zeros((h, w, 4), dtype=np.float32)
    fuel[:, :, 0] = np.clip(255 - 80 * r_norm + 40 * ripples, 0, 255)
    fuel[:, :, 1] = np.clip(175 - 60 * r_norm + 55 * ripples, 0, 255)
    fuel[:, :, 2] = np.clip(40 + 140 * (1.0 - r_norm), 0, 255)
    for c in range(3):
        fuel[:, :, c] = np.clip(fuel[:, :, c] + 255 * spec_w * 0.7, 0, 255)
    fuel[:, :, 3] = gaussian_filter(f_mask.astype(np.float32), sigma=1.0) * 240.0
    canvas_f = alpha_over(canvas_f, fuel)
    Image.fromarray(canvas_f.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "drink-fuel-bowl.png"))


def build_food_bowls():
    """Render 6 sculpted 3D Ground Food Bowls (Full + Half-eaten) + 1 Empty Bowl."""
    h, w = 360, 480

    empty_c, _ = render_3d_bowl_base(
        h, w, (255, 244, 248), (255, 140, 180), (225, 175, 200)
    )
    Image.fromarray(empty_c.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-empty.png"))

    # 1. Berry Bowl
    base_b, (cx, cy, rx, ry) = render_3d_bowl_base(
        h, w, (255, 240, 246), (255, 130, 175), (190, 85, 125)
    )
    half_b = alpha_over(base_b.copy(), render_3d_strawberry(h, w, cx + 18, cy - 4, scale=0.82, angle_deg=14))
    Image.fromarray(half_b.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-berry-half.png"))

    canvas = base_b.copy()
    for bx, by in [(cx - 72, cy + 4), (cx + 72, cy + 4), (cx - 42, cy + 14), (cx + 42, cy + 14)]:
        bb, _, _ = render_sphere_pbr(h, w, bx, by, 20, (68, 105, 230), roughness=0.22, subsurface=0.2)
        canvas = alpha_over(canvas, bb)
    canvas = alpha_over(canvas, render_3d_strawberry(h, w, cx - 44, cy - 10, scale=0.88, angle_deg=-18))
    canvas = alpha_over(canvas, render_3d_strawberry(h, w, cx + 44, cy - 8, scale=0.88, angle_deg=18))
    canvas = alpha_over(canvas, render_3d_strawberry(h, w, cx, cy - 14, scale=1.02, angle_deg=2))
    Image.fromarray(canvas.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-berry.png"))

    # 2. Fish Bowl
    base_f, (cx, cy, rx, ry) = render_3d_bowl_base(
        h, w, (255, 245, 238), (255, 155, 130), (195, 115, 95)
    )
    half_f = alpha_over(base_f.copy(), render_3d_fish(h, w, cx + 12, cy - 2, scale=0.85, angle_deg=10, color=(95, 195, 250)))
    Image.fromarray(half_f.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-fish-half.png"))

    canvas = base_f.copy()
    for kx, ky in [(cx - 65, cy + 8), (cx + 65, cy + 8), (cx - 32, cy + 14), (cx + 32, cy + 14), (cx, cy + 16)]:
        kb, _, _ = render_sphere_pbr(h, w, kx, ky, 20, (220, 150, 85), roughness=0.4)
        canvas = alpha_over(canvas, kb)
    canvas = alpha_over(canvas, render_3d_fish(h, w, cx - 32, cy - 6, scale=0.92, angle_deg=-15, color=(255, 132, 105)))
    canvas = alpha_over(canvas, render_3d_fish(h, w, cx + 28, cy - 4, scale=0.92, angle_deg=14, color=(95, 195, 250)))
    canvas = alpha_over(canvas, render_3d_fish(h, w, cx - 2, cy - 16, scale=1.05, angle_deg=-4, color=(110, 208, 255)))
    Image.fromarray(canvas.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-fish.png"))

    # 3. Melon & Carrot Bowl
    base_m, (cx, cy, rx, ry) = render_3d_bowl_base(
        h, w, (238, 255, 245), (90, 210, 145), (50, 145, 95)
    )
    half_m = alpha_over(base_m.copy(), render_3d_carrot(h, w, cx + 15, cy - 4, scale=0.88, angle_deg=18))
    Image.fromarray(half_m.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-melon-half.png"))

    canvas = base_m.copy()
    ap, _, _ = render_sphere_pbr(h, w, cx - 55, cy - 6, 32, (245, 48, 58), roughness=0.2, subsurface=0.3)
    ap_leaf, _, _ = render_sphere_pbr(h, w, cx - 52, cy - 36, 10, (65, 195, 75), roughness=0.3, rx=14, ry=7)
    canvas = alpha_over(canvas, ap)
    canvas = alpha_over(canvas, ap_leaf)
    canvas = alpha_over(canvas, render_3d_carrot(h, w, cx + 42, cy - 8, scale=0.95, angle_deg=22))
    canvas = alpha_over(canvas, render_3d_watermelon_slice(h, w, cx - 4, cy - 28, scale=1.12, angle_deg=-6))
    Image.fromarray(canvas.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-melon.png"))

    # 4. Meat & Bone Bowl
    base_mt, (cx, cy, rx, ry) = render_3d_bowl_base(
        h, w, (255, 238, 210), (225, 95, 65), (145, 55, 40)
    )
    half_mt = alpha_over(base_mt.copy(), render_3d_meat_bone(h, w, cx, cy - 4, scale=0.72))
    Image.fromarray(half_mt.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-meat-half.png"))

    canvas = base_mt.copy()
    for kx, ky in [(cx - 58, cy + 10), (cx + 58, cy + 10)]:
        kb, _, _ = render_sphere_pbr(h, w, kx, ky, 22, (215, 145, 80), roughness=0.4)
        canvas = alpha_over(canvas, kb)
    canvas = alpha_over(canvas, render_3d_meat_bone(h, w, cx, cy - 10, scale=1.08))
    Image.fromarray(canvas.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-meat.png"))

    # 5. Nectar Bowl
    base_n, (cx, cy, rx, ry) = render_3d_bowl_base(
        h, w, (255, 248, 205), (255, 195, 55), (195, 130, 25)
    )
    honey, _, _ = render_sphere_pbr(h, w, cx - 15, cy - 2, 32, (255, 190, 25), roughness=0.12, subsurface=0.55, rx=38, ry=26)
    half_n = alpha_over(base_n.copy(), honey)
    Image.fromarray(half_n.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-nectar-half.png"))

    canvas = half_n.copy()
    stem, _, _ = render_sphere_pbr(h, w, cx + 42, cy + 4, 18, (252, 245, 230), roughness=0.35, rx=16, ry=22)
    cap, _, _ = render_sphere_pbr(h, w, cx + 42, cy - 18, 30, (245, 52, 65), roughness=0.22, rx=34, ry=22)
    spot1, _, _ = render_sphere_pbr(h, w, cx + 32, cy - 22, 6, (255, 252, 245), roughness=0.3)
    spot2, _, _ = render_sphere_pbr(h, w, cx + 52, cy - 18, 5, (255, 252, 245), roughness=0.3)
    canvas = alpha_over(canvas, stem)
    canvas = alpha_over(canvas, cap)
    canvas = alpha_over(canvas, spot1)
    canvas = alpha_over(canvas, spot2)
    for i in range(5):
        a = i * 2 * math.pi / 5 - math.pi / 2
        px, py = cx - 4 + math.cos(a) * 18, cy - 16 + math.sin(a) * 14
        pet, _, _ = render_sphere_pbr(h, w, px, py, 13, (255, 125, 195), roughness=0.25, subsurface=0.4)
        canvas = alpha_over(canvas, pet)
    fl_c, _, _ = render_sphere_pbr(h, w, cx - 4, cy - 16, 10, (255, 220, 45), roughness=0.2)
    canvas = alpha_over(canvas, fl_c)
    Image.fromarray(canvas.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-nectar.png"))

    # 6. Mechanic Parts Bowl
    base_p, (cx, cy, rx, ry) = render_3d_bowl_base(
        h, w, (220, 230, 245), (75, 115, 185), (40, 60, 105)
    )
    e_core_sm, _, _ = render_sphere_pbr(h, w, cx + 10, cy - 4, 24, (70, 230, 255), roughness=0.12, subsurface=0.5)
    half_p = alpha_over(base_p.copy(), e_core_sm)
    Image.fromarray(half_p.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-parts-half.png"))

    canvas = base_p.copy()
    gx, gy = cx - 42, cy - 8
    for i in range(8):
        a = i * 2 * math.pi / 8
        tx, ty = gx + math.cos(a) * 28, gy + math.sin(a) * 22
        tooth, _, _ = render_sphere_pbr(h, w, tx, ty, 9, (255, 200, 45), roughness=0.18, metallic=0.45)
        canvas = alpha_over(canvas, tooth)
    g_ring, _, _ = render_sphere_pbr(h, w, gx, gy, 24, (255, 212, 60), roughness=0.16, metallic=0.45, rx=26, ry=20)
    g_hole, _, _ = render_sphere_pbr(h, w, gx, gy, 9, (45, 65, 110), roughness=0.4)
    canvas = alpha_over(canvas, g_ring)
    canvas = alpha_over(canvas, g_hole)
    for t in np.linspace(-28, 28, 12):
        wx, wy = cx + 36 + t * 0.85, cy - 6 - t * 0.55
        ws, _, _ = render_sphere_pbr(h, w, wx, wy, 9, (215, 228, 245), roughness=0.14, metallic=0.55)
        canvas = alpha_over(canvas, ws)
    w_head, _, _ = render_sphere_pbr(h, w, cx + 62, cy - 22, 17, (225, 236, 250), roughness=0.14, metallic=0.55)
    canvas = alpha_over(canvas, w_head)
    e_core, _, _ = render_sphere_pbr(h, w, cx + 2, cy - 12, 30, (70, 230, 255), roughness=0.12, subsurface=0.5)
    canvas = alpha_over(canvas, e_core)
    Image.fromarray(canvas.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "food-bowl-parts.png"))


def build_shower_and_sponge():
    """Render 3D Bath Showerhead and 3D Bubbly Bath Sponge."""
    h, w = 280, 360
    canvas = np.zeros((h, w, 4), dtype=np.float32)
    for t in np.linspace(0.0, 1.0, 35):
        px = 290 - t * 110
        py = 35 + t * 75
        sp, _, _ = render_sphere_pbr(h, w, px, py, 20 + t * 6, (255, 145, 195), roughness=0.2, metallic=0.2)
        canvas = alpha_over(canvas, sp)
    dome, _, _ = render_sphere_pbr(h, w, 165, 120, 58, (255, 215, 85), roughness=0.18, metallic=0.35)
    canvas = alpha_over(canvas, dome)
    plate, _, _ = render_sphere_pbr(h, w, 155, 142, 48, (225, 240, 255), roughness=0.15, metallic=0.5)
    canvas = alpha_over(canvas, plate)
    Image.fromarray(canvas.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "bath-showerhead.png"))

    h2, w2 = 240, 280
    sponge = np.zeros((h2, w2, 4), dtype=np.float32)
    for ox, oy, r_s in [(110, 130, 58), (165, 130, 58), (138, 125, 64)]:
        sp, _, _ = render_sphere_pbr(h2, w2, ox, oy, r_s, (255, 220, 55), roughness=0.55, subsurface=0.35)
        sponge = alpha_over(sponge, sp)
    for ox, oy, r_f in [(105, 95, 32), (140, 88, 36), (175, 96, 30), (125, 108, 28), (158, 108, 28)]:
        fp, _, _ = render_sphere_pbr(h2, w2, ox, oy, r_f, (252, 254, 255), roughness=0.4, subsurface=0.72)
        sponge = alpha_over(sponge, fp)
    sponge = alpha_over(sponge, render_iridescent_bubble(h2, w2, 140, 75, 22))
    Image.fromarray(sponge.astype(np.uint8), "RGBA").save(os.path.join(OUT_DIR, "bath-sponge.png"))


if __name__ == "__main__":
    build_bath_foam_suit()
    build_bath_foam_crown()
    build_drink_bowls()
    build_food_bowls()
    build_shower_and_sponge()
    print("All full, half, and empty 3D care assets rendered successfully!")
