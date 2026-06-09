import { useState } from 'react'

const STEPS = [
  {
    id: 'install',
    icon: '📦',
    title: 'Étape 1 — Télécharger les outils',
    color: '#7C6FF7',
    content: (
      <div>
        <p style={{ marginBottom: 12 }}>Deux outils gratuits sont nécessaires pour mélanger ta voix et les sons de SoundDeck.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DownloadCard
            icon="🔌"
            name="VB-Audio Virtual Cable"
            desc="Crée un câble audio virtuel entre SoundDeck et VoiceMeeter"
            url="https://vb-audio.com/Cable/"
            instructions="Extraire le ZIP → lancer VBCABLE_Setup_x64.exe en administrateur → redémarrer le PC"
          />
          <DownloadCard
            icon="🎚️"
            name="VoiceMeeter Banana"
            desc="Mélange ta voix + les sons de SoundDeck en une seule sortie"
            url="https://vb-audio.com/Voicemeeter/banana.htm"
            instructions="Installer → redémarrer le PC → lancer avant Discord"
          />
        </div>
        <InfoBox type="warning" text="Redémarre ton PC après chaque installation pour que Windows détecte les nouveaux périphériques audio." />
      </div>
    )
  },
  {
    id: 'voicemeeter',
    icon: '🎚️',
    title: 'Étape 2 — Configurer VoiceMeeter Banana',
    color: '#2f81f7',
    content: (
      <div>
        <p style={{ marginBottom: 14 }}>Lance VoiceMeeter Banana et configure les entrées/sorties comme suit :</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <ConfigStep
            number="1"
            title="Hardware Input 1 → Ton micro"
            desc='Clique sur "HARDWARE INPUT 1" et sélectionne ton micro physique (ex: Microphone Realtek, Blue Yeti...) Pour éviter de t&apos;entendre en écho, désactive le bouton A1'
          />
          <ConfigStep
            number="2"
            title="Hardware Input 2 → CABLE Output"
            desc='Clique sur "HARDWARE INPUT 2" et sélectionne "CABLE Output (VB-Audio Virtual Cable)"'
            icon="🔌"
          />
          <ConfigStep
            number="3"
            title="Activer B1 sur les deux entrées"
            desc="Sur HARDWARE INPUT 1 et HARDWARE INPUT 2, active le bouton B1 (envoi vers Discord)"
            icon="🔘"
          />
          <ConfigStep
            number="4"
            title="A1 → MME(Multimedia) → Ton casque/haut-parleurs"
            desc='En haut à droite, clique sur "A1" et sélectionne ton casque ou tes haut-parleurs'
            icon="🎧"
          />
        </div>

        {/* Schéma visuel */}
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 2 }}>
          <div style={{ color: 'var(--text-tertiary)', marginBottom: 6, fontSize: 11, fontFamily: 'inherit' }}>Schéma du flux audio :</div>
          <div style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: '#2f81f7' }}>Ton micro</span> ──────────────────────────┐<br/>
            {'                                    '}<span style={{ color: 'var(--accent)' }}>▼</span><br/>
            {'                            '}<span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>VoiceMeeter Banana</span><br/>
            <span style={{ color: '#23c55e' }}>SoundDeck</span> ──▶ CABLE Input ──▶ CABLE Output ──┘<br/>
            {'                                    '}<span style={{ color: 'var(--accent)' }}>│</span><br/>
            {'                                    '}<span style={{ color: 'var(--accent)' }}>▼</span><br/>
            {'                        '}<span style={{ color: '#EF9F27', fontWeight: 'bold' }}>VoiceMeeter Output</span><br/>
            {'                                    '}<span style={{ color: 'var(--accent)' }}>│</span><br/>
            {'                                    '}<span style={{ color: 'var(--accent)' }}>▼</span><br/>
            {'                              '}<span style={{ color: '#ef4444', fontWeight: 'bold' }}>Discord 🎙️</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'sounddeck',
    icon: '🎛️',
    title: 'Étape 3 — Configurer SoundDeck',
    color: '#23c55e',
    content: (
      <div>
        <p style={{ marginBottom: 14 }}>Dans SoundDeck, va dans <strong>Options → Audio</strong> et configure :</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ConfigStep
            number="1"
            title='Périphérique de sortie → "CABLE Input (VB-Audio Virtual Cable)"'
            desc="C'est par ce câble que les sons de SoundDeck arrivent dans VoiceMeeter"
            icon="🔌"
            highlight
          />
          <ConfigStep
            number="2"
            title='"Jouer en local aussi" → Activé'
            desc="Permet d'entendre les sons sur ton propre casque en même temps que Discord les reçoit"
            icon="🎧"
          />
        </div>
        <InfoBox type="info" text='Si tu ne vois pas "CABLE Input" dans la liste, assure-toi que VB-Audio Virtual Cable est bien installé et que tu as redémarré ton PC.' />
      </div>
    )
  },
  {
    id: 'discord',
    icon: '💬',
    title: 'Étape 4 — Configurer Discord',
    color: '#5865F2',
    content: (
      <div>
        <p style={{ marginBottom: 14 }}>Dans Discord → <strong>Paramètres (⚙️) → Voix & Vidéo</strong> :</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <ConfigStep
            number="1"
            title={`"Périphérique d'entrée" → VoiceMeeter Output`}
            desc={`Sélectionne "VoiceMeeter Output (VB-Audio VoiceMeeter VAIO)" — c'est la sortie mixée de VoiceMeeter`}
            icon="🎙️"
            highlight
          />
          <ConfigStep
            number="2"
            title='"Périphérique de sortie" → Ton casque'
            desc="Garde ton casque ou tes haut-parleurs habituels pour entendre les autres"
            icon="🎧"
          />
          <ConfigStep
            number="3"
            title="Désactiver la suppression de bruit"
            desc="Dans Traitement vocal → désactive Suppression de bruit et Annulation d'écho — sinon Discord peut filtrer les sons de SoundDeck"
            icon="🔇"
          />
        </div>
        <InfoBox type="success" text="C'est tout ! Tu peux maintenant parler dans ton micro ET jouer des sons depuis SoundDeck, les deux arriveront dans Discord." />
      </div>
    )
  },
  {
    id: 'tips',
    icon: '💡',
    title: 'Conseils & dépannage',
    color: '#EF9F27',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <TipCard
          icon="🚀"
          title="Lancer VoiceMeeter au démarrage"
          desc='Dans VoiceMeeter → Menu → System Tray → "Run on Windows Startup". Il doit toujours être lancé avant Discord.'
        />
        <TipCard
          icon="🔊"
          title="Régler les volumes indépendamment"
          desc="Dans VoiceMeeter, tu peux ajuster le volume de ton micro et des sons séparément avec les faders. Pratique pour équilibrer."
        />
        <TipCard
          icon="🔁"
          title="Tu t'entends en écho ?"
          desc='Dans VoiceMeeter, désactive le bouton "A1" sur HARDWARE INPUT 1 et garde uniquement "B1" actif. Garde A1 uniquement sur HARDWARE INPUT 2.'
        />
        <TipCard
          icon="❌"
          title="Discord coupe les sons ?"
          desc="Désactive dans Discord : Suppression de bruit, Annulation d'écho, et Contrôle automatique de la sensibilité."
        />
        <TipCard
          icon="🔌"
          title="CABLE Input n'apparaît pas dans SoundDeck ?"
          desc="Redémarre SoundDeck après avoir installé VB-Audio. Si toujours absent, vérifie dans le Gestionnaire de périphériques Windows que le driver est bien installé."
        />
        <TipCard
          icon="🎚️"
          title="Autres personnes n'entendent pas les sons ?"
          desc='Vérifie que Discord utilise bien "VoiceMeeter Output" comme entrée et non ton micro direct. Vérifie aussi que le bouton B1 est actif sur HARDWARE INPUT 2 dans VoiceMeeter.'
        />
      </div>
    )
  }
]

export default function Guide() {
  const [activeStep, setActiveStep] = useState('install')
  const active = STEPS.find(s => s.id === activeStep)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* Sidebar des étapes */}
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-book" style={{ color: 'var(--accent)' }} />
            Guide Discord
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Voix + sons sur Discord
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {STEPS.map((step, i) => (
            <button key={step.id} onClick={() => setActiveStep(step.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: activeStep === step.id ? 'var(--accent-light)' : 'transparent',
                border: 'none', borderLeft: `3px solid ${activeStep === step.id ? step.color : 'transparent'}`,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s'
              }}
              onMouseEnter={e => { if (activeStep !== step.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (activeStep !== step.id) e.currentTarget.style.background = 'transparent' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: activeStep === step.id ? step.color : 'var(--bg-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, transition: 'all 0.1s'
              }}>
                {activeStep === step.id ? <i className="ti ti-check" style={{ color: 'white', fontSize: 13 }} /> : step.icon}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: activeStep === step.id ? step.color : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {step.title.split('—')[0].trim()}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {step.title.split('—')[1]?.trim()}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Résumé rapide */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Récap rapide :</div>
          <div>1. Installer VB-Cable + VoiceMeeter</div>
          <div>2. Micro → VoiceMeeter Input 1</div>
          <div>3. CABLE Output → VoiceMeeter Input 2</div>
          <div>4. SoundDeck → CABLE Input</div>
          <div>5. Discord → VoiceMeeter Output</div>
        </div>
      </div>

      {/* Contenu de l'étape */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header étape */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--border)',
          flexShrink: 0, background: 'var(--bg-secondary)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: active?.color + '22', border: `2px solid ${active?.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
          }}>
            {active?.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{active?.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Étape {STEPS.findIndex(s => s.id === activeStep) + 1} sur {STEPS.length}
            </div>
          </div>

          {/* Navigation prev/next */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn-secondary" style={{ fontSize: 12 }}
              disabled={activeStep === STEPS[0].id}
              onClick={() => {
                const idx = STEPS.findIndex(s => s.id === activeStep)
                if (idx > 0) setActiveStep(STEPS[idx - 1].id)
              }}>
              <i className="ti ti-arrow-left" /> Précédent
            </button>
            <button className="btn-primary" style={{ fontSize: 12 }}
              disabled={activeStep === STEPS[STEPS.length - 1].id}
              onClick={() => {
                const idx = STEPS.findIndex(s => s.id === activeStep)
                if (idx < STEPS.length - 1) setActiveStep(STEPS[idx + 1].id)
              }}>
              Suivant <i className="ti ti-arrow-right" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>
          <div className="fade-in" key={activeStep}>
            {active?.content}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Composants réutilisables ─────────────────────────────────────────────────

function DownloadCard({ icon, name, desc, url, instructions }) {
  const handleOpen = () => {
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div style={{
      padding: '12px 14px', background: 'var(--bg-secondary)',
      border: '1px solid var(--border)', borderRadius: 10,
      display: 'flex', gap: 12, alignItems: 'flex-start'
    }}>
      <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{desc}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', borderRadius: 6, padding: '4px 8px', marginBottom: 8 }}>
          <i className="ti ti-info-circle" style={{ marginRight: 4 }} />{instructions}
        </div>
        <button
          onClick={handleOpen}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--accent)', cursor: 'pointer',
            padding: '6px 12px', border: '1px solid var(--accent)',
            borderRadius: 6, background: 'transparent', transition: 'all 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-light)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          <i className="ti ti-download" /> Télécharger gratuitement
        </button>
      </div>
    </div>
  )
}

function ConfigStep({ number, title, desc, icon, highlight }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10,
      background: highlight ? 'var(--accent-light)' : 'var(--bg-secondary)',
      border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
      display: 'flex', gap: 10, alignItems: 'flex-start'
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        background: highlight ? 'var(--accent)' : 'var(--bg-tertiary)',
        border: `1px solid ${highlight ? 'var(--accent)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        color: highlight ? 'white' : 'var(--text-secondary)'
      }}>
        {number}
      </div>
      <div style={{ fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, color: highlight ? 'var(--accent)' : 'var(--text-primary)' }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
      </div>
    </div>
  )
}

function TipCard({ icon, title, desc }) {
  return (
    <div style={{
      padding: '10px 14px', background: 'var(--bg-secondary)',
      border: '1px solid var(--border)', borderRadius: 10,
      display: 'flex', gap: 10
    }}>
      <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</div>
      </div>
    </div>
  )
}

function InfoBox({ type, text }) {
  const styles = {
    info:    { bg: 'var(--accent-light)',          border: 'var(--accent)',   icon: 'ti-info-circle',    color: 'var(--accent)' },
    warning: { bg: 'rgba(239,159,39,0.1)',          border: 'var(--warning)',  icon: 'ti-alert-triangle', color: 'var(--warning)' },
    success: { bg: 'rgba(29,158,117,0.1)',          border: 'var(--success)',  icon: 'ti-check',          color: 'var(--success)' },
  }
  const s = styles[type] || styles.info
  return (
    <div style={{
      marginTop: 14, padding: '10px 14px', borderRadius: 8,
      background: s.bg, border: `1px solid ${s.border}`,
      display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12
    }}>
      <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 15, flexShrink: 0, marginTop: 1 }} />
      <span style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>{text}</span>
    </div>
  )
}