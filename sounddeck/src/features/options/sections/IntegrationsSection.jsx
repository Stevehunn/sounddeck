// src/features/options/sections/IntegrationsSection.jsx
import { useLanguage } from '@core/i18n/LanguageContext'
import OBSControl from '@shared/components/settings/OBSControl'
import Section from '../Section'

export default function IntegrationsSection({ sectionRef }) {
  const { t, currentLang } = useLanguage()

  return (
    <Section ref={sectionRef} id="integrations" title={t('integrations')} icon="ti-plug">
      <OBSControl lang={currentLang} />
    </Section>
  )
}