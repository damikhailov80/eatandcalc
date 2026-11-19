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

export type ProductCategory =
  | 'meat'
  | 'fish'
  | 'vegetables'
  | 'fruits'
  | 'dairy'
  | 'grains'
  | 'oils'
  | 'other';

export type UnitKind = 'g100' | 'piece' | 'tsp' | 'tbsp' | 'custom';

/**
 * A measure a product can be counted in. `grams` is the weight of ONE such unit
 * (100 for "100 г", 13.5 for a tablespoon of oil); null when unknown (e.g. "1 шт" without a weight).
 */
export type ProductUnit = {
  id: Id;
  kind: UnitKind;
  /** Display name: "100 г", "1 шт", "ст. л.", "бутылка". */
  name: string;
  grams: number | null;
};

export type Product = {
  id: Id;
  householdId: Id;
  name: string;
  category: ProductCategory;
  /** The unit `nutrients` refer to (exactly one of it). */
  basisUnitId: Id;
  /** Nutrition for one `basisUnitId`. */
  nutrients: Nutrients;
  /** All units incl. the basis unit. */
  units: ProductUnit[];
  archived?: boolean;
};

/** An amount of a product in one of its units. Plain grams use unit id `'g'`. */
export type Quantity = {
  amount: number;
  unitId: Id | 'g';
};

// ---------- Recipes (templates) ----------

export type RecipeItem = Quantity & {
  productId: Id;
};

export type Recipe = {
  id: Id;
  householdId: Id;
  name: string;
  items: RecipeItem[];
  /** Weight of the finished dish; null = use the sum of raw ingredient weights. */
  totalWeightG: number | null;
  portions: number;
};

// ---------- Cooking sessions (concrete pots) ----------

/**
 * Snapshot of one ingredient at cooking time. Product name and resulting nutrients are copied,
 * so later product edits or deletes don't change history.
 */
export type CookingItem = Quantity & {
  productId: Id | null;
  productName: string;
  grams: number;
  nutrients: Nutrients;
};

export type CookingSession = {
  id: Id;
  householdId: Id;
  date: ISODate;
  name: string;
  /** Recipe it was started from, if any. */
  recipeId: Id | null;
  /** Session it was copied from ("Повторить" / "Копировать и изменить"), if any. */
  copiedFromId: Id | null;
  items: CookingItem[];
  /** Weighed finished dish, grams. Nutrients per gram = total ÷ cookedWeightG. */
  cookedWeightG: number;
  portions: number;
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
