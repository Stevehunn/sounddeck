/**
 * @file Small floating "help" button (bottom-right corner).
 *
 * A discrete circular button that opens the tutorial for the current page.
 * The styling (position, hover, size) is defined in `index.css` under the
 * `.help-button` class — this component just renders the button + icon.
 *
 * @see ../../App.jsx — where `onClick` triggers `openTutorial(pageId)`
 * @see ./Tutorial.jsx — the tutorial overlay it opens
 */

import { useLanguage } from "@core/i18n/LanguageContext";

/**
 * Floating help button.
 *
 * @param {Object} props
 * @param {() => void} props.onClick - Called when the user clicks the
 *   button. Typically opens the tutorial for the current page.
 * @returns {JSX.Element}
 */
const HelpButton = ({ onClick }) => {
  const { t } = useLanguage();

  return (
    <button
      className="help-button"
      onClick={onClick}
      aria-label={t("helpButtonLabel")}
      title={t("helpButtonTitle")}
    >
      <i className="ti ti-help-circle"></i>
    </button>
  );
};

export default HelpButton;