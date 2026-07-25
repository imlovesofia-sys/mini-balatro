import sharp from 'sharp';

const W = 1024, H = 559;
const colors = [
  '#4a9eff','#f59e0b','#60a5fa','#a78bfa',
  '#f97316','#c084fc','#22d3ee','#e879f9',
  '#ef4444','#a3a3a3','#f43f5e','#fbbf24',
  '#38bdf8','#f472b6','#fb923c','#a1a1aa',
  '#d4d4d8','#c4b5fd','#facc15','#22d3ee'
];
const cuts = [
  {x:30,y:15,w:220,h:130},{x:270,y:15,w:220,h:130},{x:510,y:15,w:220,h:130},{x:750,y:15,w:220,h:130},
  {x:30,y:155,w:220,h:130},{x:270,y:155,w:220,h:130},{x:510,y:155,w:220,h:130},{x:750,y:155,w:220,h:130},
  {x:10,y:295,w:165,h:120},{x:180,y:295,w:165,h:120},{x:350,y:295,w:165,h:120},{x:520,y:295,w:165,h:120},
  {x:690,y:295,w:165,h:120},{x:860,y:295,w:165,h:120},
  {x:10,y:425,w:165,h:120},{x:180,y:425,w:165,h:120},{x:350,y:425,w:165,h:120},
  {x:520,y:425,w:165,h:120},{x:690,y:425,w:165,h:120},{x:860,y:425,w:165,h:120}
];

const bg = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 26, g: 26, b: 46 } } }).png().toBuffer();

const composites = cuts.map((c, i) => ({
  input: Buffer.from(`<svg width="${c.w}" height="${c.h}"><rect width="${c.w}" height="${c.h}" rx="6" fill="${colors[i]}" opacity="0.7"/><text x="${c.w/2}" y="${c.h/2}" text-anchor="middle" dominant-baseline="middle" font-size="14" font-family="monospace" fill="white">J${i+1}</text></svg>`),
  top: c.y,
  left: c.x
}));

await sharp(bg).composite(composites).jpeg({ quality: 80 }).toFile('public/img/corigas.jpg');
console.log('Placeholder sprite sheet created!');
