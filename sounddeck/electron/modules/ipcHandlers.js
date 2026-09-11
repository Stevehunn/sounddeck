// electron/modules/ipcHandlers.js
const { ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const store = require('../store')

console.log('🔧 [ipcHandlers] Fichier chargé')
console.log(`🔧 [ipcHandlers] ipcMain existe: ${!!ipcMain}`)


// ─── HANDLERS SYSTÈME ────────────────────────────────────────────────────────

function registerSystemHandlers() {
  console.log('🔧 [ipcHandlers] Début registerSystemHandlers')
  console.log(`📌 ipcMain existe dans la fonction: ${!!ipcMain}`)
  
  if (!ipcMain) {
    console.error('❌ [ipcHandlers] ipcMain est undefined !')
    return
  }
  
  console.log(`📌 Handlers avant: ${ipcMain.eventNames().join(', ')}`)
  
  // Open external URL
  ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url)
  })
  console.log('  ✅ open-external enregistré')

  // Quit app
  ipcMain.handle('quit-app', () => {
    return true
  })
  console.log('  ✅ quit-app enregistré')

  // Hide window
  ipcMain.handle('hide-window', () => {
    const { getMainWindow } = require('./windowManager')
    const mainWindow = getMainWindow()
    if (mainWindow) {
      mainWindow.hide()
    }
    return true
  })
  console.log('  ✅ hide-window enregistré')

  // Show window
  ipcMain.handle('show-window', () => {
    const { showMainWindow } = require('./windowManager')
    showMainWindow()
    return true
  })
  console.log('  ✅ show-window enregistré')

  // Update tray language
  ipcMain.handle('update-tray-language', (event, lang) => {
    console.log(`🌐 update-tray-language: ${lang}`)
    if (global.__updateTrayCallback) {
      global.__updateTrayCallback(lang)
    }
    return true
  })
  console.log('  ✅ update-tray-language enregistré')

  // Get system language
  ipcMain.handle('get-system-language', () => {
    try {
      const { app } = require('electron')
      const locale = app.getLocale()
      const lang = locale.split('-')[0]
      const supported = ['fr', 'en', 'es']
      return supported.includes(lang) ? lang : 'fr'
    } catch (e) {
      console.warn('⚠️ Erreur détection langue:', e)
      return 'fr'
    }
  })
  console.log('  ✅ get-system-language enregistré')

  // Get system keyboard layout
  ipcMain.handle('get-system-keyboard-layout', () => {
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process')
        try {
          const result = execSync(
            'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Keyboard Layout\\DosKeybCodes" /v "0000040c" 2>nul || echo NOT_FOUND',
            { encoding: 'utf8', timeout: 3000 }
          )
          if (result.includes('0000040c')) {
            return 'azerty'
          }
        } catch (e) {}
        
        try {
          const locale = require('electron').app.getLocale()
          const azertyLocales = ['fr', 'fr-FR', 'fr-BE', 'fr-CH']
          if (azertyLocales.some(l => locale.startsWith(l))) {
            return 'azerty'
          }
        } catch (e) {}
        
        return 'qwerty'
      } catch (e) {
        console.warn('⚠️ Erreur détection clavier:', e)
        return 'qwerty'
      }
    }
    return 'qwerty'
  })
  console.log('  ✅ get-system-keyboard-layout enregistré')

  // ─── HANDLER MYINSTANTS ──────────────────────────────────────────────────
  // ✅ NE PAS ENREGISTRER SI DÉJÀ PRÉSENT
  if (!ipcMain.eventNames().includes('fetch-myinstants')) {
    ipcMain.handle('fetch-myinstants', async (event, query, mode = 'search', lang = 'fr') => {
      console.log(`🔍 fetch-myinstants: query="${query}", mode="${mode}", lang="${lang}"`)
      
      try {
        const { LANGUAGES } = require('../i18n')
        const langData = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]
        const country = langData.country || 'fr'

        const TRENDING_URLS = {
          fr: 'https://www.myinstants.com/fr/index/fr/',
          en: 'https://www.myinstants.com/fr/index/us/',
          es: 'https://www.myinstants.com/fr/index/es/'
        }

        const fetchPage = (url) => {
          return new Promise((resolve) => {
            // ✅ TIMEOUT POUR LA RÉCUPÉRATION DE LA PAGE
            const timeout = setTimeout(() => {
              resolve({ ok: false, error: 'Timeout', html: '' })
            }, 15000) // 15 secondes max
            
            https.get(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
              }
            }, (res) => {
              clearTimeout(timeout)
              if ([301,302,303,307].includes(res.statusCode) && res.headers.location) {
                fetchPage(res.headers.location).then(resolve)
                return
              }
              let data = ''
              res.on('data', chunk => data += chunk)
              res.on('end', () => resolve({ ok: true, html: data, status: res.statusCode }))
            }).on('error', (e) => {
              clearTimeout(timeout)
              resolve({ ok: false, error: e.message, html: '' })
            })
          })
        }

        const parseSoundList = (html) => {
          const sounds = []
          const seen = new Set()

          const patterns = [
            /href="https?:\/\/(?:www\.)?myinstants\.com\/(?:fr\/)?instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
            /href="\/fr\/instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
            /href="\/instant\/([a-zA-Z0-9_-]+)\/?"\s*[^>]*>\s*([^<]{1,80})<\/a>/g,
          ]

          const slugToName = {}
          const allSlugs = []

          for (const pattern of patterns) {
            const matches = [...html.matchAll(pattern)]
            for (const m of matches) {
              const slug = m[1]
              const name = m[2]?.trim()
              if (slug && !seen.has(slug) && slug.length > 0 && slug.length < 80) {
                const ignore = ['favorites', 'recent', 'trending', 'search', 'categories',
                               'new', 'profile', 'settings', 'uploaded', 'best_of_all_time',
                               'report', 'add', 'embed']
                if (ignore.some(i => slug.includes(i))) continue
                seen.add(slug)
                allSlugs.push(slug)
                if (name && name.length > 0 && !name.startsWith('!') && !name.includes('svg')) {
                  slugToName[slug] = name
                }
              }
            }
          }

          const soundUrlRegex = /play\('(media\/sounds\/[^']+)'\)/g
          const directUrls = [...html.matchAll(soundUrlRegex)].map(m =>
            `https://www.myinstants.com/${m[1]}`
          )

          const getEmojiForName = (name) => {
            const n = name.toLowerCase()
            if (n.includes('boom') || n.includes('explo')) return '💥'
            if (n.includes('sad') || n.includes('trombone')) return '🎺'
            if (n.includes('air') || n.includes('horn')) return '📣'
            if (n.includes('laugh') || n.includes('lol') || n.includes('bruh')) return '😂'
            if (n.includes('win') || n.includes('yes') || n.includes('epic')) return '🏆'
            if (n.includes('oof') || n.includes('rip') || n.includes('fail')) return '😬'
            if (n.includes('scream') || n.includes('aah') || n.includes('wtf')) return '😱'
            if (n.includes('bell') || n.includes('ding')) return '🔔'
            if (n.includes('drum') || n.includes('ba dum')) return '🥁'
            if (n.includes('cat') || n.includes('meow')) return '🐱'
            if (n.includes('noot') || n.includes('penguin')) return '🐧'
            return '🔊'
          }

          for (let i = 0; i < Math.min(allSlugs.length, 40); i++) {
            const slug = allSlugs[i]
            const rawName = slugToName[slug] || slug.replace(/-\d+$/, '').replace(/-/g, ' ')
            const name = rawName.charAt(0).toUpperCase() + rawName.slice(1)
            const url = directUrls[i] || null

            sounds.push({
              id: `mi_${slug}_${Date.now()}`,
              name,
              slug,
              url,
              emoji: getEmojiForName(name)
            })
          }

          return sounds
        }

        let sounds = []

        if (mode === 'multi') {
          const terms = query.split(',').map(t => t.trim()).filter(Boolean)
          for (const term of terms.slice(0, 4)) {
            const r = await fetchPage(`https://www.myinstants.com/fr/search/?name=${encodeURIComponent(term)}`)
            if (r.ok) {
              const found = parseSoundList(r.html)
              sounds.push(...found)
            }
            await new Promise(r => setTimeout(r, 200))
          }
          const seen = new Set()
          sounds = sounds.filter(s => {
            if (seen.has(s.slug)) return false
            seen.add(s.slug)
            return true
          })
        } else if (mode === 'local') {
          let url = query
          if (!url.startsWith('http')) {
            url = TRENDING_URLS[country] || TRENDING_URLS['fr']
          }
          const result = await fetchPage(url)
          if (!result.ok) return { success: false, error: result.error, sounds: [] }
          sounds = parseSoundList(result.html)
        } else {
          let url
          if (mode === 'trending') {
            url = TRENDING_URLS[country] || TRENDING_URLS['fr']
          } else if (mode === 'category') {
            url = `https://www.myinstants.com/fr/categories/${encodeURIComponent(query)}/`
          } else {
            const q = query && query.trim() ? query : 'meme'
            url = `https://www.myinstants.com/fr/search/?name=${encodeURIComponent(q)}`
          }

          const result = await fetchPage(url)
          if (!result.ok) return { success: false, error: result.error, sounds: [] }
          sounds = parseSoundList(result.html)
        }

        if (!sounds.length) {
          return { success: false, error: 'Aucun son trouvé', sounds: [] }
        }

        // Résoudre les URLs
        const needsResolve = sounds.filter(s => !s.url && s.slug)
        if (needsResolve.length > 0) {
          const toResolve = needsResolve.slice(0, 20)
          for (let i = 0; i < toResolve.length; i += 3) {
            const batch = toResolve.slice(i, i + 3)
            await Promise.all(batch.map(async (sound) => {
              const url = `https://www.myinstants.com/fr/instant/${sound.slug}/`
              const result = await fetchPage(url)
              if (result.ok) {
                const ogAudio = result.html.match(/meta-og:audio:\s*(https?:\/\/[^\s\n]+)/)
                if (ogAudio) {
                  sound.url = ogAudio[0].trim()
                } else {
                  const audioMatch = result.html.match(/href="(\/media\/sounds\/[^"]+\.mp3)"/)
                  if (audioMatch) {
                    sound.url = `https://www.myinstants.com${audioMatch[1]}`
                  }
                }
              }
            }))
            if (i + 3 < toResolve.length) {
              await new Promise(r => setTimeout(r, 300))
            }
          }
        }

        sounds = sounds.filter(s => s.url)

        console.log(`✅ fetch-myinstants: ${sounds.length} sons trouvés`)
        return { success: true, sounds }

      } catch (e) {
        console.error('❌ fetch-myinstants error:', e.message)
        return { success: false, error: e.message, sounds: [] }
      }
    })
    console.log('  ✅ fetch-myinstants enregistré')
  } else {
    console.log('  ⏭️ fetch-myinstants déjà enregistré')
  }

  console.log(`📌 Handlers après: ${ipcMain.eventNames().join(', ')}`)
  console.log('✅ [ipcHandlers] Tous les handlers système enregistrés')
}

// ─── HANDLERS CONFIRMATION ──────────────────────────────────────────────────

function registerConfirmHandlers(windowManager) {
  console.log('🔧 [ipcHandlers] Début registerConfirmHandlers')
  
  if (!ipcMain) {
    console.error('❌ [ipcHandlers] ipcMain est undefined !')
    return
  }
  
  ipcMain.handle('confirm-quit', (event, action, remember) => {
    console.log('🔍 confirm-quit appelé avec:', { action, remember })

    if (action === 'quit') {
      if (remember) {
        store.set('closeToTray', false)
        console.log('💾 closeToTray sauvegardé:', false)
      }
      windowManager.setQuitting(true)
      windowManager.setPendingQuit(true)
      require('electron').app.quit()
      return 'quit'
    } else if (action === 'minimize') {
      if (remember) {
        store.set('closeToTray', true)
        console.log('💾 closeToTray sauvegardé:', true)
      }
      
      const mainWindow = windowManager.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('hide-quit-confirm')
        setTimeout(() => {
          console.log('🔴 [MAIN] Minimisation de la fenêtre après délai')
          mainWindow.hide()
        }, 500)
      }
      return 'minimize'
    } else {
      return 'cancel'
    }
  })
  
  console.log('✅ [ipcHandlers] confirm-quit enregistré')
}

// ─── REGISTRE POUR LE CALLBACK DE MISE À JOUR DU TRAY ─────────────────────

function registerTrayUpdateHandler(callback) {
  global.__updateTrayCallback = callback
  console.log('🔧 [ipcHandlers] Handler de mise à jour du tray enregistré')
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────

module.exports = {
  registerSystemHandlers,
  registerConfirmHandlers,
  registerTrayUpdateHandler,
}

console.log('✅ [ipcHandlers] Module exporté avec succès')