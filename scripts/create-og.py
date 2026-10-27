"""Generate the static typographic OGP asset with Pillow (development-only)."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import argparse
parser=argparse.ArgumentParser()
parser.add_argument('--font', default='/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc')
args=parser.parse_args()
font=lambda n: ImageFont.truetype(args.font,n)
im=Image.new('RGB',(1200,630),'#f2f2f7');d=ImageDraw.Draw(im)
d.rounded_rectangle((64,64,1136,566),radius=32,fill='white')
d.rounded_rectangle((108,104,196,192),radius=22,fill='#007aff')
for x,h in [(130,23),(152,47),(174,35)]:d.line((x,167,x,167-h),fill='white',width=9)
d.text((222,115),'API COST ESTIMATOR',font=font(24),fill='#62626b')
d.text((108,230),'API料金メーター',font=font(72),fill='#111116')
d.text((112,345),'月額を見積もり、コードを生成。',font=font(34),fill='#51515b')
d.text((112,449),'Claude  /  OpenAI  /  Gemini',font=font(27),fill='#007aff')
Path('public/api-cost/assets').mkdir(parents=True,exist_ok=True)
im.save('public/api-cost/assets/og.png',optimize=True)
