#!/usr/bin/env python3
"""Precompute a rainbow radial profile from geometric ray optics + Fresnel.

This tool is intentionally outside the web runtime. It generates a compact LUT
that the web app can load directly.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import struct
import subprocess
import tempfile
import zlib
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def wavelength_to_rgb(wavelength_nm: float) -> tuple[float, float, float]:
    r = g = b = 0.0

    if 380 <= wavelength_nm < 440:
        r = -(wavelength_nm - 440.0) / 60.0
        b = 1.0
    elif wavelength_nm < 490:
        g = (wavelength_nm - 440.0) / 50.0
        b = 1.0
    elif wavelength_nm < 510:
        g = 1.0
        b = -(wavelength_nm - 510.0) / 20.0
    elif wavelength_nm < 580:
        r = (wavelength_nm - 510.0) / 70.0
        g = 1.0
    elif wavelength_nm < 645:
        r = 1.0
        g = -(wavelength_nm - 645.0) / 65.0
    elif wavelength_nm <= 780:
        r = 1.0

    if 380 <= wavelength_nm < 420:
        f = 0.3 + 0.7 * (wavelength_nm - 380.0) / 40.0
    elif wavelength_nm <= 700:
        f = 1.0
    elif wavelength_nm <= 780:
        f = 0.3 + 0.7 * (780.0 - wavelength_nm) / 80.0
    else:
        f = 0.0

    return r * f, g * f, b * f


def refractive_index_water(wavelength_nm: float) -> float:
    # Cauchy-like fit for visible wavelengths.
    lam_um = wavelength_nm / 1000.0
    return 1.322 + 0.00306 / (lam_um * lam_um)


def fresnel_unpolarized(n1: float, n2: float, cos_i: float) -> float:
    ci = clamp(cos_i, 0.0, 1.0)
    sin_i2 = max(0.0, 1.0 - ci * ci)
    eta = n1 / n2
    sin_t2 = eta * eta * sin_i2
    if sin_t2 > 1.0:
        return 1.0

    cos_t = math.sqrt(max(0.0, 1.0 - sin_t2))

    rs_num = n1 * ci - n2 * cos_t
    rs_den = n1 * ci + n2 * cos_t
    rs = (rs_num / rs_den) ** 2

    rp_num = n1 * cos_t - n2 * ci
    rp_den = n1 * cos_t + n2 * ci
    rp = (rp_num / rp_den) ** 2

    return 0.5 * (rs + rp)


def rainbow_angles_deg(u: float, n: float) -> tuple[float, float] | None:
    i = math.asin(clamp(u, -0.999999, 0.999999))
    sin_r = math.sin(i) / n
    if abs(sin_r) > 1.0:
        return None

    r = math.asin(sin_r)
    d1 = math.pi + 2.0 * i - 4.0 * r
    d2 = 2.0 * math.pi + 2.0 * i - 6.0 * r

    p = abs(math.pi - d1) * 180.0 / math.pi
    s = abs(math.pi - d2) * 180.0 / math.pi
    return p, s


def gaussian(x: float, sigma: float) -> float:
    return math.exp(-(x * x) / (2.0 * sigma * sigma))


def build_profile(max_angle_deg: float, lut_size: int) -> list[list[float]]:
    lut = [[0.0, 0.0, 0.0, 0.0] for _ in range(lut_size)]

    sigma_primary = 0.36
    sigma_secondary = 0.48

    wavelengths = list(range(405, 701, 2))
    u_samples = 420

    for idx in range(lut_size):
        angle = max_angle_deg * idx / (lut_size - 1)

        r_acc = g_acc = b_acc = i_acc = 0.0

        for wl in wavelengths:
            n = refractive_index_water(float(wl))
            wr, wg, wb = wavelength_to_rgb(float(wl))

            for us in range(u_samples + 1):
                u = 0.999 * us / u_samples
                ang = rainbow_angles_deg(u, n)
                if ang is None:
                    continue

                # Sphere annulus weighting.
                sphere_w = max(1e-6, u)

                # Jacobian amplification near stationary points of theta(u).
                du = 0.999 / u_samples
                prev_ang = rainbow_angles_deg(max(0.0, u - du), n)
                next_ang = rainbow_angles_deg(min(0.999, u + du), n)
                if prev_ang and next_ang:
                    dth1 = (next_ang[0] - prev_ang[0]) / (2.0 * du)
                    dth2 = (next_ang[1] - prev_ang[1]) / (2.0 * du)
                else:
                    dth1 = dth2 = 0.0

                jac1 = min(4.5, 1.0 / (abs(dth1) + 0.45))
                jac2 = min(4.5, 1.0 / (abs(dth2) + 0.45))

                i_rad = math.asin(u)
                r_rad = math.asin(math.sin(i_rad) / n)

                r_entry = fresnel_unpolarized(1.0003, n, math.cos(i_rad))
                t_entry = 1.0 - r_entry
                r_internal = fresnel_unpolarized(n, 1.0003, math.cos(r_rad))
                t_exit = 1.0 - fresnel_unpolarized(n, 1.0003, math.cos(r_rad))

                w1 = t_entry * r_internal * t_exit
                w2 = t_entry * (r_internal**2) * t_exit

                k1 = gaussian(angle - ang[0], sigma_primary)
                k2 = gaussian(angle - ang[1], sigma_secondary)

                # Slightly boost secondary so it remains visible in finite-sample LUT output.
                w = sphere_w * (w1 * jac1 * k1 + 1.7 * w2 * jac2 * k2)

                r_acc += w * wr
                g_acc += w * wg
                b_acc += w * wb
                i_acc += w

        retro = 0.008 * math.exp(-0.5 * (angle / 1.3) ** 2)
        inner = 0.02 * math.exp(-0.5 * ((angle - 34.0) / 6.8) ** 2)

        lut[idx] = [r_acc + retro, g_acc + retro, b_acc + retro, i_acc + retro + inner]

    max_rgb = 1e-9
    max_i = 1e-9
    for r, g, b, i in lut:
        max_rgb = max(max_rgb, r, g, b)
        max_i = max(max_i, i)

    for i in range(lut_size):
        r, g, b, s = lut[i]
        lut[i] = [r / max_rgb, g / max_rgb, b / max_rgb, s / max_i]

    # Final smoothing pass across angle.
    radius = 3
    sigma = 1.2
    k = []
    k_sum = 0.0
    for j in range(-radius, radius + 1):
        w = math.exp(-(j * j) / (2.0 * sigma * sigma))
        k.append(w)
        k_sum += w

    out = [[0.0, 0.0, 0.0, 0.0] for _ in range(lut_size)]
    for i in range(lut_size):
        rr = gg = bb = ii = 0.0
        for j in range(-radius, radius + 1):
            idx = max(0, min(lut_size - 1, i + j))
            kw = k[j + radius] / k_sum
            rr += lut[idx][0] * kw
            gg += lut[idx][1] * kw
            bb += lut[idx][2] * kw
            ii += lut[idx][3] * kw

        # Soft tone map for intensity peaks.
        tone_k = 4.8
        ii = math.log1p(tone_k * max(0.0, ii)) / math.log1p(tone_k)

        out[i] = [rr, gg, bb, ii]

    return out


def resolve_output_path(path_str: str) -> Path:
    path = Path(path_str)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def write_png_rgb(path: Path, width: int, height: int, rgb_bytes: bytes) -> None:
    if len(rgb_bytes) != width * height * 3:
        raise ValueError('RGB payload size does not match width*height*3')

    def chunk(tag: bytes, data: bytes) -> bytes:
        head = struct.pack('>I', len(data)) + tag + data
        crc = zlib.crc32(tag)
        crc = zlib.crc32(data, crc)
        return head + struct.pack('>I', crc & 0xFFFFFFFF)

    raw = bytearray()
    stride = width * 3
    for y in range(height):
        raw.append(0)
        start = y * stride
        raw.extend(rgb_bytes[start : start + stride])

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    compressed = zlib.compress(bytes(raw), level=9)

    png = bytearray()
    png.extend(b'\x89PNG\r\n\x1a\n')
    png.extend(chunk(b'IHDR', ihdr))
    png.extend(chunk(b'IDAT', compressed))
    png.extend(chunk(b'IEND', b''))
    path.write_bytes(bytes(png))


def render_profile_preview(lut: list[list[float]], width: int, height: int) -> bytes:
    def to_byte(x: float) -> int:
        return max(0, min(255, int(round(x))))

    pad = 10
    hue_top = 20
    hue_h = max(20, int(height * 0.16))
    phys_top = hue_top + hue_h + 8
    phys_h = max(28, int(height * 0.22))
    graph_top = phys_top + phys_h + 12
    graph_h = max(56, height - graph_top - 14)

    bg_r, bg_g, bg_b = 16, 21, 28
    data = bytearray(width * height * 3)
    for i in range(0, len(data), 3):
        data[i] = bg_r
        data[i + 1] = bg_g
        data[i + 2] = bg_b

    def put(x: int, y: int, r: int, g: int, b: int) -> None:
        if x < 0 or y < 0 or x >= width or y >= height:
            return
        idx = (y * width + x) * 3
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b

    n = len(lut)

    # Detect primary and secondary intensity peaks for display-centric emphasis.
    peaks: list[tuple[float, int]] = []
    for i in range(1, n - 1):
        c = lut[i][3]
        if c >= lut[i - 1][3] and c >= lut[i + 1][3]:
            peaks.append((c, i))
    peaks.sort(reverse=True)
    primary_idx = peaks[0][1] if peaks else int(0.65 * n)
    secondary_idx = primary_idx
    for _, i in peaks[1:]:
        if i > primary_idx + int(0.05 * n):
            secondary_idx = i
            break
    for x in range(width):
        t = x / max(1, width - 1)
        idx = min(n - 1, int(t * (n - 1)))
        r, g, b, inten = lut[idx]

        # Hue-only band: normalize away luminance so color ordering is easy to read.
        m = max(1e-6, r, g, b)
        hue_r = to_byte((r / m) * 255)
        hue_g = to_byte((g / m) * 255)
        hue_b = to_byte((b / m) * 255)
        for y in range(hue_top, hue_top + hue_h):
            put(x, y, hue_r, hue_g, hue_b)

        # Physical band: brighter inner-left haze and clearer secondary bow.
        sec_sigma = max(3.0, 0.028 * n)
        sec_boost = math.exp(-0.5 * ((idx - secondary_idx) / sec_sigma) ** 2)
        prim_sigma = max(3.0, 0.018 * n)
        prim_boost = math.exp(-0.5 * ((idx - primary_idx) / prim_sigma) ** 2)

        base_lum = inten**0.62
        gain = 0.32 + 1.9 * base_lum

        # Whitish brightening toward the inner side (left of primary).
        left_haze = max(0.0, min(1.0, (primary_idx - idx) / max(1.0, 0.58 * n)))
        haze = 0.58 * (left_haze**0.75) * (0.55 + 0.45 * base_lum)

        # Increase bow visibility, especially secondary on the right.
        chroma_boost = 1.0 + 0.35 * prim_boost + 1.35 * sec_boost

        pr = max(0.0, min(1.0, r * gain * chroma_boost))
        pg = max(0.0, min(1.0, g * gain * chroma_boost))
        pb = max(0.0, min(1.0, b * gain * chroma_boost))

        rc = to_byte((pr * (1.0 - haze) + haze) * 255)
        gc = to_byte((pg * (1.0 - haze) + haze) * 255)
        bc = to_byte((pb * (1.0 - haze) + haze) * 255)

        for y in range(phys_top, phys_top + phys_h):
            put(x, y, rc, gc, bc)

    # Curves for R, G, B, and intensity over angle.
    for x in range(pad, width - pad):
        t = x / max(1, width - 1)
        idx = min(n - 1, int(t * (n - 1)))
        rv, gv, bv, inten = lut[idx]

        yi = graph_top + int((1.0 - max(0.0, min(1.0, inten))) * (graph_h - 1))
        yr = graph_top + int((1.0 - max(0.0, min(1.0, rv))) * (graph_h - 1))
        yg = graph_top + int((1.0 - max(0.0, min(1.0, gv))) * (graph_h - 1))
        yb = graph_top + int((1.0 - max(0.0, min(1.0, bv))) * (graph_h - 1))

        put(x, yi, 245, 240, 205)
        put(x, yr, 255, 120, 120)
        put(x, yg, 120, 245, 150)
        put(x, yb, 140, 180, 255)

        # Slightly thicken intensity line.
        if yi + 1 < graph_top + graph_h:
            put(x, yi + 1, 220, 210, 170)

    # Border lines around boxes.
    line = (110, 128, 149)
    for x in range(pad, width - pad):
        put(x, hue_top - 1, *line)
        put(x, hue_top + hue_h, *line)
        put(x, phys_top - 1, *line)
        put(x, phys_top + phys_h, *line)
        put(x, graph_top - 1, *line)
        put(x, graph_top + graph_h, *line)
    for y in range(hue_top - 1, hue_top + hue_h + 1):
        put(pad, y, *line)
        put(width - pad - 1, y, *line)
    for y in range(phys_top - 1, phys_top + phys_h + 1):
        put(pad, y, *line)
        put(width - pad - 1, y, *line)
    for y in range(graph_top - 1, graph_top + graph_h + 1):
        put(pad, y, *line)
        put(width - pad - 1, y, *line)

    # Reference vertical grid to visually locate bow angles.
    grid = (64, 78, 94)
    for i in range(0, 7):
        gx = pad + int((width - 2 * pad - 1) * (i / 6.0))
        for y in range(hue_top - 1, graph_top + graph_h + 1):
            if y % 2 == 0:
                put(gx, y, *grid)

    return bytes(data)


def write_profile_image(path: Path, lut: list[list[float]], width: int = 1400, height: int = 320) -> None:
    rgb = render_profile_preview(lut, width, height)
    ext = path.suffix.lower()

    if ext in {'.png'}:
        write_png_rgb(path, width, height, rgb)
        return

    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
        tmp_png = Path(tmp.name)
    try:
        write_png_rgb(tmp_png, width, height, rgb)

        if ext in {'.jpg', '.jpeg'} and shutil.which('sips'):
            cmd = ['sips', '-s', 'format', 'jpeg', str(tmp_png), '--out', str(path)]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0:
                return

        # Fallback if JPEG conversion is unavailable.
        fallback = path.with_suffix('.png') if ext in {'.jpg', '.jpeg'} else path
        write_png_rgb(fallback, width, height, rgb)
    finally:
        if tmp_png.exists():
            tmp_png.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(description='Precompute rainbow radial LUT')
    parser.add_argument(
        '--output-json',
        default='src/rainbow_web/src/data/rainbow_profile.generated.json',
        help='Output JSON path',
    )
    parser.add_argument(
        '--output-ts',
        default='src/rainbow_web/src/data/rainbow_profile.generated.ts',
        help='Output TypeScript module path',
    )
    parser.add_argument(
        '--output-image',
        default='src/rainbow_web/public/rainbow_profile.jpg',
        help='Output profile preview image path (jpg or png)',
    )
    parser.add_argument('--max-angle', type=float, default=65.0)
    parser.add_argument('--lut-size', type=int, default=1024)
    args = parser.parse_args()

    lut = build_profile(args.max_angle, args.lut_size)

    out = {
        'version': 1,
        'maxAngleDeg': args.max_angle,
        'lutSize': args.lut_size,
        'lut': lut,
        'notes': 'Generated by tools/precompute_rainbow_profile.py',
    }

    json_path = resolve_output_path(args.output_json)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(out, separators=(',', ':'))
    json_path.write_text(payload, encoding='utf-8')
    print(f'Wrote {json_path}')

    ts_path = resolve_output_path(args.output_ts)
    ts_path.parent.mkdir(parents=True, exist_ok=True)
    ts_content = (
        '// Auto-generated by tools/precompute_rainbow_profile.py\n'
        'export const generatedRainbowProfile = '
        + payload
        + ' as const;\n'
    )
    ts_path.write_text(ts_content, encoding='utf-8')
    print(f'Wrote {ts_path}')

    image_path = resolve_output_path(args.output_image)
    image_path.parent.mkdir(parents=True, exist_ok=True)
    write_profile_image(image_path, lut)
    print(f'Wrote {image_path}')


if __name__ == '__main__':
    main()
