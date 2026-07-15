/**
 * Toutes les catégories disponibles sur MyInstants
 * Chaque catégorie utilise une clé de traduction
 */
export const CATEGORIES = {
  // ─── TENDANCES ET POPULAIRES ──────────────────────────────────────────────
  trending: {
    id: 'trending',
    labelKey: 'category_trending',
    emoji: '🔥',
    icon: 'ti-trending-up',
    mode: 'local',
    query: '',
    color: '#ef4444'
  },
  best: {
    id: 'best',
    labelKey: 'category_best',
    emoji: '🏆',
    icon: 'ti-trophy',
    mode: 'multi',
    query: 'vine boom,bruh,airhorn,oof,sad trombone',
    color: '#f59e0b'
  },
  popular: {
    id: 'popular',
    labelKey: 'category_popular',
    emoji: '⭐',
    icon: 'ti-star',
    mode: 'multi',
    query: 'meme,discord,notification,funny,laugh',
    color: '#8b5cf6'
  },

  // ─── MEMES ET HUMOUR ──────────────────────────────────────────────────────
  memes: {
    id: 'memes',
    labelKey: 'category_memes',
    emoji: '😂',
    icon: 'ti-mood-happy',
    mode: 'multi',
    query: 'memes,viral,funny,bruh,oof',
    color: '#f43f5e'
  },
  vines: {
    id: 'vines',
    labelKey: 'category_vines',
    emoji: '🍇',
    icon: 'ti-video',
    mode: 'multi',
    query: 'vine boom,road work ahead,free shavacado,look at all those chickens',
    color: '#22c55e'
  },
  reactions: {
    id: 'reactions',
    labelKey: 'category_reactions',
    emoji: '😱',
    icon: 'ti-mood-surprised',
    mode: 'multi',
    query: 'bruh,laugh,crying,surprised,angry',
    color: '#f97316'
  },
  sounds: {
    id: 'sounds',
    labelKey: 'category_sounds',
    emoji: '🔊',
    icon: 'ti-speakerphone',
    mode: 'multi',
    query: 'airhorn,sad trombone,applause,doorbell,phone ring',
    color: '#06b6d4'
  },

  // ─── DISCORD ET STREAMING ─────────────────────────────────────────────────
  discord: {
    id: 'discord',
    labelKey: 'category_discord',
    emoji: '💬',
    icon: 'ti-brand-discord',
    mode: 'multi',
    query: 'discord,ping,notification,streamer,meme',
    color: '#5865F2'
  },
  twitch: {
    id: 'twitch',
    labelKey: 'category_twitch',
    emoji: '🎮',
    icon: 'ti-brand-twitch',
    mode: 'multi',
    query: 'twitch,streamer,raid,hype,pog',
    color: '#9146FF'
  },
  streaming: {
    id: 'streaming',
    labelKey: 'category_streaming',
    emoji: '📺',
    icon: 'ti-player-play',
    mode: 'multi',
    query: 'stream,alert,sub,follow,donation',
    color: '#ec4899'
  },
  gaming: {
    id: 'gaming',
    labelKey: 'category_gaming',
    emoji: '🎮',
    icon: 'ti-controller',
    mode: 'multi',
    query: 'game,play,win,lose,multiplayer',
    color: '#8b5cf6'
  },

  // ─── ANIME ET MANGA ──────────────────────────────────────────────────────
  anime: {
    id: 'anime',
    labelKey: 'category_anime',
    emoji: '⛩️',
    icon: 'ti-mood-edit',
    mode: 'search',
    query: 'anime & manga',
    color: '#ec4899'
  },
  anime_sounds: {
    id: 'anime_sounds',
    labelKey: 'category_anime_sounds',
    emoji: '🎌',
    icon: 'ti-mood-smile',
    mode: 'multi',
    query: 'anime,otaku,waifu,manga,japanese',
    color: '#f43f5e'
  },
  naruto: {
    id: 'naruto',
    labelKey: 'category_naruto',
    emoji: '🍥',
    icon: 'ti-mood-smile',
    mode: 'multi',
    query: 'naruto,sasuke,kakashi,sharingan,rasengan',
    color: '#f97316'
  },
  one_piece: {
    id: 'one_piece',
    labelKey: 'category_one_piece',
    emoji: '🏴‍☠️',
    icon: 'ti-mood-smile',
    mode: 'multi',
    query: 'one piece,luffy,zoro,anime',
    color: '#ef4444'
  },
  dragon_ball: {
    id: 'dragon_ball',
    labelKey: 'category_dragon_ball',
    emoji: '🐉',
    icon: 'ti-mood-smile',
    mode: 'multi',
    query: 'dragon ball,goku,vegeta,kamehameha',
    color: '#f59e0b'
  },

  // ─── JEUX VIDÉO ───────────────────────────────────────────────────────────
  video_games: {
    id: 'video_games',
    labelKey: 'category_video_games',
    emoji: '🎮',
    icon: 'ti-device-gamepad-2',
    mode: 'multi',
    query: 'games,gaming,mario,zelda,pokemon',
    color: '#8b5cf6'
  },
  minecraft: {
    id: 'minecraft',
    labelKey: 'category_minecraft',
    emoji: '⛏️',
    icon: 'ti-cube',
    mode: 'multi',
    query: 'minecraft,steve,creeper,diamond,block',
    color: '#22c55e'
  },
  fortnite: {
    id: 'fortnite',
    labelKey: 'category_fortnite',
    emoji: '🔫',
    icon: 'ti-crosshair',
    mode: 'multi',
    query: 'fortnite,default dance,orange justice,take the l',
    color: '#06b6d4'
  },
  roblox: {
    id: 'roblox',
    labelKey: 'category_roblox',
    emoji: '🎲',
    icon: 'ti-cube',
    mode: 'multi',
    query: 'roblox,oof,noob,roblox death sound',
    color: '#f43f5e'
  },
  among_us: {
    id: 'among_us',
    labelKey: 'category_among_us',
    emoji: '🟣',
    icon: 'ti-user',
    mode: 'multi',
    query: 'among us,sus,vent,impostor,crewmate',
    color: '#8b5cf6'
  },

  // ─── FILMS ET SÉRIES ──────────────────────────────────────────────────────
  movies: {
    id: 'movies',
    labelKey: 'category_movies',
    emoji: '🎬',
    icon: 'ti-movie',
    mode: 'multi',
    query: 'movies,star wars,marvel,harry potter,lord of the rings',
    color: '#f59e0b'
  },
  star_wars: {
    id: 'star_wars',
    labelKey: 'category_star_wars',
    emoji: '⚔️',
    icon: 'ti-swords',
    mode: 'multi',
    query: 'star wars,luke,vader,force,lightsaber',
    color: '#f97316'
  },
  marvel: {
    id: 'marvel',
    labelKey: 'category_marvel',
    emoji: '🦸',
    icon: 'ti-user',
    mode: 'multi',
    query: 'marvel,avengers,iron man,spiderman,thanos',
    color: '#ef4444'
  },
  harry_potter: {
    id: 'harry_potter',
    labelKey: 'category_harry_potter',
    emoji: '🪄',
    icon: 'ti-magic-wand',
    mode: 'multi',
    query: 'harry potter,potter,hogwarts,magic',
    color: '#f59e0b'
  },

  // ─── MUSIQUE ──────────────────────────────────────────────────────────────
  music: {
    id: 'music',
    labelKey: 'category_music',
    emoji: '🎵',
    icon: 'ti-music',
    mode: 'multi',
    query: 'music,song,beat,instrument,melody',
    color: '#ec4899'
  },
  memes_music: {
    id: 'memes_music',
    labelKey: 'category_memes_music',
    emoji: '🎶',
    icon: 'ti-headphones',
    mode: 'multi',
    query: 'meme music,soundtrack,epic,funny song',
    color: '#22c55e'
  },

  // ─── SPORTS ───────────────────────────────────────────────────────────────
  sports: {
    id: 'sports',
    labelKey: 'category_sports',
    emoji: '🏅',
    icon: 'ti-trophy',
    mode: 'multi',
    query: 'sports,football,basketball,goal,score',
    color: '#22c55e'
  },
  football: {
    id: 'football',
    labelKey: 'category_football',
    emoji: '⚽',
    icon: 'ti-ball-football',
    mode: 'multi',
    query: 'football,soccer,goal,messi,ronaldo',
    color: '#22c55e'
  },

  // ─── POLITIQUE ─────────────────────────────────────────────────────────────
  politics: {
    id: 'politics',
    labelKey: 'category_politics',
    emoji: '🏛️',
    icon: 'ti-building',
    mode: 'multi',
    query: 'politics,trump,biden,obama,macron',
    color: '#3b82f6'
  },
  french_politics: {
    id: 'french_politics',
    labelKey: 'category_french_politics',
    emoji: '🇫🇷',
    icon: 'ti-flag-3',
    mode: 'multi',
    query: 'macron,le pen,melanchon,philippe,attal',
    color: '#3b82f6'
  },

  // ─── DIVERS ──────────────────────────────────────────────────────────────
  animals: {
    id: 'animals',
    labelKey: 'category_animals',
    emoji: '🐾',
    icon: 'ti-paw',
    mode: 'multi',
    query: 'animals,cat,dog,bird,meow,bark',
    color: '#22c55e'
  },
  cat: {
    id: 'cat',
    labelKey: 'category_cat',
    emoji: '🐱',
    icon: 'ti-cat',
    mode: 'multi',
    query: 'cat,meow,kitty,cute cat',
    color: '#f97316'
  },
  dog: {
    id: 'dog',
    labelKey: 'category_dog',
    emoji: '🐶',
    icon: 'ti-dog',
    mode: 'multi',
    query: 'dog,bark,woof,puppy',
    color: '#8b5cf6'
  },

  // ─── SONS DE BASE ─────────────────────────────────────────────────────────
  alerts: {
    id: 'alerts',
    labelKey: 'category_alerts',
    emoji: '🔔',
    icon: 'ti-bell',
    mode: 'multi',
    query: 'alarm,alert,notification,beep,ring',
    color: '#ef4444'
  },
  alarms: {
    id: 'alarms',
    labelKey: 'category_alarms',
    emoji: '🚨',
    icon: 'ti-alert-triangle',
    mode: 'multi',
    query: 'alarm,siren,warning,emergency',
    color: '#ef4444'
  },
  notifications: {
    id: 'notifications',
    labelKey: 'category_notifications',
    emoji: '📱',
    icon: 'ti-message',
    mode: 'multi',
    query: 'notification,ping,message,ding',
    color: '#06b6d4'
  },

  // ─── EFFETS SONORES ──────────────────────────────────────────────────────
  sfx: {
    id: 'sfx',
    labelKey: 'category_sfx',
    emoji: '🎚️',
    icon: 'ti-wave-sine',
    mode: 'multi',
    query: 'sound effect,sfx,impact,hit,explosion',
    color: '#8b5cf6'
  },
  impacts: {
    id: 'impacts',
    labelKey: 'category_impacts',
    emoji: '💥',
    icon: 'ti-bolt',
    mode: 'multi',
    query: 'impact,hit,punch,smash,collision',
    color: '#ef4444'
  },
  transitions: {
    id: 'transitions',
    labelKey: 'category_transitions',
    emoji: '🔄',
    icon: 'ti-switch',
    mode: 'multi',
    query: 'transition,whoosh,sweep,glide',
    color: '#06b6d4'
  },

  // ─── NOUVEAUTÉS ──────────────────────────────────────────────────────────
  new: {
    id: 'new',
    labelKey: 'category_new',
    emoji: '🆕',
    icon: 'ti-sparkles',
    mode: 'trending',
    query: '',
    color: '#22c55e'
  }
}

export const CATEGORIES_LIST = Object.values(CATEGORIES)

export default CATEGORIES