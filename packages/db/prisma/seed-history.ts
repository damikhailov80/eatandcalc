/**
 * Local-only test data: fills a family's meal history (the last 90 days up to yesterday) with dishes copied from
 * catalog products, each member eating about 75–125 % of their kcal norm on that day, so the history shows days in
 * norm, over and under. Each member also gets a dated norm history (the current norm ×0.85 from 90 days ago, ×0.93
 * from 45 days ago, ×1 from 14 days ago), replacing their records with --reset or when they have only one.
 * Days that already have meals are skipped; today is never touched.
 *
 *   npm run db:seed-history                      # the only household with family members
 *   npm run db:seed-history -- --household <id>  # a specific one
 *   npm run db:seed-history -- --reset           # first delete the family's meals before today, redo norms
 *
 * Refuses to run against a non-local database.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

import { PrismaClient, type MealType } from '../src/generated/prisma/client';

config({ path: ['.env.local', '.env'], quiet: true });

const url = process.env.DATABASE_URL ?? '';
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
  console.error('seed-history runs only against a local database (DATABASE_URL host must be localhost).');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const DAYS = 90;

/** Norm history per member: [days ago, share of the current norm]. */
const NORM_STEPS: [number, number][] = [
  [90, 0.85],
  [45, 0.93],
  [14, 1],
];

/** [catalog product id, grams for an adult, unit to show (or none = grams)]. */
type Item = [string, number, ('pieceM' | 'tbsp' | 'ml')?];

const MENU: Record<MealType, Item[][]> = {
  breakfast: [
    [
      ['cat-ovsyanye-khlopya', 60],
      ['cat-moloko-2', 200, 'ml'],
      ['cat-banan', 120, 'pieceM'],
    ],
    [
      ['cat-yaytso-kurinoe', 100],
      ['cat-khleb-rzhanoy', 60],
      ['cat-syr-gauda', 30],
    ],
    [
      ['cat-tvorog-zernenyy-4', 200],
      ['cat-med', 30, 'tbsp'],
    ],
    [
      ['cat-yogurt-grecheskiy-2', 200],
      ['cat-pechene-ovsyanoe', 45],
    ],
  ],
  lunch: [
    [
      ['cat-kurinaya-grudka-file', 180],
      ['cat-grechka-varenaya', 250],
      ['cat-ogurets', 120, 'pieceM'],
    ],
    [
      ['cat-losos-semga', 150],
      ['cat-ris-varenyy', 220],
      ['cat-pomidor', 120, 'pieceM'],
    ],
    [
      ['cat-sosiski', 100, 'pieceM'],
      ['cat-makarony', 90],
    ],
    [
      ['cat-mintay', 200],
      ['cat-kartofel', 300],
      ['cat-khleb-rzhanoy', 30],
    ],
  ],
  dinner: [
    [
      ['cat-kurinaya-grudka-file', 150],
      ['cat-kartofel', 250],
    ],
    [
      ['cat-tvorog-zernenyy-4', 180],
      ['cat-yabloko', 180, 'pieceM'],
    ],
    [
      ['cat-yaytso-kurinoe', 150],
      ['cat-pomidor', 120, 'pieceM'],
      ['cat-khleb-rzhanoy', 30],
    ],
    [
      ['cat-losos-semga', 120],
      ['cat-grechka-varenaya', 200],
    ],
  ],
  snack: [
    [['cat-yabloko', 180, 'pieceM']],
    [
      ['cat-kefir-1', 250, 'ml'],
      ['cat-pechene-ovsyanoe', 30],
    ],
    [
      ['cat-shokolad-molochnyy', 25],
      ['cat-kofe-chernyy-bez-sakhara', 200, 'ml'],
    ],
    [
      ['cat-banan', 120, 'pieceM'],
      ['cat-apelsin', 200, 'pieceM'],
    ],
  ],
};

/** Deterministic PRNG (mulberry32), so a re-run with --reset gives the same history. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng(20261120);
const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
const between = (a: number, b: number) => a + random() * (b - a);

const iso = (d: Date) => d.toISOString().slice(0, 10);
const dbDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const hIndex = args.indexOf('--household');
  let householdId = hIndex >= 0 ? args[hIndex + 1] : undefined;
  if (!householdId) {
    const withMembers = await prisma.household.findMany({
      where: { members: { some: { archivedAt: null } } },
      select: { id: true },
    });
    if (withMembers.length !== 1) {
      console.error(`Found ${withMembers.length} households with family members; pass --household <id>.`);
      process.exit(1);
    }
    householdId = withMembers[0]!.id;
  }

  const members = await prisma.familyMember.findMany({
    where: { householdId, archivedAt: null },
    orderBy: { createdAt: 'asc' },
    include: { norms: { orderBy: { date: 'asc' } } },
  });
  if (!members.length) throw new Error(`Household ${householdId} has no family members.`);

  const ids = [...new Set(Object.values(MENU).flatMap((sets) => sets.flatMap((s) => s.map(([id]) => id))))];
  const products = new Map((await prisma.product.findMany({ where: { id: { in: ids } } })).map((p) => [p.id, p]));
  for (const id of ids) if (!products.has(id)) throw new Error(`Catalog product ${id} not found: run npm run db:seed.`);

  const today = localToday();
  if (reset) {
    const { count } = await prisma.meal.deleteMany({ where: { householdId, date: { lt: dbDate(today) } } });
    console.log(`Deleted ${count} meals before ${today}.`);
  }
  const daysAgo = (n: number) => iso(new Date(dbDate(today).getTime() - n * 86_400_000));

  // Dated norms: the latest record is the current norm; earlier periods had lower ones.
  for (const m of members) {
    if (!reset && m.norms.length > 1) continue;
    const base = m.norms.at(-1) ?? m;
    const records = NORM_STEPS.map(([ago, k]) => ({
      memberId: m.id,
      date: dbDate(daysAgo(ago)),
      kcal: Math.round((base.kcal * k) / 50) * 50,
      protein: Math.round(base.protein * k),
      fat: Math.round(base.fat * k),
      carbs: Math.round(base.carbs * k),
    }));
    await prisma.$transaction([
      prisma.memberNorm.deleteMany({ where: { memberId: m.id } }),
      prisma.memberNorm.createMany({ data: records }),
    ]);
    m.norms = await prisma.memberNorm.findMany({ where: { memberId: m.id }, orderBy: { date: 'asc' } });
  }
  console.log(`Norms: ${members.map((m) => `${m.name} ${m.norms.map((n) => `${iso(n.date)}=${n.kcal}`).join(', ')}`).join('; ')}`);
  /** The norm in effect on `day` (latest record on or before it; before the first, the first). */
  const kcalNormOn = (m: (typeof members)[number], day: string) =>
    (m.norms.filter((n) => iso(n.date) <= day).at(-1) ?? m.norms[0] ?? m).kcal;

  const taken = new Set(
    (await prisma.meal.findMany({ where: { householdId }, select: { date: true } })).map((m) => iso(m.date)),
  );

  let days = 0;
  let meals = 0;
  for (let i = DAYS; i >= 1; i--) {
    const day = daysAgo(i);
    if (taken.has(day) || random() < 0.06) continue; // some days nobody logged anything
    const types: MealType[] = ['breakfast', 'lunch', 'dinner', ...(random() < 0.7 ? (['snack'] as const) : [])];
    // who eats each dish (not everyone eats everything); grams are scaled so each member lands near their norm
    const plan = types.map((type) => ({
      type,
      items: pick(MENU[type]).map((item) => ({ item, eaters: members.filter(() => random() > 0.12) })),
    }));
    const factor = new Map(
      members.map((m) => {
        const kcal = plan.reduce(
          (s, meal) =>
            s +
            meal.items
              .filter((d) => d.eaters.includes(m))
              .reduce((t, { item: [id, g] }) => t + (products.get(id)!.kcal * g) / 100, 0),
          0,
        );
        return [m.id, kcal > 0 ? (kcalNormOn(m, day) * between(0.8, 1.2)) / kcal : 0];
      }),
    );

    for (const { type, items } of plan) {
      await prisma.meal.create({
        data: {
          householdId,
          date: dbDate(day),
          type,
          dishes: {
            create: items.map(({ item: [id, grams, unit], eaters }, position) => {
              const p = products.get(id)!;
              const perUnit = unit ? ((p.units as Record<string, number>)[unit] ?? null) : null;
              return {
                position,
                productId: p.id,
                name: p.name,
                kcal: p.kcal,
                protein: p.protein,
                fat: p.fat,
                carbs: p.carbs,
                units: p.units ?? {},
                consumptions: {
                  create: eaters.map((m) => {
                    let g = grams * factor.get(m.id)!;
                    let amount: number | null = null;
                    if (perUnit) {
                      amount = Math.max(0.5, Math.round((g / perUnit) * 2) / 2);
                      g = amount * perUnit;
                    } else g = Math.max(5, Math.round(g / 5) * 5);
                    return { memberId: m.id, grams: g, amount, unit: perUnit ? unit! : null };
                  }),
                },
              };
            }),
          },
        },
      });
      meals++;
    }
    days++;
  }
  console.log(`Household ${householdId}: added ${meals} meals on ${days} days (${members.length} members).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
