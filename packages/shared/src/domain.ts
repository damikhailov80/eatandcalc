/**
 * Domain model. See CLAUDE.md → "Data model".
 * Shared by apps/mobile and apps/api. Plain TS shapes, ids are strings; DB rows live in packages/db.
 *
 * Key rule: Recipe, CookingSession and Consumption are separate entities.
 * - Recipe is a template and never changes when used.
 * - CookingSession is one real pot on one date; it snapshots its ingredients.
 * - Consumption is grams of one CookingSession eaten by one FamilyMember.
 */

export type Id = string;
/** Calendar date, `YYYY-MM-DD`, in the household's local time. */
export type ISODate = string;

export type Nutrients = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type Household = {
  id: Id;
  name: string;
};

/** Account role in a household: the owner manages access (invites, removing accounts); everyone edits data. */
export type HouseholdRole = 'owner' | 'member';

// ---------- Products ----------

export const PRODUCT_CATEGORIES = [
  'meat',
  'fish',
  'dairy',
  'eggs',
  'vegetables',
  'fruits',
  'grains',
  'bakery',
  'legumes',
  'nuts',
  'oils',
  'sweets',
  'drinks',
  'other',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Measures besides grams; each product says how many grams one of them weighs. */
export const UNIT_KEYS = ['ml', 'tsp', 'tbsp', 'pieceS', 'pieceM', 'pieceL'] as const;
export type ExtraUnit = (typeof UNIT_KEYS)[number];
/** `'g'` is always available and weighs 1 g. */
export type UnitKey = 'g' | ExtraUnit;

/** Grams per one unit (`ml` = grams per 1 ml); a missing key = the product isn't measured that way. */
export type ProductUnits = Partial<Record<ExtraUnit, number>>;

export type Product = {
  id: Id;
  name: string;
  category: ProductCategory;
  /** Nutrition per 100 g. */
  nutrients: Nutrients;
  units: ProductUnits;
};

/** An amount of a product in one of its units. */
export type Quantity = {
  amount: number;
  unit: UnitKey;
};

// ---------- Recipes (templates) ----------

export type RecipeItem = Quantity & {
  productId: Id;
};

/** A template: ingredients only. Its weight is the sum of raw ingredient grams; cooking never changes it. */
export type Recipe = {
  id: Id;
  name: string;
  items: RecipeItem[];
};

// ---------- Cooking sessions (concrete pots) ----------

/**
 * One ingredient of a real pot. The product's name, nutrients and unit weights are frozen when the row is
 * added: later product edits or deletes never change it (remove the row and add the product again to refresh).
 */
export type CookingItem = Quantity & {
  /** The product it was taken from; may no longer exist. */
  productId: Id | null;
  name: string;
  /** Per 100 g, as the product was when added. */
  nutrients: Nutrients;
  units: ProductUnits;
};

export type CookingSession = {
  id: Id;
  date: ISODate;
  name: string;
  /** Recipe it was started from, if any (null once the recipe is deleted). */
  recipeId: Id | null;
  /** Recipe multiplier ×1..×4 the amounts were taken with. */
  recipeScale: number | null;
  /** Session it was copied from ("Приготовить снова"), if any. */
  copiedFromId: Id | null;
  items: CookingItem[];
  /** Empty pot, grams. */
  potWeightG: number | null;
  /** Pot with the finished dish, grams. Cooked weight = gross − pot. */
  grossWeightG: number | null;
};

// ---------- Family ----------

export type Sex = 'male' | 'female';

export type FamilyMember = {
  id: Id;
  householdId: Id;
  name: string;
  sex: Sex;
  /** Avatar color, one of theme `memberColors`. */
  color: string;
  /** Daily norms. */
  norms: Nutrients;
  archived?: boolean;
};

// ---------- Daily planner ----------

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Grams of a dish eaten by one member. */
export type Consumption = {
  memberId: Id;
  grams: number;
};

/** One cooking session served in a meal, shared between members. */
export type MealDish = {
  id: Id;
  cookingSessionId: Id;
  consumptions: Consumption[];
};

export type Meal = {
  id: Id;
  householdId: Id;
  date: ISODate;
  type: MealType;
  /** Display title; defaults from type ("Завтрак"), snacks may be numbered. */
  title: string;
  order: number;
  dishes: MealDish[];
};
