# Convention `data-testid`

## Format
`{domaine}-{element}` ou `{domaine}-{element}-{variant}`

Tout en **kebab-case**.

## Domaines
- `home-`     : page Mes sons
- `options-`  : page Options
- `editor-`   : Éditeur
- `sequencer-`: Séquenceur
- `trimmer-`  : Rogneur
- `stats-`    : Statistiques
- `guide-`    : Guide
- `presentation-` : Présentation
- `welcome-`  : Écran d'accueil
- `emoji-`    : Emojis
- `plugin-`   : Plugins génériques
- `discover-` : MyInstants
- `youtube-`  : YouTube

## Règles
1. **Jamais** utiliser de texte visible (casse à la traduction)
2. **Jamais** utiliser de classe CSS (casse au refactor)
3. **Préférer** les attributs stables : `data-testid="editor-play-button"`
4. **Pour les listes** : `data-testid="sound-card-{id}"` ou `data-testid="playlist-item-{id}"`
5. **Pour les éléments conditionnels** : toujours un testid même si masqué (`data-testid="editor-markers-panel"` présent dans le DOM uniquement quand ouvert est OK)

## Exemples
✅ `<button data-testid="editor-play-button">`
✅ `<div data-testid="sound-card-abc-123">`
✅ `<input data-testid="options-search-input">`

❌ `<button className="play-btn">` (classe instable)
❌ `<button>Play</button>` (texte traduit)
❌ `<div data-testid="button1">` (non sémantique)