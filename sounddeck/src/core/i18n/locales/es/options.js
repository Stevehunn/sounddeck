// src/core/i18n/locales/es/options.js
export default {
  // ─── OPCIONES ─────────────────────────────────────────────────────────
  optionsTitle: "Opciones",
  optionsGeneral: "General",
  optionsAudio: "Audio",
  optionsAppearance: "Apariencia",
  optionsShortcuts: "Atajos",
  optionsPlugins: "Plugins",
  optionsBackup: "Copia de seguridad",
  optionsAbout: "Acerca de",
  optionsProfiles: "Perfiles",

  // ─── GENERAL ─────────────────────────────────────────────────────────
  optionsLanguage: "Idioma",
  optionsLanguageDesc: "Cambiar el idioma de la aplicación",
  optionsStartMinimized: "Iniciar minimizado",
  optionsStartMinimizedDesc:
    "Iniciar la aplicación directamente en la bandeja del sistema",
  optionsCloseToTray: "Cerrar a la bandeja",
  optionsCloseToTrayDesc:
    "Cerrar la ventana a la bandeja del sistema en lugar de salir",
  optionsLaunchAtStartup: "Iniciar al arrancar",
  optionsLaunchAtStartupDesc: "Iniciar SoundDeck con Windows",
  optionsAutoBackup: "Copia de seguridad automática",
  optionsAutoBackupDesc: "Guardar automáticamente la configuración",
  optionsBackupInterval: "Intervalo de copia de seguridad (minutos)",
  optionsMaxBackups: "Número máximo de copias",
  application: "Aplicación",
  hideToTray: "Ocultar a la bandeja",
  hideToTrayDesc: "Cerrar la ventana pero mantener SoundDeck en segundo plano",
  hideToTrayBtn: "Ocultar a la bandeja",
  shortcutsActive: "Atajos activados",
  shortcutsInactive: "Atajos desactivados",
  activateShortcuts: "Activar atajos",
  deactivateShortcuts: "Desactivar atajos",
  quitApp: "Salir de SoundDeck",
  openSoundDeck: "Abrir SoundDeck",

  // ─── APARIENCIA ──────────────────────────────────────────────────────
  appearance: "Apariencia",
  language: "Idioma",
  theme: "Tema",
  themeDark: "Oscuro",
  themeLight: "Claro",
  themeBlue: "Azul",
  themeGreen: "Verde",
  themeRed: "Rojo",
  themeOrange: "Naranja",
  themeCustom: "Personalizado",
  themeAuto: "Tema automático",
  themeAutoOn: "Auto ON",
  themeAutoOff: "Auto OFF",
  themeAutoDesc: "Cambia automáticamente según la hora",
  cardSize: "Tamaño de tarjetas",
  cardSizeDesc: "Elige el tamaño de las tarjetas de sonidos",
  cardSizeSmall: "Pequeño",
  cardSizeMedium: "Mediano",
  cardSizeLarge: "Grande",
  focusMode: "Modo Focus",
  focusModeDesc: "Interfaz minimalista solo con sonidos",
  focusModeOn: "Focus ON",
  focusModeOff: "Focus OFF",
  focusModeShortcut: "Ctrl+Shift+F para alternar",

  // ─── AUDIO ───────────────────────────────────────────────────────────
  audio: "Audio",
  audioMode: "Modo audio",
  audioModeDesc: "Cómo SoundDeck envía el audio",
  audioModeSimple: "Simple (VB-Cable)",
  audioModeAdvanced: "Avanzado (VoiceMeeter)",
  globalVolume: "Volumen global",
  playLocally: "Reproducir también localmente",
  playLocallyDesc: "Escuchar sonidos en tu propio PC",
  outputDevice: "Dispositivo de salida",
  outputDeviceDesc: "Selecciona el cable virtual para Discord",
  outputDeviceDefault: "Por defecto",
  outputDeviceLabel: "Dispositivo",
  localOutputDevice: "Dispositivo de salida local",
  localOutputDeviceDesc:
    "Dispositivo utilizado para la reproducción local (auriculares)",
  localOutputDeviceDefault: "Por defecto",
  localOutputDeviceChanged: "Dispositivo local cambiado: {device}",

  // ─── CONFIGURACIÓN RÁPIDA ───────────────────────────────────────────
  quickSetupTitle: "Configuración rápida",
  quickSetup: "Asistente de configuración",
  quickSetupDesc:
    "Configura SoundDeck automáticamente para Discord (CABLE Input, mezclador, micro…).",
  quickSetupApply: "Configuración auto Discord",
  quickSetupApplying: "Aplicando configuración…",
  quickSetupApplied: "✅ ¡SoundDeck está listo para Discord!",
  quickSetupNoCable: "❌ CABLE Input no encontrado. Instala VB-Cable primero.",
  quickSetupRememberDiscord:
    "No olvides configurar Discord: Entrada = CABLE Output",
  quickSetupBannerTitle: "Recuerda configurar Discord",
  quickSetupBannerDesc:
    "Entrada = CABLE Output · Salida = auriculares · Desactiva la supresión de ruido y la cancelación de eco.",
  quickSetupBannerDoneBtn: "Hecho",
  quickSetupDiscordDoneToast: "¡Perfecto! Puedes volver atrás si lo necesitas.",

  // ─── CONTROLADOR VIRTUAL ──────────────────────────────────────────────────
  virtualDriver: "Controlador de audio virtual",
  virtualDriverSub: "Necesario para Discord",
  installVirtualDriver: "Instalar VB-Cable",
  installing: "Instalando...",
  downloadingDriver: "Descargando el controlador VB-Cable...",
  driverInstalled:
    "¡Controlador VB-Cable instalado con éxito! Reinicia Discord.",
  installError: "Error de instalación",
  virtualDriverDetected: "Controlador detectado",
  virtualDriverNotDetected: "No se detectó dispositivo virtual",
  downloadVirtualDriver: "Instalar controlador virtual",
  virtualDriverInfo:
    'Instala automáticamente el controlador VB-Cable para que SoundDeck se escuche en Discord.\n💡 Selecciona "CABLE Input" en Discord como dispositivo de entrada.',
  virtualDriverSuccess:
    '¡Controlador VB-Cable instalado! Selecciona "CABLE in 16ch" en Discord.',
  virtualDriverSelect: "Selecciona el dispositivo virtual para Discord",
  detect: " Detectar",
  detectError: "Error durante la detección",
  unknown: "Desconocido",
  uninstallGuide:
    'Para desinstalar VB-Cable, ve a Panel de control → Programas → Desinstalar un programa → busca "VB-CABLE".',
  uninstallGuideTitle:
    "📌 Si necesitas desinstalar VB-Cable, aquí te explicamos cómo hacerlo:",
  uninstallGuideStep1:
    "Ve a Panel de control → Programas → Desinstalar un programa",
  uninstallGuideStep2: 'Busca "VB-CABLE" y desinstálalo.',
  uninstallGuideRestart:
    "⚠️ Puede ser necesario reiniciar el PC después de la desinstalación.",

  // ─── MEZCLADOR ──────────────────────────────────────────────────────────
  mixerEnable: "Mezclador micro + sonidos",
  mixerEnableDesc: "Mezcla tu micrófono con los sonidos",
  mixerActivated: "¡Mezclador activado!",
  mixerActivationError: "Error al activar el mezclador",
  mixerDeactivated: "Mezclador desactivado",
  mixerActive: "Mezclador activo",
  mixerActiveDesc: "Tu micrófono y los sonidos se mezclan en un solo flujo.",
  mixerDiscordTip:
    '📌 En Discord, selecciona "CABLE Output" como dispositivo de entrada.',
  mixerToggleHint: "Intenta desactivar/reactivar el mezclador.",
  mixerStatus: "Estado del mezclador",
  mixerStatusSub: "Verificar y reparar si es necesario",
  mixerOperational: "Mezclador operativo",
  mixerNotOperational: "Mezclador no operativo",
  mixerRepair: "Verificar/Reparar",
  mixerRepaired: "✅ Mezclador reparado con éxito",
  mixerReset: "🔄 Reiniciando mezclador...",
  mixerResetSuccess: "✅ Mezclador reiniciado con éxito",
  mixerRepairError: "❌ Error: {error}",
  mixerNotInitialized: "Mezclador no inicializado",
  mixerSoundVolume: "Volumen de sonidos",
  mixerResynced: "Mezclador resincronizado",

  // ─── MICRÓFONO ──────────────────────────────────────────────────────
  microphone: "Micrófono",
  microphoneSelect: "Selecciona tu micrófono",
  microphoneDefault: "Micrófono por defecto",
  microphoneLabel: "Micrófono",
  microphoneChanged: "Micrófono cambiado",
  microphoneVolume: "Volumen del micrófono",
  microphoneConnected: "¡Micrófono conectado! Habla en tu micrófono.",
  microphoneNotConnected: "Micrófono no conectado. Verifica tus permisos.",
  microphoneTestError: "Error al probar el micrófono",
  testMicrophone: "Probar micrófono",
  test: "Probar",
  micTestStopped: "Prueba de micrófono detenida",
  micTestInProgress: "Prueba de micrófono en curso (3 segundos)...",
  micTestFinished: "Prueba de micrófono finalizada",
  micTesting: "Probando...",

  // ─── MONITOREO ──────────────────────────────────────────────────────
  monitoring: "Escucharse",
  monitoringDesc: "Escuchar tu micrófono en los altavoces (volumen reducido)",
  monitoringEnabled: "🎤 Monitoreo activado (te escuchas a ti mismo)",
  monitoringDisabled: "🔇 Monitoreo desactivado",
  monitoringWarning: "Monitoreo activo: escuchas tu micrófono en los altavoces",

  // ─── BAJA LATENCIA ────────────────────────────────────────────────────
  lowLatencyMode: "Modo baja latencia",
  lowLatencyModeDesc:
    "Desactiva los filtros de audio para reducir la latencia (recomendado para juegos)",
  lowLatencyActivated: "⚡ Modo baja latencia activado",
  lowLatencyDeactivated: "🔊 Modo baja latencia desactivado",

  // ─── SUPRESIÓN DE RUIDO ──────────────────────────────────────────────
  noiseSuppression: "Supresión de ruido del micrófono",
  noiseSuppressionDesc: "Filtra el ruido de fondo (ventilador, teclado, etc.)",
  noiseSuppressionMode: "Modo de supresión de ruido",
  noiseSuppressionModeDesc:
    "AudioWorklet = más eficaz, Filtro = más compatible",
  noiseSuppressionModeAuto: "Auto (recomendado)",
  noiseSuppressionModeWorklet: "AudioWorklet (mejor)",
  noiseSuppressionModeFilter: "Filtro básico (compatible)",
  noiseSuppressionModeOff: "Desactivado",
  noiseSuppressionActivated: "🔇 Supresión de ruido activada",
  noiseSuppressionDeactivated: "🔊 Supresión de ruido desactivada",
  noiseSuppressionModeChanged: "Modo de supresión de ruido: {mode}",

  // ─── RECONECTAR ──────────────────────────────────────────────────────
  reconnectFlow: "Reconectar flujo",
  reconnectFlowDesc: "Fuerza la reconexión del flujo al dispositivo de salida",
  reconnect: "Reconectar",
  flowReconnected: "Flujo reconectado",

  // ─── MODO AVANZADO ──────────────────────────────────────────────────
  advancedMode: "Modo avanzado",
  advancedModeDesc:
    "Usa VB-Cable + VoiceMeeter Banana para mezcla profesional.",
  downloadVBCable: "Descargar VB-Cable",
  downloadVoiceMeeter: "Descargar VoiceMeeter",
  advancedModeTip: "Consulta la guía de Discord para la configuración.",
  vbaudioInfo:
    "Para que Discord escuche tus sonidos, instala VB-Audio Virtual Cable (gratis) y selecciónalo aquí, luego en Discord: Ajustes → Voz → Dispositivo de entrada → CABLE Output.",
  vbaudioDownload: "Descargar VB-Audio →",

  // ─── OPCIONES AVANZADAS ──────────────────────────────────────────────
  advancedOptions: "Opciones avanzadas",
  advancedAudioOptions: "Opciones de audio avanzadas",

  // ─── COPIA DE SEGURIDAD ─────────────────────────────────────────────────────
  backup: "Copia de seguridad & restauración",
  exportLabel: "Exportar",
  importLabel: "Importar",
  exportSectionLabel: "Exportar",
  importSectionLabel: "Importar",
  configOnly: "Solo config",
  configOnlyDesc: "Perfiles, atajos, tema · JSON ligero",
  fullArchive: "Archivo completo",
  fullArchiveDesc: "Config + todos los sonidos · ZIP",
  soundsOnly: "Solo sonidos",
  soundsOnlyDesc: "Todos los archivos de audio · ZIP sin config",
  importBackup: "Importar una copia de seguridad",
  importBackupDesc: "JSON o ZIP — detección automática",
  restartNote:
    "Se requiere reiniciar después de importar una config o archivo completo.",
  restartRequired: "reinicia la app",
  archiveCreated: "Archivo creado",
  exported: "exportados",
  configImported: "Configuración importada",
  archiveImported: "Archivo importado",
  backupInterval: "Intervalo de copia",
  backupIntervalDesc: "Frecuencia de las copias automáticas",
  backupIntervalChanged: "Intervalo de copia cambiado a",
  minute: "minuto",
  minutes: "minutos",
  backupNow: "Copiar ahora",
  exportBackups: "Exportar copias",
  importBackups: "Importar copias",
  noBackups: "Sin copias",
  restore: "Restaurar",
  confirmRestore: "¿Seguro que quieres restaurar esta copia?",
  backupSettings: "Copias",
  saving: "Guardando...",
  lazyLoading: "Carga bajo demanda",
  lazyLoadingDesc: "Carga los sonidos solo cuando son visibles",
  lazyLoadingEnabled: "Carga bajo demanda activada",
  lazyLoadingDisabled: "Carga bajo demanda desactivada",

  // ─── ATAJOS ──────────────────────────────────────────────────────
  shortcuts: "Atajos",
  shortcutsPerSoundNote:
    "Los atajos por sonido se configuran directamente en cada tarjeta de sonido (página Mis sonidos).",
  switchProfile: "Cambiar perfil",
  switchProfileDesc: "Cicla entre tus perfiles",
  toggleLoop: "Activar/desactivar Loop",
  toggleLoopDesc: "Activa el modo repetición",
  stopAllShortcut: "Parar todos",
  stopAllDesc: "Detiene inmediatamente todos los sonidos",
  presentationShortcut: "Modo presentación",
  presentationDesc: "Abre/cierra el modo presentación",
  toggleShortcuts: "Alternar atajos",
  toggleShortcutsDesc: "Activar/desactivar todos los atajos globales",
  toggleWindowShortcut: "Mostrar/ocultar ventana",
  toggleWindowShortcutDesc:
    "Atajo para mostrar u ocultar la ventana de SoundDeck",
  toggleWindowShortcutSet: "Atajo de ventana definido:",
  toggleWindowShortcutRemoved: "Atajo de ventana eliminado",
  keyboardLayout: "Disposición del teclado",
  keyboardLayoutDesc: "Selecciona tu tipo de teclado",
  keyboardLayoutChanged: "Distribución cambiada",

  // ─── VISUALIZACIÓN DEL TECLADO ─────────────────────────────────────────
  keyboardVisualizerTitle: "Atajos de teclado",
  keyboardVisualizerUsed: "atajo utilizado",
  keyboardVisualizerUsedPlural: "atajos utilizados",
  keyboardVisualizerKeyUsed: "Tecla utilizada",
  keyboardVisualizerKeyAvailable: "Tecla disponible",
  keyboardShortcutsActive: "atajos activos",
  keyboardKeyUsed: "Tecla utilizada",
  keyboardKeyUnused: "Tecla libre",
  keyboardKeyInFilter: "Tecla del filtro",
  keyboardKeyOther: "Otra tecla",
  showAll: "Mostrar todo",
  numpad: "Teclado num.",
  activeCombinations: "Combinaciones activas",
  noFilter: "Sin filtro (teclas solas)",
  withFilter: "con",
  soloKeys: "tecla(s) sola(s)",
  shortcutsTotal: "atajos",
  noSoloKeys: "Sin teclas solas",
  noShortcutsDefined: "Sin atajos definidos",
  shortcutUsedWith: "Atajo usado con",
  keyActive: "Tecla activa",
  keyInactive: "Tecla inactiva",
  keysWithoutModifier: "Teclas sin modificador",
  keyboardVisualizerModifierUsed: "Modificador utilizado",

  // ─── PERFILES ──────────────────────────────────────────────────────
  profileManagement: "Gestión de perfiles",
  exportProfile: "Exportar",
  importProfile: "Importar perfil compartido",
  profileDeleted: "Perfil eliminado",
  profileExported: "Perfil exportado",
  profileImported: "Perfil importado",
  deleteProfile: "Perfil eliminado",
  deleteProfileConfirm: '¿Realmente quieres eliminar el perfil "{name}"?',

  // ─── GESTOR DE PERFILES ────────────────────────────────────────────────
  profileManagerTitle: "Gestionar perfil",
  profileManagerSelectAll: "Seleccionar todo",
  profileManagerDeselectAll: "Deseleccionar todo",
  profileManagerRemoveSelected: "Eliminar seleccionados",
  profileManagerDeleteProfile: "Eliminar perfil",
  profileManagerNoSounds: "Este perfil no tiene sonidos.",
  profileManagerFavorite: "Favorito",
  profileManagerConfirmRemove: "Confirmar eliminación",
  profileManagerConfirmMessage:
    'Estás a punto de eliminar {count} sonido(s) del perfil "{name}".',
  profileManagerConfirmSub:
    "Estos sonidos permanecerán en tu biblioteca y podrán ser reañadidos más tarde.",
  profileManagerSoundsRemoved: "sonido(s) eliminado(s) del perfil",
  profileManagerProfileDeleted: "Perfil eliminado",
  profileManagerDeleting: "Eliminando...",
  profileManagerDeleteConfirm: "Eliminar perfil",
  profileManagerDeleteMessage:
    'El perfil "{name}" contiene {count} sonidos. ¿Realmente quieres eliminarlo?',
  profileManagerAdded: "añadido al perfil",
  profileManagerRemoved: "eliminado del perfil",
  profileManagerNoSoundsToRemove: "No hay sonidos seleccionados para eliminar",
  profileManagerRemoveConfirm: "Confirmar eliminación",
  profileManagerRemoveCancel: "Cancelar eliminación",
  profileManagerRemoveSuccess: "Sonido(s) eliminado(s) con éxito",
  profileManagerRemoveError: "Error al eliminar los sonidos",
  profileManagerDeleteSuccess: "Perfil eliminado con éxito",
  profileManagerDeleteError: "Error al eliminar el perfil",
  profileMoved: "Perfil movido",

  // ─── TEMA PERSONALIZADO ──────────────────────────────────────────────────
  themeEditorTitle: "Editor de tema personalizado",
  themeEditorReset: "Restablecer",
  themeEditorApply: "Aplicar",
  themeEditorPresets: "Paletas predefinidas",
  themeEditorPreview: "Vista previa",
  themeEditorPreviewName: "SoundDeck",
  themeEditorPreviewSub: "Vista previa del tema",
  themeEditorPrimary: "Primario",
  themeEditorSuccess: "Éxito",
  themeEditorDanger: "Peligro",
  themeGroupBg: "Fondos",
  themeGroupText: "Textos",
  themeGroupAccent: "Acentos",
  themeGroupState: "Estados",
  themeFieldBgPrimary: "Fondo principal",
  themeFieldBgSecondary: "Fondo secundario",
  themeFieldBgTertiary: "Fondo terciario",
  themeFieldBgHover: "Fondo al pasar",
  themeFieldBorder: "Bordes",
  themeFieldTextPrimary: "Texto principal",
  themeFieldTextSecondary: "Texto secundario",
  themeFieldTextTertiary: "Texto sutil",
  themeFieldAccent: "Color principal",
  themeFieldAccentLight: "Acento claro",
  themeFieldAccentHover: "Acento al pasar",
  themeFieldSuccess: "Éxito (verde)",
  themeFieldWarning: "Advertencia",
  themeFieldDanger: "Peligro (rojo)",
  themePresetDefault: "Violeta (por defecto)",
  themePresetMidnightBlue: "Medianoche Azul",
  themePresetForest: "Bosque",
  themePresetEmber: "Brasa",
  themePresetPastelLight: "Claro Pastel",

  // ─── ERRORES ──────────────────────────────────────────────────────────
  errorLogs: "Registros de errores",
  errorLogsDesc: "Gestión de errores y registros",
  exportLogs: "Exportar registros",
  clearLogs: "Borrar registros",
  logsCleared: "Registros borrados",
  logsExported: "Registros exportados ✓",
  clearLogsConfirm:
    "¿Seguro que quieres borrar todos los registros de errores?",
  noErrorLogs: "Sin registros de error",

  // ─── INTEGRACIONES ──────────────────────────────────────────────────
  integrations: "Integraciones",

  // ─── SIDEBAR EDITOR ────────────────────────────────────────────────
  sidebarCustomization: "Personalización de la barra lateral",
  sidebarCustomizationDesc: "Reordena, fija u oculta los elementos del menú",
  sidebarCustomized: "Personalizada",
  sidebarDefault: "Por defecto",
  sidebarEditorOpen: "Abrir editor",
  sidebarEditorClose: "Cerrar editor",
  sidebarEditorSaved: "Barra lateral guardada",
  sidebarEditorResetConfirm: "¿Realmente quieres restablecer la barra lateral?",
  sidebarEditorResetSuccess: "Barra lateral restablecida",

  // ─── SECCIONES COLAPSABLES ─────────────────────────────────────────
  collapseHide: "Ocultar",
  collapseShow: "Mostrar",

  // ─── TUTORIALES (OPCIONES) ─────────────────────────────────────────
  tutorialRestartDesc:
    "Volver a reproducir el tutorial principal desde el principio",
  tutorialAdvancedDesc: "Descubre las funciones avanzadas",
  guideAvailable: "Tutoriales disponibles",
  guideAvailableTip:
    "Estos tutoriales te ayudan a descubrir todas las funciones de SoundDeck.",

  // ─── PLUGINS ───────────────────────────────────────────────────────
  pluginsInstall: "Instalar un plugin",
  pluginsInstallDesc: "Añade nuevas funciones a SoundDeck",
  pluginsInstallBtn: "Instalar",
  pluginsInstalledTitle: "Plugins instalados",
  pluginsCount: "plugin(es)",
  pluginsNoPluginsInstalled: "Ningún plugin instalado",
  pluginsInstallDesc2: 'Haz clic en "Instalar un plugin" para empezar',
  pluginsBy: "por",
  pluginsUnknownAuthor: "Autor desconocido",
  pluginsPages: "página(s)",
  pluginsActivated: "Activado",
  pluginsReloadTooltip: "Recarga la aplicación para aplicar los cambios",
  pluginsUninstall: "Desinstalar plugin",
  pluginsUninstallConfirm: '¿Realmente quieres desinstalar el plugin "{name}"?',
  pluginsUninstallSuccess: 'Plugin "{name}" desinstalado',
  pluginsUninstallError: "Error al desinstalar",
  pluginsWhereToFind: "¿Dónde encontrar plugins?",
  pluginsDescription:
    "Los plugins son extensiones que añaden nuevas funciones a SoundDeck, como la importación de YouTube o el descubrimiento de MyInstants.",
  pluginsCommunityTip:
    "Consulta la comunidad de SoundDeck para descubrir plugins creados por otros usuarios.",
  pluginsDisabledTitle: "Desactivados",
  pluginsEnableBtn: "Reactivar",
  pluginsEnableSuccess: 'Plugin "{name}" reactivado',
  pluginsEnableError: "Error al reactivar el plugin",
  pluginsDisabledStatus: "Desactivado",

  // ─── FEEDBACK ──────────────────────────────────────────────────────
  feedback: "Enviar comentario",
  feedbackDesc: "Reporta un error o propone una idea",
  feedbackScreenshotReady: "Captura lista para enviar",
  feedbackScreenshotRetake: "Volver a capturar",
  feedbackScreenshotRetakeShort: "Repetir",
  feedbackScreenshotCapturing: "Capturando...",
  feedbackAttachImage: "Adjunto (opcional)",
  feedbackAttachImageBtn: "Adjuntar una imagen",
  feedbackAttachImageLoading: "Cargando...",
  feedbackAttachImageRemove: "Quitar imagen",
  feedbackAttachImageRemoveShort: "Quitar",

  // ─── COPIA AUTOMÁTICA ──────────────────────────────────────────────
  autoBackup: "Copia automática",
  autoBackupDesc: "Guarda tu configuración automáticamente",
  autoBackupEnabled: "Copia automática activada",
  autoBackupDisabled: "Copia automática desactivada",

  // ═══════════════════════════════════════════════════════════════════
  // ─── SOPORTE (GitHub Sponsors + Códigos) ───────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  supportSectionTitle: "Apoyar SoundDeck",
  supportSectionDesc:
    "SoundDeck es gratis y open-source. Si quieres apoyar el desarrollo, una donación única desbloquea todos los plugins Pro para siempre.",

  // ─── GITHUB SPONSORS ───────────────────────────────────────────────
  supportGithubSponsor: "Patrocinar en GitHub",
  supportGithubSponsorDesc: "Desbloquea todos los plugins Pro para siempre",
  supportGithubSponsorHint: "Desde 5 € — una sola vez",
  supportGithubSponsorNote:
    "Después de donar, recibirás tu código de activación por email.",

  // ─── OTRAS OPCIONES ────────────────────────────────────────────────
  supportDonateBtn: "Donar",
  supportDonateHint: "Desde 5 € — ¡gracias!",
  supportAlreadyDonor: "¿Ya donaste?",
  supportActivateKey: "Tengo una clave",
  supportSignIn: "Iniciar sesión",
  supportProActive: "Licencia Pro activa",
  supportProActiveDesc:
    "¡Gracias por tu apoyo! Tienes acceso a todos los plugins Pro.",
  supportDevMode: "Modo desarrollador activo",
  supportDevModeDesc:
    "Esta versión fue compilada con una licencia de desarrollador.",

  // ═══════════════════════════════════════════════════════════════════
  // ─── ACERCA DE ─────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  aboutSectionTitle: "Acerca de",
  aboutVersion: "Versión",
  aboutLicense: "Licencia",
  aboutLicenseValue: "MIT",
  aboutSourceCode: "Código fuente",
  aboutSourceCodeValue: "github.com/Stevehunn/sounddeck",
  aboutMadeWith: "Hecho con ❤️ para la comunidad de Discord",
  aboutOpenSource: "SoundDeck es software libre bajo licencia MIT.",

  // ─── Upgrade Pro (banner para cuentas free) ─────────────────────
  supportUpgradeTitle: "Pasa a Pro de por vida",
  supportUpgradeDesc:
    "Desbloquea todos los plugins Pro con una donación única de 5 € o más en GitHub Sponsors. Acceso de por vida, válido en un número ilimitado de PCs.",
};
