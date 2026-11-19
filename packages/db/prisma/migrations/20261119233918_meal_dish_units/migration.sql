-- AlterTable
ALTER TABLE "consumption" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "meal_dish" ADD COLUMN     "recipe_id" TEXT,
ADD COLUMN     "units" JSONB NOT NULL DEFAULT '{}';

-- AddForeignKey
ALTER TABLE "meal_dish" ADD CONSTRAINT "meal_dish_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
