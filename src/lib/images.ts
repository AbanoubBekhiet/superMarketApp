export const LOCAL_IMAGES = {
  'prod-tomatoes': require('../../assets/images/tazaj/prod-tomatoes.png') as number,
  'prod-avocado': require('../../assets/images/tazaj/prod-avocado.png') as number,
  'prod-milk': require('../../assets/images/tazaj/prod-milk.png') as number,
  'prod-olive-oil': require('../../assets/images/tazaj/prod-olive-oil.png') as number,
  'prod-honey': require('../../assets/images/tazaj/prod-honey.png') as number,
  'prod-bread': require('../../assets/images/tazaj/prod-bread.png') as number,
  'prod-cheese': require('../../assets/images/tazaj/prod-cheese.png') as number,
  'prod-juice': require('../../assets/images/tazaj/prod-juice.png') as number,
  'prod-detergent': require('../../assets/images/tazaj/prod-detergent.png') as number,
  'prod-chicken': require('../../assets/images/tazaj/prod-chicken.png') as number,
  'prod-cucumber': require('../../assets/images/tazaj/prod-cucumber.png') as number,
  'prod-apple': require('../../assets/images/tazaj/prod-apple.png') as number,
  'cat-vegetables': require('../../assets/images/tazaj/cat-vegetables.png') as number,
  'cat-dairy': require('../../assets/images/tazaj/cat-dairy.png') as number,
  'cat-bakery': require('../../assets/images/tazaj/cat-bakery.png') as number,
  'cat-beverages': require('../../assets/images/tazaj/cat-beverages.png') as number,
  'cat-cleaning': require('../../assets/images/tazaj/cat-cleaning.png') as number,
  'cat-meat': require('../../assets/images/tazaj/cat-meat.png') as number,
  'promo-basket': require('../../assets/images/tazaj/promo-basket.png') as number,
  'avatar-ahmed': require('../../assets/images/tazaj/avatar-ahmed.png') as number,
} as const;

export type LocalImageKey = keyof typeof LOCAL_IMAGES;

export function getLocalImage(key: string): number {
  if (key in LOCAL_IMAGES) {
    return LOCAL_IMAGES[key as LocalImageKey];
  }
  return LOCAL_IMAGES['prod-tomatoes'];
}
