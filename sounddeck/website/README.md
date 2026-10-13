# SoundDeck — Website

Landing page for [sounddeck.stream](https://sounddeck.stream).

## Stack

- **Astro 5** — static site generator
- **Tailwind CSS 4** — styling
- **Tabler Icons** — via CDN webfont
- **Inter** — font

## Dev

\`\`\`bash
npm install
npm run dev      # → http://localhost:4321
\`\`\`

## Build

\`\`\`bash
npm run build    # → dist/
npm run preview  # preview built site
\`\`\`

## Structure

\`\`\`
src/
├── components/     # Hero, Features, Showcase, HowItWorks, ProPlugins, FAQ…
├── i18n/           # fr.json, en.json, es.json + helpers
├── layouts/        # BaseLayout.astro
├── pages/
│   ├── index.astro     # FR (défaut)
│   ├── en/index.astro
│   └── es/index.astro
└── styles/         # global.css (Tailwind + design tokens)
\`\`\`

## Deployment

Deployed on **Cloudflare Pages** with automatic builds from `main`.

- **Build command**: `cd website && npm install && npm run build`
- **Output directory**: `website/dist`
- **Node version**: `20`

## Ajouter une traduction

1. Édite `src/i18n/fr.json`, `en.json`, `es.json`
2. Ajoute le composant dans les 3 `pages/*/index.astro` si nouveau

## Ajouter une section

1. Crée `src/components/MaSection.astro`
2. Ajoute les clés i18n dans les 3 JSON
3. Importe-le dans les 3 `pages/*/index.astro`
4. Ajoute `data-reveal="up"` sur les blocs pour bénéficier des scroll animations