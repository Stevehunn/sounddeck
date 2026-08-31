// src/shared/components/ui/HelpButton.jsx
import React from 'react';
import { useLanguage } from '@core/i18n/LanguageContext';

const HelpButton = ({ onClick }) => {
  const { t } = useLanguage();

  return (
    <button
      className="help-button"
      onClick={onClick}
      aria-label={t('helpButtonLabel')}
      title={t('helpButtonTitle')}
    >
      <i className="ti ti-help-circle"></i>
    </button>
  );
};

export default HelpButton;