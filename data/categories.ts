import { IngridientCategory } from '../types/categorie';

export const INGRIDIENT_CATEGORIES: Record<string, IngridientCategory> = {
  UNCATEGORIZED: {
    name: 'Без категории',
    key: 'UNCATEGORIZED'
  },
  DAIRY: {
    name: 'Молочные продукты',
    key: 'DAIRY'
  },
  MEAT_FISH: {
    name: 'Мясо и рыба',
    key: 'MEAT_FISH'
  },
  CEREALS: {
    name: 'Крупы, хлеб, мука',
    key: 'CEREALS'
  },
  VEGETABLES: {
    name: 'Овощи и зелень',
    key: 'VEGETABLES'
  },
  FRUITS: {
    name: 'Фрукты и ягоды',
    key: 'FRUITS'
  },
  NUTS_SEEDS: {
    name: 'Орехи и семена',
    key: 'NUTS_SEEDS'
  },
  FATS_OILS: {
    name: 'Жиры и масла',
    key: 'FATS_OILS'
  }
} as const;