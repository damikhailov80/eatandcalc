-- CreateTable
CREATE TABLE "recipe" (
    "id" TEXT NOT NULL,
    "household_id" TEXT,
    "name" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_recipe" (
    "household_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "override" JSONB,
    "hidden_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_recipe_pkey" PRIMARY KEY ("household_id","recipe_id")
);

-- CreateTable
CREATE TABLE "recipe_favorite" (
    "user_id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_favorite_pkey" PRIMARY KEY ("user_id","recipe_id")
);

-- CreateIndex
CREATE INDEX "recipe_household_id_idx" ON "recipe"("household_id");

-- CreateIndex
CREATE INDEX "household_recipe_recipe_id_idx" ON "household_recipe"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_favorite_recipe_id_idx" ON "recipe_favorite"("recipe_id");

-- AddForeignKey
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_recipe" ADD CONSTRAINT "household_recipe_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_recipe" ADD CONSTRAINT "household_recipe_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_favorite" ADD CONSTRAINT "recipe_favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_favorite" ADD CONSTRAINT "recipe_favorite_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
