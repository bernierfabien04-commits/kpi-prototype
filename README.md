# KPI – Prototype (React + Vite + Tailwind)

## 1) Prérequis
- Node.js 18+
- Apps Script déployé en Web App (GET/POST) et Google Sheet prête

## 2) Installation
```bash
npm i
cp .env.example .env.local
# éditez .env.local avec :
# VITE_REMOTE_ENDPOINT=https://script.google.com/macros/s/.../exec
# VITE_REMOTE_TOKEN=L230_test123
```

## 3) Lancer en local
```bash
npm run dev
# Ouvrez http://localhost:5173
```

## 4) Déploiement
- **Vercel** ou **Netlify** : définissez `VITE_REMOTE_ENDPOINT` et `VITE_REMOTE_TOKEN` dans les variables d’environnement du projet.
- Build command: `npm run build`
- Publish directory: `dist`

## 5) Remarques
- Les données sont stockées dans Google Sheets via Apps Script et en local (localStorage) pour confort.
- Export/Import CSV dispo.
- Palette de couleurs Emerald.
