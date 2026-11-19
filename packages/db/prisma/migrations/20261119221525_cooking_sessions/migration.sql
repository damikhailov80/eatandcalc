-- CreateTable
CREATE TABLE "cooking_session" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "recipe_id" TEXT,
    "recipe_scale" INTEGER,
    "copied_from_id" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "pot_weight_g" DOUBLE PRECISION,
    "gross_weight_g" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cooking_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cooking_session_household_id_date_idx" ON "cooking_session"("household_id", "date");

-- CreateIndex
CREATE INDEX "cooking_session_recipe_id_idx" ON "cooking_session"("recipe_id");

-- AddForeignKey
ALTER TABLE "cooking_session" ADD CONSTRAINT "cooking_session_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session" ADD CONSTRAINT "cooking_session_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_session" ADD CONSTRAINT "cooking_session_copied_from_id_fkey" FOREIGN KEY ("copied_from_id") REFERENCES "cooking_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
