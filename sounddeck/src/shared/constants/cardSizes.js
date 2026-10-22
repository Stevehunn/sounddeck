export const CARD_SIZES = {
  small: 90,
  medium: 110,
  large: 140,
}

export function getCardSize(size = 'medium') {
  return CARD_SIZES[size] || CARD_SIZES.medium
}

export default { CARD_SIZES, getCardSize }