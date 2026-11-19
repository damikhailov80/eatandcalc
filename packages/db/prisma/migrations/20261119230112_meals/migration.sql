-- CreateEnum
CREATE TYPE "meal_type" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateTable
CREATE TABLE "meal" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "meal_type" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_dish" (
    "id" TEXT NOT NULL,
    "meal_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "session_id" TEXT,
    "product_id" TEXT,
    "name" TEXT NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "source_date" DATE,
    "weight_g" DOUBLE PRECISION,
    "raw_weight" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumption" (
    "id" TEXT NOT NULL,
    "dish_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "consumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_household_id_date_idx" ON "meal"("household_id", "date");

-- CreateIndex
CREATE INDEX "meal_dish_meal_id_idx" ON "meal_dish"("meal_id");

-- CreateIndex
CREATE INDEX "meal_dish_session_id_idx" ON "meal_dish"("session_id");

-- CreateIndex
CREATE INDEX "consumption_member_id_idx" ON "consumption"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "consumption_dish_id_member_id_key" ON "consumption"("dish_id", "member_id");

-- AddForeignKey
ALTER TABLE "meal" ADD CONSTRAINT "meal_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_dish" ADD CONSTRAINT "meal_dish_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_dish" ADD CONSTRAINT "meal_dish_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cooking_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_dish" ADD CONSTRAINT "meal_dish_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption" ADD CONSTRAINT "consumption_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "meal_dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption" ADD CONSTRAINT "consumption_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
