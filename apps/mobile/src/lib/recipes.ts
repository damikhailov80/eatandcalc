import {
  formatNumberInput,
  matchesSearch,
  recipeTotals,
  unitShort,
  type ProductDto,
  type RecipeDto,
  type RecipeItem,
  type RecipeTotals,
} from '@eatandcalc/shared';

import { api } from '@/lib/api';
import { matchesListFilter, useListFlags, type ListFilter } from '@/lib/products';
import { queryKeys } from '@/lib/query';

export type RecipeFilter = ListFilter;

export type ProductsById = ReadonlyMap<string, ProductDto>;

export const productsById = (products: readonly ProductDto[] | undefined): ProductsById =>
  new Map((products ?? []).map((p) => [p.id, p]));

/** A recipe with what the list shows: totals from the current products, the ingredient line. */
export type RecipeView = { recipe: RecipeDto; totals: RecipeTotals; ingredients: string };

/** "1 шт (сред.)", "0,5 ч. л.", "300 г". */
export const formatAmount = (item: Pick<RecipeItem, 'amount' | 'unit'>) =>
  `${formatNumberInput(item.amount, 2)} ${unitShort[item.unit]}`;

/** "Капуста белокочанная 300 г, яйцо куриное 1 шт (сред.), …" */
export function ingredientsLine(items: readonly RecipeItem[], products: ProductsById) {
  return items
    .map((item, i) => {
      const name = products.get(item.productId)?.name ?? 'продукт удалён';
      return `${i === 0 ? name : name.charAt(0).toLowerCase() + name.slice(1)} ${formatAmount(item)}`;
    })
    .join(', ');
}

export const toRecipeView = (recipe: RecipeDto, products: ProductsById): RecipeView => ({
  recipe,
  totals: recipeTotals(recipe.items, products),
  ingredients: ingredientsLine(recipe.items, products),
});

/** Search by the recipe name or any of its products ("Название или продукт"). */
const matchesRecipeSearch = (recipe: RecipeDto, products: ProductsById, query: string) =>
  matchesSearch(recipe.name, query) ||
  recipe.items.some((item) => {
    const name = products.get(item.productId)?.name;
    return name != null && matchesSearch(name, query);
  });

export function filterRecipes(
  recipes: readonly RecipeDto[],
  products: ProductsById,
  { filter, query }: { filter: RecipeFilter; query: string },
): RecipeDto[] {
  return recipes.filter((r) => matchesListFilter(r, filter) && matchesRecipeSearch(r, products, query));
}

const recipeFlag = (id: string, flag: 'favorite' | 'hidden', value: boolean) =>
  flag === 'favorite' ? api.setRecipeFavorite(id, value) : api.setRecipeHidden(id, value);

/** ♥ and hiding of recipes, optimistic like products. */
export const useRecipeFlags = () => useListFlags(queryKeys.recipes, recipeFlag);
