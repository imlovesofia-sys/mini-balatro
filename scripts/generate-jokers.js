const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'img', 'jokers');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const JOKERS = [
  { id: 'j21', name: 'O ACIONISTA', icon: '📈', bg: '#1a3a2a', accent: '#4ade80', border: '#22c55e' },
  { id: 'j22', name: 'FUNDO IMOB.', icon: '🏠', bg: '#2a1a3a', accent: '#a78bfa', border: '#8b5cf6' },
  { id: 'j23', name: 'A PLANILHA', icon: '📊', bg: '#1a2a3a', accent: '#60a5fa', border: '#3b82f6' },
  { id: 'j24', name: 'HOME BROKER', icon: '💻', bg: '#3a2a1a', accent: '#fbbf24', border: '#f59e0b' },
  { id: 'j25', name: 'A ROTA', icon: '🚗', bg: '#1a3a3a', accent: '#2dd4bf', border: '#14b8a6' },
  { id: 'j26', name: 'ORIENT. OBJ.', icon: '🧩', bg: '#3a1a2a', accent: '#f472b6', border: '#ec4899' },
  { id: 'j27', name: 'O TERMINAL', icon: '🖥️', bg: '#0a1a0a', accent: '#4ade80', border: '#16a34a' },
  { id: 'j28', name: 'SOPHIA', icon: '🤖', bg: '#1a1a3a', accent: '#818cf8', border: '#6366f1' },
  { id: 'j29', name: 'BUG SINTAXE', icon: '🐛', bg: '#3a0a0a', accent: '#f87171', border: '#ef4444' },
  { id: 'j30', name: 'SOCKET ANTIGO', icon: '🔌', bg: '#2a2a1a', accent: '#a3a3a3', border: '#737373' },
  { id: 'j31', name: 'MODO MAX', icon: '⚡', bg: '#3a3a0a', accent: '#facc15', border: '#eab308' },
  { id: 'j32', name: 'FRAME PERFEITO', icon: '🎨', bg: '#2a1a3a', accent: '#c084fc', border: '#a855f7' },
  { id: 'j33', name: 'CANCEL. ANIM.', icon: '🎬', bg: '#1a2a2a', accent: '#5eead4', border: '#2dd4bf' },
  { id: 'j34', name: 'SWITCH MAGNÉT.', icon: '🧲', bg: '#3a1a1a', accent: '#fb923c', border: '#f97316' },
  { id: 'j35', name: 'OVERCLOCK', icon: '🔥', bg: '#3a0a1a', accent: '#fb7185', border: '#f43f5e' },
  { id: 'j36', name: 'CAVALEIRO VAZIO', icon: '🪨', bg: '#2a2a2a', accent: '#a8a29e', border: '#78716c' },
  { id: 'j37', name: 'FERRÃO AFIADO', icon: '🗡️', bg: '#1a1a2a', accent: '#94a3b8', border: '#64748b' },
  { id: 'j38', name: 'A TECELÃ', icon: '🧵', bg: '#2a1a2a', accent: '#e879f9', border: '#d946ef' },
  { id: 'j39', name: 'ESCALA', icon: '🎵', bg: '#1a2a1a', accent: '#86efac', border: '#4ade80' },
  { id: 'j40', name: 'LITORÂNEO', icon: '🌊', bg: '#0a2a3a', accent: '#38bdf8', border: '#0ea5e9' },
];

function createSvg(joker) {
  return `<svg width="180" height="260" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${joker.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000;stop-opacity:0.8" />
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.15);stop-opacity:1" />
      <stop offset="50%" style="stop-color:rgba(255,255,255,0);stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Card background -->
  <rect x="0" y="0" width="180" height="260" rx="14" fill="url(#bg)" stroke="${joker.border}" stroke-width="4"/>

  <!-- Shine overlay -->
  <rect x="0" y="0" width="180" height="260" rx="14" fill="url(#shine)"/>

  <!-- Top decoration -->
  <line x1="24" y1="10" x2="156" y2="10" stroke="${joker.accent}" stroke-width="2" opacity="0.4"/>

  <!-- Icon circle -->
  <circle cx="90" cy="105" r="48" fill="rgba(0,0,0,0.4)" stroke="${joker.accent}" stroke-width="3"/>
  <text x="90" y="120" font-size="56" text-anchor="middle" dominant-baseline="middle">${joker.icon}</text>

  <!-- Name background -->
  <rect x="12" y="175" width="156" height="36" rx="8" fill="rgba(0,0,0,0.6)"/>

  <!-- Name -->
  <text x="90" y="199" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${joker.accent}" text-anchor="middle" letter-spacing="1.5">${joker.name}</text>

  <!-- Bottom decoration -->
  <line x1="24" y1="250" x2="156" y2="250" stroke="${joker.accent}" stroke-width="2" opacity="0.4"/>

  <!-- Corner dots -->
  <circle cx="20" cy="22" r="4" fill="${joker.accent}" opacity="0.6"/>
  <circle cx="160" cy="22" r="4" fill="${joker.accent}" opacity="0.6"/>
  <circle cx="20" cy="238" r="4" fill="${joker.accent}" opacity="0.6"/>
  <circle cx="160" cy="238" r="4" fill="${joker.accent}" opacity="0.6"/>
</svg>`;
}

async function generate() {
  for (const joker of JOKERS) {
    const svg = createSvg(joker);
    const outPath = path.join(OUTPUT_DIR, `${joker.id}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    console.log(`✓ ${joker.id}.png — ${joker.name}`);
  }
  console.log(`\n✅ ${JOKERS.length} imagens geradas em ${OUTPUT_DIR}`);
}

generate().catch(console.error);
