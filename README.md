# KPI Prototype (Saisie + Dashboard)

## Configuration
- Créez un fichier `.env` (ou configurez les variables sur Vercel) :
  ```env
  VITE_API_URL=https://script.google.com/macros/s/xxxxxxxxxxxxxxxx/exec
  VITE_API_KEY=L230_test123
  ```

## Scripts
```bash
npm install
npm run dev     # dev local
npm run build   # build production (dist/)
npm run preview # prévisualisation du build
```

## Déploiement (Vercel)
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Variables d'env: `VITE_API_URL`, `VITE_API_KEY`

## Notes
- L'onglet **Tableau de bord** est protégé par mot de passe: `2020Head`.
- La saisie envoie un POST `op=add` à l'API; les champs *prospects* et *gros devis* sont transmis aussi sous forme aplatie (`prospects_flat` / `quotes_flat`) pour stockage sur une seule cellule dans Google Sheet.