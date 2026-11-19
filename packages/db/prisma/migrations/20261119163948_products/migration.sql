-- CreateEnum
CREATE TYPE "product_category" AS ENUM ('meat', 'fish', 'dairy', 'eggs', 'vegetables', 'fruits', 'grains', 'bakery', 'legumes', 'nuts', 'oils', 'sweets', 'drinks', 'other');

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "household_id" TEXT,
    "name" TEXT NOT NULL,
    "category" "product_category" NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "units" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_product" (
    "household_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "override" JSONB,
    "hidden_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_product_pkey" PRIMARY KEY ("household_id","product_id")
);

-- CreateTable
CREATE TABLE "product_favorite" (
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_favorite_pkey" PRIMARY KEY ("user_id","product_id")
);

-- CreateIndex
CREATE INDEX "product_household_id_idx" ON "product"("household_id");

-- CreateIndex
CREATE INDEX "household_product_product_id_idx" ON "household_product"("product_id");

-- CreateIndex
CREATE INDEX "product_favorite_product_id_idx" ON "product_favorite"("product_id");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_product" ADD CONSTRAINT "household_product_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_product" ADD CONSTRAINT "household_product_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_favorite" ADD CONSTRAINT "product_favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_favorite" ADD CONSTRAINT "product_favorite_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
