# KPI – Prototype (Option 2 avec 5 champs Prospects & Devis)

## Local
```
npm i
cp .env.example .env.local
npm run dev
```

## Vercel
- Build: `npm run build`
- Output: `dist`
- Env: `VITE_REMOTE_ENDPOINT`, `VITE_REMOTE_TOKEN`

## Schéma (Google Sheet: onglet `kpi`)
```
id,rep,week,calls,new_contacts,emails,meetings,revenue_eur,gross_margin_pct,prospects,pending_quotes,notes,createdAt
```
- `prospects` et `pending_quotes` sont des **chaînes**: les 5 champs sont concaténés par des virgules.
