# Blefe — Roguelike de Pôquer

Jogo de cartas inspirado em roguelikes de pôquer, rodando no navegador.

## Rodar localmente

```bash
npm install
node server/server.js
```

Abra `http://localhost:3000` no navegador.

Amigos na mesma rede podem acessar pelo IP exibido no terminal (ex.: `http://192.168.x.x:3000`).

## Deploy (Render)

1. Suba este repositório no GitHub
2. Em https://render.com → **New → Web Service** → conecte o repositório
3. O Render detecta o `render.yaml` automaticamente (build: `npm install`, start: `node server/server.js`)
4. Pronto — URL pública tipo `https://blefe.onrender.com`

> ⚠️ No plano grátis do Render, o sistema de arquivos é temporário: o placar (`server/scores.json`) zera quando o servidor reinicia. Para placar permanente, seria preciso trocar o armazenamento por um banco de dados.

## Regras

- 3 blinds por run: Pequeno (300), Grande (450), Chefe (600 + efeito especial)
- 4 mãos e 3 descartes por rodada
- Jogue 1-5 cartas para montar mãos de pôquer — só as cartas do combo pontuam
- Loja entre blinds: 2 curingas + 2 consumíveis (Tarô/Espectral), 100% aleatória
- Pontuação final = soma das fichas dos 3 blinds → vai pro pódio online
