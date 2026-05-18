"""
Generate per-category fallback thumbnails for TopSnip feed cards.
Outputs 1200x630 PNGs to public/categories/<slug>.png.
Each card is a themed gradient with the category title in nice typography.
Brand accent: #7C6AF7. Dark bg: #080808 / #111.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import os

OUT = Path(__file__).resolve().parent.parent / "public" / "categories"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1200, 630

# Per-category palette: (gradient_top, gradient_bottom, accent, glyph)
CATS = {
    "model-launch":  ((28, 14, 56),   (8, 8, 8),    (180, 130, 247), "Model Launch",  "M"),
    "tool-update":   ((10, 30, 56),   (8, 8, 8),    (100, 170, 255), "Tool Update",   "T"),
    "research":      ((8, 40, 28),    (8, 8, 8),    (110, 220, 160), "Research",      "R"),
    "policy":        ((52, 14, 14),   (8, 8, 8),    (255, 120, 120), "Policy",        "P"),
    "tutorial":      ((52, 42, 8),    (8, 8, 8),    (255, 210, 100), "Tutorial",      "U"),
    "industry":      ((22, 22, 28),   (8, 8, 8),    (180, 180, 200), "Industry",      "I"),
    "opinion":       ((52, 28, 8),    (8, 8, 8),    (255, 165, 100), "Opinion",       "O"),
    "default":       ((22, 18, 40),   (8, 8, 8),    (124, 106, 247), "AI Update",     "AI"),
}

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def diagonal_gradient(top_color, bot_color):
    img = Image.new("RGB", (W, H), top_color)
    # vertical-ish gradient with slight diagonal feel
    for y in range(H):
        t = y / (H - 1)
        row = lerp(top_color, bot_color, t)
        ImageDraw.Draw(img).line([(0, y), (W, y)], fill=row)
    return img

def soft_glow(img, accent):
    # large blurred ellipse top-left to suggest a light source
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    cx, cy = 220, 200
    r = 320
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*accent, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    return Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

def grid_overlay(img, accent):
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    step = 60
    line_color = (*accent, 18)
    for x in range(0, W, step):
        d.line([(x, 0), (x, H)], fill=line_color, width=1)
    for y in range(0, H, step):
        d.line([(0, y), (W, y)], fill=line_color, width=1)
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

def find_font(weight="bold", size=120):
    candidates = {
        "bold":    ["segoeuib.ttf", "arialbd.ttf", "seguibl.ttf"],
        "regular": ["segoeui.ttf", "arial.ttf"],
        "mono":    ["consola.ttf", "cour.ttf"],
    }[weight]
    win_fonts = Path("C:/Windows/Fonts")
    for c in candidates:
        p = win_fonts / c
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()

def render_card(slug, top, bot, accent, label, glyph):
    img = diagonal_gradient(top, bot)
    img = soft_glow(img, accent)
    img = grid_overlay(img, accent)

    draw = ImageDraw.Draw(img, "RGBA")

    # Brand wordmark top-right
    brand_font = find_font("bold", 32)
    draw.text((W - 60, 40), "TopSnip", font=brand_font, fill=(240, 240, 240, 230), anchor="ra")
    # purple accent dot on the S
    draw.ellipse([W - 198, 50, W - 188, 60], fill=(*accent, 255))

    # Big glyph (large circle with letter) — left side
    cx, cy, r = 280, H // 2, 130
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*accent, 35), outline=(*accent, 180), width=3)
    glyph_font = find_font("bold", 130 if len(glyph) == 1 else 96)
    draw.text((cx, cy + 8), glyph, font=glyph_font, fill=(*accent, 255), anchor="mm")

    # Category label — large, right of glyph
    label_font = find_font("bold", 96)
    draw.text((460, cy - 50), label, font=label_font, fill=(245, 245, 250, 255), anchor="lm")

    # Subtitle / tagline
    sub_font = find_font("regular", 32)
    draw.text((460, cy + 30), "AI Intelligence Feed", font=sub_font, fill=(170, 170, 200, 220), anchor="lm")

    # Bottom hairline
    draw.line([(60, H - 50), (W - 60, H - 50)], fill=(*accent, 90), width=2)

    out = OUT / f"{slug}.png"
    img.save(out, "PNG", optimize=True)
    print(f"  wrote {out.relative_to(OUT.parent.parent)} ({out.stat().st_size // 1024} KB)")

def main():
    print(f"Generating fallback thumbnails -> {OUT}")
    for slug, (top, bot, accent, label, glyph) in CATS.items():
        render_card(slug, top, bot, accent, label, glyph)
    print("Done.")

if __name__ == "__main__":
    main()
