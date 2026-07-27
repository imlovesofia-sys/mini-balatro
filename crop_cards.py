from PIL import Image
import os

img = Image.open(r'D:\fortuna\sprit.jpg')
w, h = img.size

cols, rows = 6, 3
cell_w = w // cols
cell_h = h // rows

mapping = {
    (0,0): 't1',   # O Mago
    (0,1): 't2',   # A Sacerdotisa
    (0,2): 't3',   # A Imperatriz
    (0,3): 't4',   # O Corvo
    (0,4): 't5',   # O Louco
    (0,5): 't6',   # Lovely
    (1,0): 't7',   # O Sol
    (1,1): 't8',   # Os Amantes
    (1,2): 't9',   # A Tempestade
    (1,3): 't10',  # A Roleta
    (1,4): 't11',  # O Martelo
    (1,5): 't12',  # A Lua
    (2,0): 't13',  # A Estrela
    (2,1): 't14',  # A Forca
    (2,2): 't15',  # A Justica
    (2,3): 't16',  # Boca de Fumo
    (2,4): 't17',  # O Negao
    (2,5): 't18',  # Ganancia
}

out_dir = r'C:\Users\Arthur\balatro-web\public\img\fortuna'
os.makedirs(out_dir, exist_ok=True)

for (row, col), card_id in mapping.items():
    left = col * cell_w
    top = row * cell_h
    right = left + cell_w
    bottom = top + cell_h

    card_img = img.crop((left, top, right, bottom))
    card_img.save(os.path.join(out_dir, f'{card_id}.png'))
    print(f'Salvo: {card_id}.png ({cell_w}x{cell_h})')

print(f'\nTotal: {len(mapping)} cartas recortadas')
