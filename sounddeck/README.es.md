<div align="center">

# 🎧 SoundDeck

**Soundboard local para Discord y otras aplicaciones de chat de voz**

[![Version](https://img.shields.io/badge/version-1.4.12-blue.svg)](https://github.com/Stevehunn/sounddeck/releases)
[![Tests](https://img.shields.io/badge/tests-5384%20%E2%9C%85-success.svg)](#tests)
[![Coverage](https://img.shields.io/badge/coverage-77.5%25-yellowgreen.svg)](#tests)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-42-9feaf9.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Website](https://img.shields.io/badge/website-sounddeck.stream-7c6ff7.svg)](https://sounddeck.stream)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/Stevehunn)

*Un soundboard potente, multiplataforma y extensible.*

**🌍 Idiomas:** [English](README.md) · [Français](README.fr.md) · **Español**

</div>

---

## 🎯 ¿Qué es SoundDeck?

SoundDeck es un **soundboard local para Discord** (y cualquier otra app de chat de voz) con:

- 🎛️ Un **editor de audio multipista** (timeline, efectos, undo/redo)
- 🎹 Un **secuenciador de playlists** (retardos personalizados, bucle, shuffle)
- 🌐 Importación **YouTube / MyInstants**
- 🔊 Un **mezclador micro + sonidos** integrado (Discord-ready, sin VoiceMeeter)
- 🧩 Un **sistema de plugins** (instalación desde URL o `.sdplugin`)
- 🌍 **3 idiomas**: inglés, francés, español

**Gratis y open source (MIT).** Los plugins Pro se desbloquean para siempre con una donación única.

[**Descargar →**](https://github.com/Stevehunn/sounddeck/releases/latest) · [**Sitio web →**](https://sounddeck.stream) · [**Patrocinar →**](https://github.com/sponsors/Stevehunn)

---

## 📦 Estructura del repo

Este repo contiene **3 subproyectos**:

```
sounddeck/
├── (raíz)          ← App desktop (Electron + React + Vite)
├── server/         ← API Cloudflare Worker + base D1
├── website/        ← Sitio marketing (Astro + Tailwind)
└── scripts/        ← Scripts utilitarios (release, licencias, plugins)
```

| Subproyecto | Tech | Despliegue |
|---|---|---|
| **App desktop** | Electron 42 + React 18 + Vite 8 | GitHub Releases |
| **API** | Cloudflare Workers + D1 | `api.sounddeck.stream` |
| **Sitio web** | Astro 5 + Tailwind 4 | Cloudflare Pages (`sounddeck.stream`) |

---

## ✨ Características

### 🎵 Biblioteca de sonidos

- Importación por **arrastrar y soltar**, diálogo de archivo o URL
- Organización por **perfiles** (Gaming, Música, Memes…)
- **Favoritos**, **etiquetas**, búsqueda instantánea
- Compresión automática al importar (opcional, vía ffmpeg)

### 🎛️ Editor de audio

- Línea de tiempo multipista con clips, fades, marcadores
- Efectos: Volumen, Fade In/Out, Velocidad, Eco, Reverb
- Bucles por clip o globales (con número de ciclos personalizable)
- Normalización automática de volumen (Peak o RMS)
- Undo/Redo, snap, crossfade automático
- Exportación de la mezcla final a MP3/WAV

### 🎹 Secuenciador

- Playlists de sonidos con retardos configurables
- Bucle y reproducción aleatoria
- Reordenación por drag & drop
- Navegación por teclado ← →

### ✂️ Recortador

- Waveform interactiva con manejadores de selección
- Vista previa de la selección antes de crear
- Formatos: MP3, WAV, OGG, FLAC, M4A, AAC

### 🌐 Descubrimiento e Importación

- **MyInstants**: búsqueda e importación directa
- **YouTube**: descarga de audio (vía yt-dlp)
- **Spotify / SoundCloud**: soporte parcial
- **Emoji picker** con colecciones personalizables

### 🔊 Audio y Discord

- 🪄 **Asistente de configuración rápida** — config Discord en un clic (detección auto CABLE Input, auriculares, micro)
- **Mezclador micrófono + sonidos** integrado (sin VoiceMeeter en casos simples)
- Compatible con **VB-Cable** y **VoiceMeeter Banana**
- Monitoring (escucharte en los auriculares)
- Reducción de ruido del micrófono (AudioWorklet o filtro)
- Modo baja latencia para gaming

### 🧩 Extensiones

- **Sistema de plugins** completo con `.sdplugin`
- Plugins integrados: **YouTube**, **MyInstants**, **Emoji Discovery**
- Hooks (`beforePageRender`, `onSoundPlay`, `onAppStart`, `onProfileSwitch`)
- Versionado semántico con compatibilidad

### 🎨 Interfaz

- 3 temas: Oscuro, Claro, Personalizado
- Sidebar editable (orden, visibilidad, fijación)
- Tutoriales interactivos para cada página
- Estadísticas de uso
- **Multiidioma**: 🇫🇷 Français · 🇬🇧 English · 🇪🇸 Español

### 💾 Copia de seguridad

- Auto-backup configurable (intervalo, número máximo)
- Exportar/Importar: config JSON, archivo completo, o solo sonidos
- Sincronización con **OBS WebSocket**
- Alertas de **Twitch** (follows, donaciones, subs)

### 🔄 Actualización automática

- Auto-updater integrado (`electron-updater`)
- Banner de actualización en la sidebar
- Descarga + instalación en un clic
- Funciona offline hasta el clic del usuario

### 💎 Plugins Pro

Algunos plugins requieren una **licencia Pro**. Desbloquéalos todos **para siempre** con una **donación única de 5 € o más en GitHub Sponsors**.

- ✅ Sin suscripción
- ✅ Funciona sin conexión
- ✅ Válido para siempre en PCs ilimitados

[**Patrocinar en GitHub →**](https://github.com/sponsors/Stevehunn)

---

## 🚀 Instalación

### Para usuarios

1. Descargar la última versión desde [**Releases**](https://github.com/Stevehunn/sounddeck/releases/latest)
2. Ejecutar el instalador (`.exe` en Windows)
3. Seguir el tutorial interactivo en el primer inicio
4. (Opcional) [Patrocinar en GitHub](https://github.com/sponsors/Stevehunn) para desbloquear los plugins Pro

### Para desarrolladores

**Requisitos:**

- **Node.js** ≥ 20.19
- **npm** ≥ 10
- **ffmpeg** (opcional, para recorte + compresión)
- **yt-dlp** (opcional, para importar de YouTube)

```bash
# Clonar
git clone https://github.com/Stevehunn/sounddeck.git
cd sounddeck

# Instalar + ejecutar
npm install
npm run dev
```

> 📖 **Documentación completa para desarrolladores:** ver [DOCS.md](DOCS.md).

---

## 🧪 Tests

El proyecto usa **Vitest** para tests unitarios + integración.

| Métrica | Valor |
|---|---|
| **Tests totales** | **5 384** ✅ |
| **Archivos de test** | 240 |
| **Coverage statements** | 77.5 % |
| **Coverage branches** | 68.95 % |
| **Coverage funciones** | 78.46 % |
| **Coverage líneas** | 79.09 % |

```bash
npm test                # Modo watch
npm run test:coverage   # Con coverage
npm run test:ci         # Modo CI
```

---

## 🏗️ Arquitectura

```
sounddeck/
├── electron/                  # Proceso principal Electron
│   ├── main.js
│   ├── preload.js
│   └── modules/
│       ├── autoUpdater.js     # electron-updater
│       ├── fileHandlers.js
│       ├── shortcutManager.js
│       └── ...
│
├── src/                       # Renderer React
│   ├── core/
│   │   ├── i18n/              # fr, en, es
│   │   ├── plugins/           # Motor de plugins
│   │   ├── services/          # AudioService, AudioMixerService
│   │   └── store/             # Estado global
│   ├── features/              # Editor, Sequencer, Trimmer, etc.
│   └── shared/                # Componentes, hooks, utils
│
├── server/                    # Cloudflare Worker + D1
│   ├── src/routes/            # login, signup, admin, etc.
│   ├── migrations/            # Migraciones SQL D1
│   └── scripts/               # code.mjs, admin.mjs
│
├── website/                   # Sitio marketing Astro
│   ├── src/pages/             # index, /en, /es, /admin
│   └── src/components/        # Hero, Features, FAQ, etc.
│
└── scripts/                   # Scripts utilitarios
    ├── release.mjs
    ├── sign-license.mjs
    └── ...
```

**Principios de arquitectura:**

- Separación estricta: `electron/` (Node) vs `src/` (React/DOM)
- Context bridge: IPC seguro vía `preload.js`
- Sin `nodeIntegration` en el renderer
- Servicios centralizados: toda la lógica de audio en `core/services/`
- Alias Vite: `@core`, `@shared`, `@features`, `@plugins`

---

## 📜 Scripts npm

| Script | Descripción |
|---|---|
| `npm run dev` | Ejecuta Electron + Vite en dev (HMR) |
| `npm run build` | Build producción (Vite + electron-builder) |
| `npm run release` | Build + publicación GitHub Releases |
| `npm test` | Tests en modo watch |
| `npm run test:coverage` | Tests + reporte de coverage |
| `npm run test:ci` | Tests + coverage (modo CI) |
| `npm run test:ui` | UI gráfica de Vitest |
| `npm run build:plugin` | Build un plugin `.sdplugin` |
| `npm run audit:i18n` | Auditoría de traducciones faltantes |

---

## 🔌 Sistema de plugins

Un plugin es un archivo ZIP (`.sdplugin`) que contiene:

```
my-plugin.sdplugin
├── plugin.json      # Manifest (id, name, version, author, pages…)
├── index.js         # Punto de entrada
└── pages/
    └── Discover.jsx # Componentes React opcionales
```

**Manifest (`plugin.json`):**

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Tú",
  "requires": ">=1.3.0",
  "pages": [
    {
      "id": "my-page",
      "labelKey": "myPageLabel",
      "componentPath": "pages/Discover.jsx"
    }
  ]
}
```

**Punto de entrada (`index.js`):**

```javascript
export default {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  pages: [],

  async init(store, pluginManager) {
    pluginManager.addHook('onSoundPlay', (sound) => {
      console.log('Playing:', sound.name)
    })
  },

  async destroy() {}
}
```

**Instalación:** Options → Plugins → Instalar un plugin.

---

## 🎧 Configuración de Discord

### 🪄 Asistente rápido (recomendado)

Desde la v1.4.12, SoundDeck incluye una **configuración de Discord en un clic**:

1. Instalar **VB-Cable** y reiniciar el PC
2. Abrir **Options → Audio → Configuración rápida**
3. Hacer clic en **« Configuración auto Discord »**
4. SoundDeck selecciona automáticamente:
   - Salida → `CABLE Input`
   - Salida local → tus auriculares (dispositivo real)
   - Micrófono → tu micro real
   - Activa el mezclador, playLocally y la supresión de ruido
5. Hacer clic en **« Hecho »** en el banner de recordatorio de Discord después de configurar Discord manualmente (Entrada = `CABLE Output`)

### Modo manual (solo VB-Cable)

1. Instalar **VB-Cable** desde [vb-audio.com](https://vb-audio.com/Cable/)
2. Reiniciar el PC
3. **Options → Audio**:
   - Activa **Mezclador micro + sonidos**
   - Selecciona tu micrófono
   - Salida: `CABLE Input (VB-Audio Virtual Cable)`
   - Activa **Reproducir también en local** → selecciona tus auriculares
4. **Discord → Voz y vídeo**:
   - Dispositivo de entrada: `CABLE Output (VB-Audio Virtual Cable)`
   - Dispositivo de salida: tus auriculares
   - Desactiva: Supresión de ruido, Cancelación de eco, Control automático de ganancia

### Modo avanzado (VoiceMeeter Banana)

Consulta la **Guía de Discord** integrada (página Guide en la app).

---

## 🌍 Internacionalización

El proyecto soporta **3 idiomas**: EN, FR, ES.

**Añadir una clave de traducción:**

1. Añadir la clave en los **3 archivos** `src/core/i18n/locales/<lang>/<section>.js`
2. Ejecutar `npm run audit:i18n` para verificar

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Ver [CONTRIBUTING.es.md](CONTRIBUTING.es.md) para:

- El workflow de Git
- Las convenciones de código
- Las reglas de tests (coverage mínimo 75 %)
- El proceso de PR

**Antes de enviar una PR:**

```bash
npm test              # Todos los tests en verde
npm run test:coverage # Sin regresión de coverage
npx eslint src electron --fix
```

---

## 📄 Licencia

MIT © 2026 Stevehunn

Ver [LICENSE](LICENSE) para el texto completo.

---

## 🙏 Créditos

- **[Electron](https://www.electronjs.org/)** — Framework desktop
- **[React](https://react.dev/)** — UI
- **[Vite](https://vitejs.dev/)** — Build tool
- **[Vitest](https://vitest.dev/)** — Tests
- **[Howler.js](https://howlerjs.com/)** — Reproducción de audio
- **[Tone.js](https://tonejs.github.io/)** — Web Audio
- **[Astro](https://astro.build/)** — Sitio web
- **[Cloudflare Workers](https://workers.cloudflare.com/)** — API + D1
- **[Resend](https://resend.com/)** — Emails transaccionales
- **[Tabler Icons](https://tabler.io/icons)** — Iconos
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — Extracción de YouTube
- **[ffmpeg](https://ffmpeg.org/)** — Procesamiento de audio
- **[VB-Audio](https://vb-audio.com/)** — Cable de audio virtual

---

<div align="center">

**Hecho con ❤️ para la comunidad de Discord**

[Sitio web](https://sounddeck.stream) · [Reportar un bug](https://github.com/Stevehunn/sounddeck/issues) · [Releases](https://github.com/Stevehunn/sounddeck/releases)

</div>