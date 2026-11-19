/**
 * Shared recipe catalog, seeded by `prisma/seed.ts` after the products (upsert by id, safe to re-run).
 * Items point at catalog products (`catalog.ts`); the seed fails when a product is missing or isn't
 * measured in the given unit. Weight and nutrition are not stored: they follow from the products.
 *
 * Ids are permanent: families' edits, hiding and favorites point at them. Never change or reuse an id.
 */
type Unit = 'g' | 'ml' | 'tsp' | 'tbsp' | 'pieceS' | 'pieceM' | 'pieceL';

export type CatalogRecipeItem = { productId: string; amount: number; unit: Unit };

export type CatalogRecipe = { id: string; name: string; items: CatalogRecipeItem[] };

const i = (productId: string, amount: number, unit: Unit): CatalogRecipeItem => ({ productId, amount, unit });

export const RECIPES: CatalogRecipe[] = [
  {
    // One portion.
    id: 'rcp-kapusta-tushenaya-s-tushenkoy-i-yaytsami',
    name: 'Капуста тушёная с тушёнкой и яйцами',
    items: [
      i('cat-kapusta-belokochannaya', 300, 'g'),
      i('cat-tushenka-govyazhya', 100, 'g'),
      i('cat-yaytso-kurinoe', 1, 'pieceM'),
      i('cat-luk-repchatyy', 0.5, 'pieceM'),
      i('cat-morkov', 1, 'pieceS'),
      i('cat-tomatnaya-pasta', 1, 'tbsp'),
      i('cat-maslo-podsolnechnoe', 1, 'tbsp'),
      i('cat-sakhar', 1, 'tsp'),
      i('cat-sol', 0.5, 'tsp'),
      i('cat-voda', 100, 'ml'),
    ],
  },
  {
    // One portion.
    id: 'rcp-borshch-s-govyadinoy',
    name: 'Борщ с говядиной',
    items: [
      i('cat-govyadina-dlya-tusheniya', 100, 'g'),
      i('cat-svekla', 0.5, 'pieceS'),
      i('cat-kapusta-belokochannaya', 80, 'g'),
      i('cat-kartofel', 1, 'pieceM'),
      i('cat-morkov', 0.5, 'pieceS'),
      i('cat-luk-repchatyy', 0.5, 'pieceS'),
      i('cat-chesnok-zubchik', 1, 'pieceM'),
      i('cat-tomatnaya-pasta', 1, 'tbsp'),
      i('cat-maslo-podsolnechnoe', 1, 'tsp'),
      i('cat-sol', 0.5, 'tsp'),
      i('cat-voda', 350, 'ml'),
      i('cat-smetana-20', 1, 'tbsp'),
      i('cat-ukrop', 1, 'tbsp'),
    ],
  },
];
