import sharp from 'sharp';
for (let i = 21; i <= 40; i++) {
  const m = await sharp(`public/img/jokers/j${i}.png`).metadata();
  console.log(`j${i}: ${m.width}x${m.height}`);
}
