# -*- coding: utf-8 -*-
"""
生成 MiniMark 极简 Windows 应用图标 (.ico / .png)
"""
import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_minimark_icon():
    os.makedirs("assets", exist_ok=True)
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. 绘制带有圆角与微渐变的高质感背景 (Squircle)
    margin = 28
    radius = 110
    
    # 渐变底色
    base_bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(base_bg)
    
    for y in range(margin, size - margin):
        # 渐变从顶部 #0366D6 到底部 #0958D9
        ratio = (y - margin) / (size - 2 * margin)
        r = int(3 + ratio * (9 - 3))
        g = int(102 - ratio * (102 - 88))
        b = int(214 + ratio * (233 - 214))
        bg_draw.line([(margin, y), (size - margin, y)], fill=(r, g, b, 255))

    # 创建圆角蒙版
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=255
    )

    # 阴影层
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        [margin + 4, margin + 12, size - margin - 4, size - margin + 12],
        radius=radius,
        fill=(0, 0, 0, 90)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(16))
    
    # 复合阴影与底图
    final_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final_img.paste(shadow, (0, 0), shadow)
    final_img.paste(base_bg, (0, 0), mask)

    # 2. 绘制应用内部标志性图标：3D 层叠菱形文档 (Layers/Sheets)
    # 坐标系基于 512x512
    draw_fg = ImageDraw.Draw(final_img)

    def draw_layer_top(cx, cy, rx, ry, fill_color, stroke_color, width=12):
        # 顶部完整菱形
        points = [
            (cx, cy - ry),
            (cx + rx, cy),
            (cx, cy + ry),
            (cx - rx, cy)
        ]
        draw_fg.polygon(points, fill=fill_color)
        draw_fg.line(points + [points[0]], fill=stroke_color, width=width, joint="round")

    def draw_layer_shelf(cx, cy, rx, ry, fill_color, stroke_color, width=12):
        # 下方折线层 (V 形翼)
        points = [
            (cx - rx, cy),
            (cx, cy + ry),
            (cx + rx, cy),
            (cx + rx, cy + 18),
            (cx, cy + ry + 18),
            (cx - rx, cy + 18)
        ]
        draw_fg.polygon(points, fill=fill_color)
        stroke_pts = [
            (cx - rx, cy),
            (cx, cy + ry),
            (cx + rx, cy)
        ]
        draw_fg.line(stroke_pts, fill=stroke_color, width=width, joint="round")

    cx, cy = 256, 175
    rx, ry = 145, 75

    # 顶层菱形
    draw_layer_top(cx, cy, rx, ry, (255, 255, 255, 250), (255, 255, 255, 255), width=14)
    
    # 顶部菱形内部点缀 Markdown "M" 极简标志线条
    m_pts = [
        (cx - 70, cy + 15),
        (cx - 70, cy - 25),
        (cx - 35, cy - 2),
        (cx, cy - 25),
        (cx + 35, cy - 2),
        (cx + 70, cy - 25),
        (cx + 70, cy + 15)
    ]
    draw_fg.line(m_pts, fill=(3, 102, 214, 230), width=10, joint="round")

    # 中间折层
    draw_layer_shelf(cx, cy + 95, rx, ry, (255, 255, 255, 180), (255, 255, 255, 240), width=14)

    # 底部折层
    draw_layer_shelf(cx, cy + 190, rx, ry, (255, 255, 255, 120), (255, 255, 255, 220), width=14)

    # 3. 保存高清 PNG
    png_path = os.path.join("assets", "app.png")
    final_img.save(png_path, "PNG")

    # 4. 保存多尺寸标准 Windows .ico (256, 128, 64, 48, 32, 16)
    ico_path = os.path.join("assets", "app.ico")
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    final_img.save(ico_path, format="ICO", sizes=icon_sizes)
    
    print(f"Icons created successfully:\n - {png_path}\n - {ico_path}")

if __name__ == "__main__":
    create_minimark_icon()
