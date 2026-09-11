// src/features/editor/tutorialSteps.js
export const TUTORIAL_STEPS = (t) => {  
  const steps = [
    {
      id: 'editor-1',
      title: t('tutorialEditorStep1Title') || 'La barre d\'outils',
      description: t('tutorialEditorStep1Desc') || 'En haut de l\'écran se trouve la barre d\'outils. C\'est là que vous gérez vos projets, ajoutez des pistes, importez des fichiers et contrôlez la lecture.',
      icon: '📂',
      target: '[data-testid="editor-toolbar"]',
      fallbackTarget: '.editor-toolbar',
      hint: t('tutorialEditorStep1Hint') || '💡 Astuce : Le métronome (🎵) vous aide à garder le tempo.',
      position: 'bottom',
    },
    {
      id: 'editor-2',
      title: t('tutorialEditorStep2Title') || 'Ajouter un son à votre projet',
      description: t('tutorialEditorStep2Desc') || 'Cliquez sur "Ajouter un son" dans la barre d\'outils pour importer un son depuis votre bibliothèque SoundDeck vers la timeline.',
      icon: '📥',
      target: '[data-testid="editor-add-clip-button"]',
      fallbackTarget: '.editor-toolbar',
      hint: t('tutorialEditorStep2Hint') || '💡 Astuce : Vous pouvez aussi importer un fichier audio externe avec "Importer un fichier".',
      position: 'bottom',
    },
    {
      id: 'editor-3',
      title: t('tutorialEditorStep3Title') || 'La timeline et les pistes',
      description: t('tutorialEditorStep3Desc') || 'Au centre se trouve la timeline avec vos pistes. Chaque piste contient des clips (sons) que vous pouvez déplacer en les glissant, ou ajuster leur durée en tirant sur les bords.',
      icon: '📊',
      target: '[data-testid="editor-timeline"]',
      fallbackTarget: '.timeline-container',
      hint: t('tutorialEditorStep3Hint') || '💡 Astuce : Les pistes vous permettent d\'organiser vos sons par catégorie (batterie, voix, effets...).',
      position: 'bottom',
    },
    {
      id: 'editor-4',
      title: t('tutorialEditorStep4Title') || 'Le menu contextuel du clip',
      description: t('tutorialEditorStep4Desc') || 'Faites un clic droit sur un clip pour ouvrir un menu contextuel. Vous y trouverez toutes les actions : couper, dupliquer, ajouter des effets, activer la boucle, et bien plus.',
      icon: '🖱️',
      target: '.clip-actions-menu',
      fallbackTarget: '[data-testid="context-menu"]',
      hint: t('tutorialEditorStep4Hint') || '💡 Astuce : Le menu contextuel est l\'outil principal pour gérer vos clips.',
      position: 'right',
      afterShow: () => {
        setTimeout(() => {
          const clip = document.querySelector('[data-testid="editor-clip"]') || 
                       document.querySelector('.editor-clip-wrapper')
          if (clip) {
            const rect = clip.getBoundingClientRect()
            const event = new MouseEvent('contextmenu', {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: rect.left + rect.width / 2,
              clientY: rect.top + 20,
            })
            clip.dispatchEvent(event)
            
            setTimeout(() => {
              const menu = document.querySelector('.clip-actions-menu') || 
                           document.querySelector('[data-testid="context-menu"]')
              if (menu) {
                window.__tutorialUpdateTarget?.()
              }
            }, 400)
          }
        }, 500)
      },
      onLeave: () => {
        setTimeout(() => {
          const clickEvent = new MouseEvent('mousedown', { view: window, bubbles: true })
          document.body.dispatchEvent(clickEvent)
        }, 100)
      }
    },
    {
      id: 'editor-5',
      title: t('tutorialEditorStep5Title') || 'Les effets audio',
      description: t('tutorialEditorStep5Desc') || 'Cliquez sur "Effets" dans la barre d\'outils pour ouvrir le panneau des effets. Sélectionnez un clip, puis cliquez sur "Ajouter un effet" pour personnaliser votre son.',
      icon: '🎛️',
      target: '[data-testid="editor-add-effect-button"]',
      fallbackTarget: '[data-testid="editor-effects-panel"]',
      hint: t('tutorialEditorStep5Hint') || '💡 Astuce : L\'auto-preview joue les effets 1 seconde après chaque modification.',
      position: 'top',
      afterShow: () => {
        
        const selectClipAndOpenPanel = () => {
          // 1. Sélectionner le clip
          if (window.__editorGetFirstClipId) {
            const clipId = window.__editorGetFirstClipId()
            if (clipId && window.__editorSelectClip) {
              window.__editorSelectClip(clipId)
            }
          } else {
            const clipEl = document.querySelector('[data-testid="editor-clip"]') || 
                           document.querySelector('.editor-clip-wrapper')
            if (clipEl) {
              const clickEvent = new MouseEvent('click', { view: window, bubbles: true })
              clipEl.dispatchEvent(clickEvent)
            }
          }
          
          // 2. Ouvrir le panneau des effets (si pas déjà ouvert)
          setTimeout(() => {
            const panel = document.querySelector('[data-testid="editor-effects-panel"]')
            if (!panel) {
              const toggleBtn = document.querySelector('[data-testid="editor-effects-panel-toggle"]')
              if (toggleBtn) {
                const isActive = toggleBtn.classList.contains('btn-primary')
                if (!isActive) {
                  toggleBtn.click()
                }
              }
            } else {
            }
            
            // 3. Mettre à jour la cible
            setTimeout(() => {
              window.__tutorialUpdateTarget?.()
            }, 300)
          }, 300)
        }
        
        setTimeout(selectClipAndOpenPanel, 400)
      },
      onLeave: () => {
      }
    },
    {
      id: 'editor-6',
      title: t('tutorialEditorStep6Title') || 'Personnaliser avec les effets',
      description: t('tutorialEditorStep6Desc') || 'Une fois le panneau des effets ouvert, vous pouvez ajuster chaque paramètre. Par exemple, pour l\'effet "Volume", faites glisser le curseur pour augmenter ou baisser le volume.',
      icon: '🔊',
      target: '[data-testid="editor-effect-item"]',
      fallbackTarget: '[data-testid="editor-effects-panel"]',
      hint: t('tutorialEditorStep6Hint') || '💡 Astuce : Chaque effet a des paramètres uniques. Explorez-les pour découvrir toutes les possibilités !',
      position: 'top',
      afterShow: () => {
        
        let effectAdded = false
        
        // ✅ Vérifier si le panneau est ouvert, l'ouvrir si nécessaire
        const ensurePanelOpen = () => {
          const panel = document.querySelector('[data-testid="editor-effects-panel"]')
          if (panel) {
            return true
          }
          
          const toggleBtn = document.querySelector('[data-testid="editor-effects-panel-toggle"]')
          if (toggleBtn) {
            const isActive = toggleBtn.classList.contains('btn-primary')
            if (!isActive) {
              toggleBtn.click()
            }
            return true
          }
          return false
        }
        
        // ✅ S'assurer que le clip est sélectionné
        const ensureClipSelected = () => {
          if (window.__editorGetFirstClipId) {
            const clipId = window.__editorGetFirstClipId()
            if (clipId && window.__editorSelectClip) {
              window.__editorSelectClip(clipId)
              return true
            }
          }
          const clipEl = document.querySelector('[data-testid="editor-clip"]') || 
                         document.querySelector('.editor-clip-wrapper')
          if (clipEl) {
            clipEl.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true }))
            return true
          }
          return false
        }
        
        // ✅ Ajouter un effet Volume si nécessaire
        const addVolumeEffect = () => {
          // Vérifier si un effet existe déjà
          const existingEffect = document.querySelector('[data-testid="editor-effect-item"]') ||
                                document.querySelector('.effect-item') ||
                                document.querySelector('[class*="effect-item"]')
          
          if (existingEffect) {
            setTimeout(() => {
              window.__tutorialUpdateTarget?.()
            }, 200)
            return
          }
          
          // ✅ Attendre que le DOM soit prêt avant de chercher le bouton
          setTimeout(() => {
            const addBtn = document.querySelector('[data-testid="editor-add-effect-button"]') ||
                          document.querySelector('.add-effect-button') ||
                          Array.from(document.querySelectorAll('button')).find(
                            btn => btn.textContent?.includes('Ajouter un effet') || 
                                   btn.textContent?.includes('Add effect')
                          )
            
            if (!addBtn) {
              console.warn('⚠️ [Tutorial] Bouton "Ajouter un effet" non trouvé')
              // ✅ Fallback : essayer de mettre à jour la cible quand même
              setTimeout(() => {
                window.__tutorialUpdateTarget?.()
              }, 300)
              return
            }
            
            addBtn.click()
            
            setTimeout(() => {
              const volumeBtn = Array.from(document.querySelectorAll('button')).find(
                btn => btn.textContent?.trim() === 'Volume' || 
                       btn.textContent?.includes('📢 Volume') ||
                       btn.textContent?.includes('🔊 Volume')
              ) || document.querySelector('[data-testid="effect-volume"]')
              
              if (volumeBtn) {
                volumeBtn.click()
                effectAdded = true
                
                setTimeout(() => {
                  const effectItem = document.querySelector('[data-testid="editor-effect-item"]') ||
                                    document.querySelector('.effect-item') ||
                                    document.querySelector('[class*="effect-item"]')
                  
                  if (effectItem) {
                    setTimeout(() => {
                      window.__tutorialUpdateTarget?.()
                    }, 200)
                  } else {
                    // ✅ Fallback : mettre à jour quand même
                    setTimeout(() => {
                      window.__tutorialUpdateTarget?.()
                    }, 300)
                  }
                }, 500)
              } else {
                console.warn('⚠️ [Tutorial] Effet Volume non trouvé')
                // ✅ Fallback : mettre à jour la cible
                setTimeout(() => {
                  window.__tutorialUpdateTarget?.()
                }, 300)
              }
            }, 400)
          }, 300) // ✅ Délai pour laisser le DOM se mettre à jour
        }
        
        // ✅ Exécution séquentielle
        setTimeout(() => {
          ensureClipSelected()
          
          setTimeout(() => {
            ensurePanelOpen()
            
            setTimeout(() => {
              addVolumeEffect()
            }, 400) // ✅ Délai augmenté
          }, 300)
        }, 400)
      },
      onLeave: () => {
        
        setTimeout(() => {
          const deleteBtn = document.querySelector('[data-testid="editor-effect-delete"]') ||
                            document.querySelector('.effect-delete-button') ||
                            Array.from(document.querySelectorAll('button')).find(
                              btn => btn.textContent?.includes('✕') || 
                                     btn.textContent?.includes('×') ||
                                     btn.getAttribute('data-testid') === 'delete-effect'
                            ) ||
                            Array.from(document.querySelectorAll('button')).find(
                              btn => btn.querySelector('.ti-trash') || 
                                     btn.querySelector('.ti-x')
                            )
          
          if (deleteBtn) {
            deleteBtn.click()
          } else {
            console.warn('⚠️ [Tutorial] Bouton de suppression d\'effet non trouvé')
          }
        }, 300)
      }
    },
    {
      id: 'editor-7',
      title: t('tutorialEditorStep7Title') || 'Le zoom de la timeline',
      description: t('tutorialEditorStep7Desc') || 'Utilisez les contrôles de zoom en bas de l\'écran pour agrandir ou réduire la timeline. Cela vous permet de travailler sur des détails précis ou de voir l\'ensemble de votre projet.',
      icon: '🔍',
      target: '[data-testid="editor-zoom-controls"]',
      fallbackTarget: '[data-testid="editor-container"]',
      hint: t('tutorialEditorStep7Hint') || '💡 Astuce : Utilisez Ctrl+Molette ou Ctrl+{/* */}+/- pour zoomer rapidement.',
      position: 'top',
    },
    {
      id: 'editor-8',
      title: t('tutorialEditorStep8Title') || 'Le volume maître',
      description: t('tutorialEditorStep8Desc') || 'À droite du zoom, vous trouverez le contrôle du volume maître. Il ajuste le niveau sonore global de votre projet. Vous pouvez également le couper avec le bouton à gauche.',
      icon: '🔊',
      target: '[data-testid="editor-master-volume"]',
      fallbackTarget: '[data-testid="editor-container"]',
      hint: t('tutorialEditorStep8Hint') || '💡 Astuce : Le volume maître affecte tous les sons du projet, pas seulement les pistes.',
      position: 'top',
    },
    {
      id: 'editor-9',
      title: t('tutorialEditorStep9Title') || 'Exporter votre projet',
      description: t('tutorialEditorStep9Desc') || 'Une fois votre projet terminé, cliquez sur "Exporter" dans la barre d\'outils pour sauvegarder votre création en MP3, WAV ou d\'autres formats.',
      icon: '💾',
      target: '[data-testid="editor-export-button"]',
      fallbackTarget: '.editor-toolbar',
      hint: t('tutorialEditorStep9Hint') || '💡 Astuce : MP3 pour une taille réduite, WAV pour une qualité sans perte.',
      position: 'bottom',
    },
  ]
  
  return steps
}