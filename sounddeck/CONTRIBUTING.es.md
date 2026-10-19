# 🤝 Contribuir a SoundDeck

¡Gracias por tomarte el tiempo de contribuir! 🎉

Este documento explica cómo contribuir a SoundDeck: reportar bugs, proponer funcionalidades, enviar pull requests y respetar las convenciones de código.

**🌍 Idiomas:** [English](./CONTRIBUTING.md) · [Français](./CONTRIBUTING.fr.md) · **Español**

---

## 📋 Índice

- [Código de conducta](#-código-de-conducta)
- [¿Cómo puedo contribuir?](#-cómo-puedo-contribuir)
- [Entorno de desarrollo](#-entorno-de-desarrollo)
- [Scripts disponibles](#-scripts-disponibles)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Convenciones de código](#-convenciones-de-código)
- [Comentarios y JSDoc](#-comentarios-y-jsdoc)
- [Reglas de test](#-reglas-de-test)
- [Flujo de trabajo Git](#-flujo-de-trabajo-git)
- [Desarrollo de plugins](#-desarrollo-de-plugins)
- [Internacionalización](#-internacionalización)
- [Apoyar](#-apoyar)
- [Proceso de Pull Request](#-proceso-de-pull-request)

---

## 📜 Código de conducta

Al participar en este proyecto, aceptas ser respetuoso y constructivo. El acoso, la discriminación o cualquier comportamiento tóxico no serán tolerados.

---

## 🎯 ¿Cómo puedo contribuir?

- 🐛 **Reportar bugs** — abre una issue con descripción clara + pasos para reproducir
- 💡 **Sugerir funcionalidades** — abre una issue con la etiqueta `enhancement`
- 📝 **Mejorar la documentación** — correcciones al README, guía o comentarios
- 🌍 **Traducir** — ver la sección i18n abajo
- 🧪 **Escribir tests** — la cobertura adicional siempre es bienvenida
- 💻 **Enviar código** — correcciones, nuevas funcionalidades, refactorizaciones
- 💖 **Apoyar el proyecto** — una donación única desbloquea todos los plugins Pro para siempre (ver sección Apoyar)

---

## 🛠️ Entorno de desarrollo

### Requisitos

- **Node.js** ≥ 20.19
- **npm** ≥ 10
- **ffmpeg** (opcional, para recorte y compresión)
- **yt-dlp** (opcional, para importar de YouTube)

### Instalación inicial

```bash
git clone https://github.com/Stevehunn/sounddeck.git
cd sounddeck
npm install
npm run dev
```

---

## 📜 Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Ejecuta Electron + Vite en dev con HMR |
| `npm run build` | Build de producción |
| `npm run release` | Build + publicación en GitHub Releases (requiere `GH_TOKEN`) |
| `npm run preview` | Previsualiza el build de Vite |
| `npm test` | Ejecuta tests en watch mode |
| `npm run test:coverage` | Tests + reporte de cobertura |
| `npm run test:ci` | Tests + cobertura (modo CI) |
| `npm run test:ui` | UI gráfica de Vitest |
| `npm run build:plugin` | Construye un plugin `.sdplugin` |
| `npm run audit:i18n` | Audita traducciones faltantes |

---

## 📁 Estructura del proyecto

```
sounddeck/
├── electron/              # Proceso principal (Node.js)
├── src/                   # Renderer (React)
│   ├── core/              # i18n, motor de plugins, servicios, store
│   ├── features/          # Páginas de negocio
│   ├── plugins/           # Plugins integrados
│   ├── shared/            # Componentes, hooks, utils
│   └── test/              # Configuración de test + helpers
│
├── server/                # API Cloudflare Worker + base D1
├── website/               # Sitio marketing Astro
├── scripts/               # Scripts utilitarios (release, licencias, plugins)
└── public/                # Assets estáticos
```

**Alias**: `@` → `./src`, `@core` → `./src/core`, `@shared` → `./src/shared`, `@features` → `./src/features`, `@plugins` → `./src/plugins`.

---

## 🎨 Convenciones de código

### General

- **Idioma**: comentarios e identificadores en **inglés**; cadenas visibles vía `t('...')` (nunca en duro).
- **Formato**: indentación 2 espacios, sin punto y coma (ver `eslint.config.js`).
- **Linting**: ejecutar `npx eslint src electron server website --fix` antes de cada commit.

### React

- Componentes función únicamente.
- Hooks al principio, luego effects, luego handlers, luego render.
- Memo en componentes que re-renderizan mucho.
- Destructuring de props en la firma.
- CSS inline para layout local, `index.css` para global.

### Convenciones `data-testid`

Formato: `{dominio}-{elemento}` en kebab-case. Nunca texto visible ni clases CSS.

### Orden de imports

1. React / libs
2. Core (`@core/...`)
3. Shared (`@shared/...`)
4. Local (`./...`)

---

## 📝 Comentarios y JSDoc

### Idioma

- **Todos los comentarios e identificadores están en inglés.**
- Las cadenas visibles van por `t('...')` (i18n) — nunca en duro.
- CHANGELOG, README, docs: mantener su idioma (EN/FR/ES).

### JSDoc para funciones exportadas

Toda **función exportada** (y cualquier función interna no trivial) debe tener un bloque JSDoc. Esto activa el autocompletado en VS Code sin TypeScript, y las reglas de `eslint-plugin-jsdoc` verifican la coherencia.

```js
/**
 * Descripción corta de lo que hace la función.
 *
 * Descripción más larga opcional con detalles sobre
 * casos límite, efectos secundarios, o comportamiento.
 *
 * @param {string} email - Email del usuario (lowercased + trimmed).
 * @param {string} password - Contraseña en claro (mín 6 chars).
 * @param {Object} [options] - Opciones opcionales.
 * @param {boolean} [options.sendEmail=true] - Envía el email de verificación.
 * @returns {Promise<{ok: boolean, userId: string}>}
 *   `ok: true` si todo va bien, `userId` es el UUID del nuevo usuario.
 * @throws {Error} Si falla el insert en la DB.
 *
 * @example
 * const { ok, userId } = await createUser('a@b.c', 'secret')
 */
export async function createUser(email, password, options = {}) {
  // ...
}
```

### JSDoc para componentes React

```jsx
/**
 * Panel de cuenta mostrando el tier y las acciones del usuario.
 *
 * @param {Object} props
 * @param {{email: string, tier: 'free'|'pro'|'dev'}} props.status
 * @param {() => void} props.onLogout - Llamado cuando el usuario confirma el logout.
 * @param {() => void} props.onLoginClick - Abre el modal de login.
 * @param {(msg: string, type?: string) => void} props.addToast
 * @returns {JSX.Element}
 */
export default function AccountPanel({ status, onLogout, onLoginClick, addToast }) {
  // ...
}
```

### Cabecera de archivo (opcional, para módulos complejos)

```js
/**
 * @file Módulo auto-updater (electron-updater).
 *
 * Responsabilidades:
 * - Verifica actualizaciones al iniciar (solo prod)
 * - Descarga + instala desde GitHub Releases
 * - Envía los eventos de progreso al renderer vía IPC
 *
 * @see https://www.electron.build/auto-update
 */
```

### Comentarios inline

- `// Nota inline corta` para lo obvio
- `// TODO(nombre): cosa a hacer` para TODOs
- `// FIXME: descripción del bug` para bugs conocidos
- ❌ Evitar comentarios obvios tipo `// incrementa i` o `// devuelve result`

### Verificado por ESLint

El repo incluye `eslint-plugin-jsdoc`. Reglas activas en `electron/**/*.js` y `server/src/**/*.js`:

| Regla | Nivel |
|---|---|
| `jsdoc/require-jsdoc` (publicOnly) | warn |
| `jsdoc/require-param` | warn |
| `jsdoc/require-returns` | warn |
| `jsdoc/check-param-names` | error |
| `jsdoc/check-tag-names` | error |

Si aparece un warning, corregirlo antes del merge. Los errores bloquean la CI.

---

## 🧪 Reglas de test

- Vitest + @testing-library/react + jsdom
- Cobertura mínima en código nuevo: 75 %
- Tests frontend: `src/test/**/*.test.jsx`
- Tests Electron: `electron/modules/__tests__/*.test.js`

Ejecutar:

```bash
npm test
npm run test:coverage
```

Siempre mockear `LanguageContext` si el componente usa `t()`.

---

## 🌿 Flujo de trabajo Git

Ramas: `main`, `feat/<scope>`, `fix/<scope>`, `docs/<scope>`, `test/<scope>`, `refactor/<scope>`.

Commits: Conventional Commits (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`, `perf`, `ci`, `build`).

Ejemplos:

```
feat(sound-popup): añadir configuración de rejilla 8 posiciones
fix(audio): evitar fuga de memoria en stopAllSounds
test(sequencer): añadir cobertura de useSequencePlayer
```

---

## 🔌 Desarrollo de plugins

Un plugin es un archivo ZIP con `plugin.json`, `index.js` y opcionalmente `pages/`.

Manifest mínimo:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Tu nombre",
  "requires": ">=1.3.0",
  "pages": []
}
```

Punto de entrada:

```js
export default {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  pages: [],
  async init(store, pluginManager) {},
  async destroy() {}
}
```

Hooks disponibles: `beforePageRender`, `onSoundPlay`, `onAppStart`, `onProfileSwitch`.

### Plugins Pro

Algunos plugins requieren una licencia Pro (`licenseRequired: true`). Una donación única desbloquea todos los plugins Pro para siempre.

Para probar localmente:

```bash
node scripts/sign-license.mjs --dev --tier pro
```

---

## 🌍 Internacionalización

3 idiomas: FR, EN, ES. Añadir una clave = ponerla en **los 3** archivos de locale + `npm run audit:i18n`.

Los plugins incluyen su propio `i18n.js` en su raíz.

---

## 💖 Apoyar

SoundDeck es gratis y open-source (MIT). Una donación única desbloquea todos los plugins Pro para siempre, sin suscripción, sin cuenta.

Guarda tu archivo `.sdlicense` (email, gestor de contraseñas, nube) — lo necesitarás si cambias de PC.

---

## 🚀 Proceso de Pull Request

1. Fork + rama desde `main`
2. Código + tests
3. `npm test` + `npm run test:coverage` + `npx eslint src electron server website --fix`
4. Actualizar `CHANGELOG.md` bajo `[Unreleased]`
5. Push + abrir PR contra `main`
6. Esperar review

Lo que miran los reviewers: tests pasan, sin cadenas en duro, **JSDoc en las nuevas funciones exportadas** (ver [Comentarios y JSDoc](#-comentarios-y-jsdoc)), `data-testid` en nuevos elementos interactivos, sin `console.log`.

Criterios de rechazo: breaking change sin discusión, nueva dependencia injustificada, refactor no relacionado, sin tests, regresión de cobertura.

---

## 🙏 Gracias

Cada contribución, por pequeña que sea, ayuda a mejorar SoundDeck. ¡Feliz hacking! 🎧