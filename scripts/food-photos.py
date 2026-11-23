"""
Готує фото продуктів для застосунку: обрізає квадрат навколо продукту з полем,
зменшує до 256×256 і зберігає у public/foods/<id>.webp.

  python3 scripts/food-photos.py <id>=<шлях до файлу> [<id>=<шлях> ...]

Фон знаходить автоматично (колір кутів), тож тінь і відступ однакові у всіх фото.
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

OUT = Path(__file__).resolve().parent.parent / 'public' / 'foods'
SIZE = 256
PAD = 0.08  # поле навколо продукту від сторони квадрата


def process(src: Path, dst: Path) -> None:
    im = Image.open(src).convert('RGB')
    w, h = im.size
    corners = [im.getpixel(p) for p in ((4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5))]
    bg = tuple(sorted(c[i] for c in corners)[1] for i in range(3))
    diff = ImageChops.difference(im, Image.new('RGB', im.size, bg)).convert('L')
    # Поріг відсікає м'яку тінь; розмиття прибирає поодинокі шумні пікселі.
    mask = diff.filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 28 else 0)
    box = mask.getbbox() or (0, 0, w, h)
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    side = max(box[2] - box[0], box[3] - box[1]) / (1 - 2 * PAD)
    side = min(side, w, h)
    left = min(max(cx - side / 2, 0), w - side)
    top = min(max(cy - side / 2, 0), h - side)
    crop = im.crop((round(left), round(top), round(left + side), round(top + side)))
    crop.resize((SIZE, SIZE), Image.LANCZOS).save(dst, 'WEBP', quality=82, method=6)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for arg in sys.argv[1:]:
        fid, path = arg.split('=', 1)
        dst = OUT / f'{fid}.webp'
        process(Path(path), dst)
        print(f'{fid}: {dst.stat().st_size // 1024} КБ')
