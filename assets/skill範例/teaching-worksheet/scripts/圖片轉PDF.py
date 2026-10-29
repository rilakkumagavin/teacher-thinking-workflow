"""將已下載的學生圖片等比置入 A4 PDF，不改動原圖。需 reportlab。"""
import argparse
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, help="新PDF完整路徑，不覆寫既有檔")
    parser.add_argument("images", nargs="+", help="按頁序列出圖片")
    args = parser.parse_args()
    target = Path(args.output)
    if target.exists():
        parser.error("輸出檔已存在，請改用新版本檔名。")
    pictures = []
    for item in args.images:
        source = Path(item)
        if not source.is_file():
            parser.error("找不到圖片：" + str(source))
        image = ImageReader(str(source))
        width, height = image.getSize()
        pictures.append((image, width, height))
    target.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(target), pagesize=landscape(A4))
    for image, width, height in pictures:
        pw, ph = landscape(A4) if width >= height else A4
        pdf.setPageSize((pw, ph))
        scale = min((pw - 24) / width, (ph - 24) / height)
        iw, ih = width * scale, height * scale
        pdf.drawImage(image, (pw - iw) / 2, (ph - ih) / 2, width=iw, height=ih, preserveAspectRatio=True, mask="auto")
        pdf.showPage()
    pdf.save()
    print(str(target.resolve()))


if __name__ == "__main__":
    main()
