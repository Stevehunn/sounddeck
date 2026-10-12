<div align="center">

# 🎧 SoundDeck

**Soundboard local para Discord y otras aplicaciones de chat de voz**

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](#)
[![Tests](https://img.shields.io/badge/tests-5384%20%E2%9C%85-success.svg)](#tests)
[![Coverage](https://img.shields.io/badge/coverage-77.5%25-yellowgreen.svg)](#tests)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-42-9feaf9.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/SteveHun)

*Un soundboard potente, multiplataforma y extensible.*

**🌍 Idiomas:** [English](README.md) · [Français](README.fr.md) · **Español**

</div>

---

## ✨ Características

### 🎵 Biblioteca de sonidos
- Importación por **arrastrar y soltar**, diálogo de archivo o URL
- Organización por **perfiles** (Gaming, Música, Memes…)
- **Favoritos**, **etiquetas**, búsqueda instantánea
- **Drag & drop** para reordenar
- Compresión automática al importar (opcional, vía ffmpeg)

### 🎛️ Editor de audio
- Línea de tiempo multipista con **clips**, **fades**, **marcadores**
- **Efectos de audio**: Volumen, Fade In/Out, Velocidad, Eco, Reverb
- **Bucles** por clip o globales (con número de ciclos personalizable)
- **Normalización** automática de volumen (Peak o RMS)
- **Undo/Redo**, snap, crossfade automático
- **Exportación** de la mezcla final a MP3/WAV

### 🎹 Secuenciador
- Crea **playlists** de sonidos con retardos configurables
- **Bucle** y reproducción aleatoria
- Reordenación por drag & drop
- Navegación por teclado ← →

### ✂️ Recortador
- Waveform interactiva con manejadores de selección
- Vista previa de la selección antes de crear
- Formatos soportados: MP3, WAV, OGG, FLAC, M4A, AAC

### 🌐 Descubrimiento e Importación
- **MyInstants**: búsqueda e importación directa desde miles de sonidos
- **YouTube**: descarga de audio (vía yt-dlp)
- **Spotify / SoundCloud**: soporte parcial
- **Emoji picker** con colecciones personalizables

### 🔊 Audio y Discord
- **Mezclador micrófono + sonidos** integrado (no necesitas VoiceMeeter en casos simples)
- Compatible con **VB-Cable** y **VoiceMeeter Banana**
- **Monitoring** (escucharte en los auriculares)
- **Reducción de ruido** del micrófono (AudioWorklet o filtro)
- Modo **baja latencia** para gaming
- Selección fina de dispositivos de entrada/salida

### 🧩 Extensiones
- **Sistema de plugins** completo con instalación desde URL o archivo `.sdplugin`
- Plugins integrados: **YouTube**, **MyInstants**, **Emoji Discovery**
- Hooks (beforePageRender, onSoundPlay, onAppStart…)
- Versionado semántico con compatibilidad

### 🎨 Interfaz
- 3 temas: **Oscuro**, **Claro**, **Personalizado** (con editor)
- **Sidebar editable** (orden, visibilidad, fijación)
- **Tutoriales interactivos** para cada página
- **Estadísticas** de uso
- **Multiidioma**: 🇫🇷 Français · 🇬🇧 English · 🇪🇸 Español
- Atajos de teclado globales + por sonido

### 💾 Copia de seguridad
- **Auto-backup** configurable (intervalo, número máximo)
- Exportar/Importar: config JSON, archivo completo, o solo sonidos
- Sincronización con **OBS WebSocket**
- Alertas de **Twitch** (follows, donaciones, subs)

### 💎 Plugins Pro

Algunos plugins requieren una **licencia Pro**. Desbloquéalos todos **para siempre** con un **patrocinio GitHub único** (desde 5 €).

- Sin suscripción
- Funciona sin conexión
- Válido para siempre en PCs ilimitados

[**Patrocinar en GitHub →**](https://github.com/sponsors/SteveHun)

---

## 🚀 Instalación

### Para usuarios

1. Descargar la última versión desde [Releases](../../releases)
2. Ejecutar el instalador (`.exe` en Windows)
3. Seguir el tutorial interactivo en el primer inicio
4. (Opcional) Patrocina en [GitHub Sponsors](https://github.com/sponsors/SteveHun) para desbloquear los plugins Pro

### Para desarrolladores

**Requisitos**:
- **Node.js** ≥ 20.19
- **npm** ≥ 10
- **ffmpeg** (opcional, para recorte y compresión)
- **yt-dlp** (opcional, para importar de YouTube)

```bash
# 1. Clonar el repo
git clone https://github.com/<user>/sounddeck.git
cd sounddeck

# 2. Instalar dependencias
npm install

# 3. Ejecutar en dev (Electron + Vite HMR)
npm run dev

# 4. Build de producción
npm run build
```

---

## 📜 Scripts npm

| Script | Descripción |
|---|---|
| `npm run dev` | Ejecuta Electron + Vite en modo dev con HMR |
| `npm run build` | Build de producción (Vite + electron-builder) |
| `npm run preview` | Previsualiza el build de Vite |
| `npm test` | Ejecuta los tests en modo watch |
| `npm run test:watch` | Modo watch explícito |
| `npm run test:ui` | Interfaz gráfica de Vitest |
| `npm run test:coverage` | Tests + reporte de coverage |
| `npm run test:ci` | Tests + coverage (modo CI, exit on fail) |
| `npm run build:plugin` | Compila un plugin (script utilitario) |
| `npm run audit:i18n` | Auditoría de traducciones faltantes |

---

## 🧪 Tests

El proyecto usa **[Vitest](https://vitest.dev/)** para tests unitarios y de integración.

### Estado actual

| Métrica | Valor |
|---|---|
| **Tests totales** | **5 384** ✅ |
| **Archivos de test** | 240 |
| **Coverage statements** | 77.5 % |
| **Coverage branches** | 68.95 % |
| **Coverage funciones** | 78.46 % |
| **Coverage líneas** | 79.09 % |

### Ejecutar los tests

```bash
# Todos los tests (frontend + electron)
npm test

# Con coverage
npm run test:coverage

# Un archivo específico
npx vitest src/test/core/services/AudioService.test.jsx

# Una carpeta
npx vitest src/test/features/editor
```

### Estructura de los tests

```
src/test/                  # Tests frontend (React)
├── components/            # Componentes compartidos
├── core/
│   ├── i18n/              # Traducciones (fr/en/es)
│   ├── plugins/           # Sistema de plugins
│   ├── services/          # AudioService, AudioMixer, EmojiService
│   └── store/             # Estado global (hooks)
├── features/              # Tests por feature (editor, home, options…)
├── hooks/                 # Hooks compartidos
├── plugins/               # Tests de plugins
└── utils/                 # Utilidades (format, logger, etc.)

electron/modules/__tests__/ # Tests del proceso principal de Electron (Node)
```

---

## 🏗️ Arquitectura

```
sounddeck/
├── electron/                  # Proceso principal de Electron
│   ├── main.js                # Punto de entrada, IPC, ciclo de vida
│   ├── preload.js             # Bridge seguro en contexto aislado
│   ├── store.js               # Wrapper de electron-store
│   ├── i18n.js                # Traducciones del proceso principal
│   └── modules/               # Módulos IPC
│       ├── fileHandlers.js    # Diálogos, import/export de archivos
│       ├── storeHandlers.js   # Persistencia
│       ├── projectHandlers.js # Proyectos del editor
│       ├── windowManager.js   # Ventana principal
│       ├── trayManager.js     # System tray
│       ├── shortcutManager.js # Atajos globales
│       ├── protocolHandler.js # Protocolo sounddeck-local://
│       ├── diagnostic.js      # Logs y diagnósticos
│       └── ipcHandlers.js     # Handlers varios
│
├── src/                       # Aplicación React
│   ├── App.jsx                # Componente raíz
│   ├── main.jsx               # Punto de entrada React
│   │
│   ├── core/                  # Núcleo de la aplicación
│   │   ├── i18n/              # Internacionalización
│   │   │   ├── locales/       # fr, en, es (15 archivos cada uno)
│   │   │   ├── LanguageContext.jsx
│   │   │   └── constants.js
│   │   ├── plugins/           # Sistema de plugins
│   │   │   ├── PluginManager/ # Gestor + loader + caché
│   │   │   ├── PluginContext.jsx
│   │   │   └── hooks/
│   │   ├── services/          # Servicios de negocio
│   │   │   ├── AudioService.js        # Reproducción (Howler)
│   │   │   ├── AudioMixerService.js   # Mezclador micro + sonidos (Web Audio)
│   │   │   └── EmojiService.js        # Gestión de emojis
│   │   └── store/             # Estado global (React hooks)
│   │       ├── index.js       # useStore() principal
│   │       ├── hooks/         # useSounds, useProfiles, useMixer…
│   │       └── utils/         # normalizePath, volumeUtils, constants
│   │
│   ├── features/              # Módulos de negocio
│   │   ├── editor/            # Editor de audio (timeline, efectos…)
│   │   ├── home/              # Página principal (biblioteca)
│   │   ├── options/           # Ajustes
│   │   ├── presentation/      # Modo presentación
│   │   ├── sequencer/         # Secuenciador de playlists
│   │   ├── stats/             # Estadísticas
│   │   ├── trimmer/           # Recortador
│   │   ├── welcome/           # Pantalla de bienvenida
│   │   └── emoji/             # Página Mis emojis
│   │
│   ├── plugins/               # Plugins integrados
│   │   ├── youtube/           # Importación de YouTube
│   │   ├── myinstants/        # Descubrimiento MyInstants
│   │   └── emoji/             # Descubrimiento de emojis
│   │
│   ├── shared/                # Código compartido
│   │   ├── components/        # Componentes reutilizables
│   │   │   ├── audio/         # Waveform, SoundCard, AudioTrimmer
│   │   │   ├── modals/        # ConfirmModal, FeedbackModal…
│   │   │   ├── navigation/    # Sidebar, SidebarEditor
│   │   │   ├── settings/      # BackupSettings, OBSControl, etc.
│   │   │   └── ui/            # Toast, ThemeToggle, Tutorial…
│   │   ├── constants/         # Constantes (páginas, emojis, navegación)
│   │   ├── contexts/          # NetworkContext
│   │   ├── hooks/             # useConfirm, useEmojis, etc.
│   │   └── utils/             # Utilidades puras (format, logger, audio)
│   │
│   └── test/                  # Configuración y utilidades de test
│       ├── setup.js           # Setup Vitest (jsdom, mocks)
│       ├── setup-electron.js  # Setup Vitest para Electron
│       └── utils/             # Helpers (fixtures, mockElectronAPI…)
│
├── public/                    # Assets estáticos
├── package.json
├── vite.config.js
└── eslint.config.js
```

### Principios de arquitectura

- **Separación estricta**: `electron/` (Node) vs `src/` (React/DOM)
- **Context Bridge**: comunicación IPC segura vía `preload.js`
- **Sin `nodeIntegration`** en el renderer
- **Servicios centralizados**: toda la lógica de audio en `core/services/`
- **Hooks de negocio**: cada feature expone sus hooks reutilizables
- **Alias de Vite**: `@core`, `@shared`, `@features`, `@plugins`

---

## 🔌 Sistema de plugins

### Formato `.sdplugin`

Un plugin es un archivo ZIP que contiene:

```
my-plugin.sdplugin
├── plugin.json      # Manifest (id, name, version, author, pages…)
├── index.js         # Punto de entrada
└── pages/
    └── Discover.jsx # Componentes React opcionales
```

### Manifest `plugin.json`

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "You",
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

### API de plugin

```javascript
export default {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  pages: [...],

  async init(store, pluginManager) {
    // Setup al activar
    pluginManager.addHook('onSoundPlay', (sound) => {
      console.log('Playing:', sound.name)
    })
  },

  async destroy() {
    // Cleanup
  }
}
```

### Instalación

1. **Options → Plugins → Instalar un plugin**
2. Pegar una URL o elegir un archivo `.sdplugin`
3. Reiniciar la app para aplicar

---

## 🎧 Configuración de Discord

### Modo simple (solo VB-Cable) — Recomendado

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

El proyecto soporta **3 idiomas**: FR, EN, ES.

### Añadir un idioma

1. Crear `src/core/i18n/locales/<code>/` con los 15 archivos (`common.js`, `editor.js`, etc.)
2. Añadir el idioma en `src/core/i18n/constants.js`
3. Ejecutar `npm run audit:i18n` para verificar la coherencia

### Estructura de un archivo de traducciones

```javascript
// src/core/i18n/locales/fr/common.js
export default {
  add: 'Ajouter',
  cancel: 'Annuler',
  profileManagerConfirmMessage: 'Retirer {count} son(s) du profil "{name}" ?',
  // ...
}
```

Placeholders soportados: `{name}` (nombrados), `{0}` (posicionales).

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Ver [CONTRIBUTING.md](CONTRIBUTING.md) para:

- El workflow de Git
- Las convenciones de código
- Las reglas de tests (coverage mínimo 75 %)
- El proceso de PR

**Antes de enviar una PR**:
```bash
npm test              # Todos los tests en verde
npm run test:coverage # Sin regresión de coverage
```

---

## 📄 Licencia

MIT © 2026 SteveHun

Ver [LICENSE](LICENSE) para el texto completo.

---

## 🙏 Créditos

- **[Electron](https://www.electronjs.org/)** — Framework de escritorio
- **[React](https://react.dev/)** — UI
- **[Vite](https://vitejs.dev/)** — Build tool
- **[Vitest](https://vitest.dev/)** — Framework de tests
- **[Howler.js](https://howlerjs.com/)** — Reproducción de audio
- **[Tone.js](https://tonejs.github.io/)** — Web Audio
- **[Tabler Icons](https://tabler.io/icons)** — Iconos
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** — Extracción de YouTube
- **[ffmpeg](https://ffmpeg.org/)** — Procesamiento de audio
- **[VB-Audio](https://vb-audio.com/)** — Cable de audio virtual

---

<div align="center">

**Hecho con ❤️ para la comunidad de Discord**

[Reportar un bug](../../issues) · [Proponer una idea](../../issues) · [Ver releases](../../releases)

</div>