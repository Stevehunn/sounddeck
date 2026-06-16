# 🎵 SoundDeck

SoundDeck est une soundboard locale pour Discord, conçue pour être simple, rapide et entièrement personnalisable. Elle permet de jouer des sons avec des raccourcis clavier, de gérer plusieurs profils, et de configurer l'audio pour Discord via VB-Audio Virtual Cable.

![SoundDeck Screenshot](https://drive.google.com/drive/folders/1U38IRdb1ffXkVAPF2h0Zz9c9PqeSgNs9?usp=drive_link)

## ✨ Fonctionnalités principales

- **🎛️ Soundboard intuitive** : Ajoutez, organisez et jouez vos sons en un clic.
- **⌨️ Raccourcis clavier** : Assignez des raccourcis à chaque son pour un accès instantané.
- **👥 Profils** : Créez des profils pour organiser vos sons par thème, usage ou humeur.
- **🔄 Loop** : Activez le mode répétition pour vos sons.
- **📱 Mode Présentation** : Affichez vos sons en plein écran pour une utilisation facile pendant les streams ou les réunions.
- **🌐 Multilingue** : Interface disponible en français, anglais et espagnol.
- **🎨 Thèmes personnalisables** : Choisissez un thème sombre, clair ou créez le vôtre.
- **🔊 Intégration Discord** : Configurez l'audio pour que vos sons soient entendus par vos amis sur Discord.
- **📦 Import/Export** : Sauvegardez et partagez vos configurations et vos sons.
- **📥 Découverte** : Parcourez et téléchargez des sons depuis MyInstants directement dans l'application.
- **✂️ Éditeur audio** : Rognez vos sons avant de les ajouter à votre bibliothèque.
- **🎬 YouTube** : Importez l'audio depuis des vidéos YouTube.
- **🎵 Séquenceur** : Créez des playlists de sons et lancez-les en séquence.

## 🚀 Installation

### Prérequis

- Node.js (v18 ou supérieur)
- npm

### Étapes

1. Clonez le dépôt :
```bash
git clone https://github.com/votre-utilisateur/sounddeck.git
cd sounddeck

2. Installez les dépendances :
```bash
npm install

3. Lancez le serveur de développement :
```bash
npm run dev
```

4. Construire l'application :
```bash
npm run build
```

#### 🛠️ Technologies utilisées
-Electron - Framework pour applications de bureau

-React - Interface utilisateur

-Vite - Bundler et serveur de développement

-Howler.js - Lecture audio

-electron-store - Persistance des données

-ffmpeg - Traitement audio (via @ffmpeg-installer/ffmpeg)

##### Structure du projet

sounddeck/
├── electron/
│   ├── main.js          # Processus principal Electron
│   └── preload.js       # Pont entre main et renderer
├── src/
│   ├── components/      # Composants React réutilisables
│   │   ├── AudioTrimmer.jsx
│   │   ├── CustomThemeEditor.jsx
│   │   ├── ShortcutRecorder.jsx
│   │   ├── Sidebar.jsx
│   │   ├── SoundCard.jsx
│   │   ├── Toast.jsx
│   │   └── Waveform.jsx
│   ├── pages/           # Pages de l'application
│   │   ├── Home.jsx
│   │   ├── Discover.jsx
│   │   ├── Editor.jsx
│   │   ├── Sequencer.jsx
│   │   ├── YouTube.jsx
│   │   ├── Guide.jsx
│   │   ├── Options.jsx
│   │   └── Presentation.jsx
│   ├── store/
│   │   └── useStore.js  # Gestion d'état global
│   ├── utils/
│   │   └── audio.js     # Utilitaires audio
│   ├── App.jsx          # Composant principal
│   ├── App.css          # Styles globaux
│   ├── i18n.js          # Traductions
│   ├── index.css        # Styles de base
│   └── main.jsx         # Point d'entrée React
├── public/
│   └── icon.ico         # Icône de l'application
├── package.json
├── vite.config.js
└── README.md

###### 🌐 Traductions=
SoundDeck est disponible dans les langues suivantes :

🇫🇷 Français

🇺🇸 English

🇪🇸 Español

Les traductions sont gérées via le fichier i18n.js. Pour ajouter une nouvelle langue, il suffit d'ajouter les traductions dans ce fichier et d'ajouter la langue dans le tableau LANGUAGES.

###### Ressources utilisées
-MyInstants pour la bibliothèque de sons

-VB-Audio pour les outils audio

-Tous les contributeurs open-source dont les bibliothèques sont utilisées
lien vers le github: https://github.com/abdipr/myinstants-api


###### 📝 Licence
Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus d'informations.