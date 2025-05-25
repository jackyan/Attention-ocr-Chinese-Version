#!/usr/bin/env python3
"""
简单的图标生成脚本
创建基本的 PNG 图标文件供插件使用
"""

import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(size, output_path):
    """创建一个简单的图标"""
    # 创建图像
    img = Image.new('RGBA', (size, size), (9, 105, 218, 255))  # GitHub 蓝色
    draw = ImageDraw.Draw(img)
    
    # 绘制圆形背景
    margin = max(2, size // 20)
    draw.ellipse([margin, margin, size - margin, size - margin], 
                fill=(9, 105, 218, 255), outline=(255, 255, 255, 255), width=max(1, size // 40))
    
    # 绘制简单的书本图标
    book_margin = size // 4
    book_width = size - 2 * book_margin
    book_height = book_width * 3 // 4
    book_x = book_margin
    book_y = (size - book_height) // 2
    
    # 书本背景
    draw.rectangle([book_x, book_y, book_x + book_width, book_y + book_height], 
                  fill=(255, 255, 255, 255))
    
    # 书本页面线条
    if size >= 32:
        line_spacing = max(2, book_height // 6)
        line_margin = max(2, book_width // 8)
        for i in range(3):
            y = book_y + line_spacing + i * line_spacing
            draw.line([book_x + line_margin, y, book_x + book_width - line_margin, y], 
                     fill=(101, 109, 118, 255), width=max(1, size // 64))
    
    # 添加 "W" 字母
    if size >= 24:
        try:
            font_size = max(8, size // 6)
            # 使用系统默认字体
            font = ImageFont.load_default()
            
            # 绘制白色圆圈
            w_size = max(12, size // 8)
            w_x = size - w_size - margin - 2
            w_y = size - w_size - margin - 2
            draw.ellipse([w_x - 2, w_y - 2, w_x + w_size + 2, w_y + w_size + 2], 
                        fill=(255, 255, 255, 255))
            
            # 绘制 "W" 字母
            text_bbox = draw.textbbox((0, 0), "W", font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_height = text_bbox[3] - text_bbox[1]
            text_x = w_x + (w_size - text_width) // 2
            text_y = w_y + (w_size - text_height) // 2 - 1
            draw.text((text_x, text_y), "W", fill=(9, 105, 218, 255), font=font)
        except:
            pass  # 如果字体处理失败，跳过文字
    
    # 保存图像
    img.save(output_path, 'PNG')
    print(f"Created {output_path}")

def main():
    """主函数"""
    # 确保目录存在
    public_dir = os.path.join(os.path.dirname(__file__), '..', 'public')
    os.makedirs(public_dir, exist_ok=True)
    
    # 创建不同尺寸的图标
    sizes = [16, 24, 48, 128]
    for size in sizes:
        output_path = os.path.join(public_dir, f'icon-{size}.png')
        create_icon(size, output_path)
    
    print("\n所有图标已创建完成！")
    print("注意：这些是基本的程序生成图标。")
    print("在生产环境中，建议使用专业设计的图标。")

if __name__ == '__main__':
    main() 