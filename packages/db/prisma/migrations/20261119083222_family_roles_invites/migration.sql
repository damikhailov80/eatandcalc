-- CreateEnum
CREATE TYPE "household_role" AS ENUM ('owner', 'member');

-- CreateEnum
CREATE TYPE "sex" AS ENUM ('male', 'female');

-- AlterTable
ALTER TABLE "household_user" ADD COLUMN     "role" "household_role" NOT NULL DEFAULT 'member';

-- Backfill: the earliest account of each household becomes its owner.
UPDATE "household_user" hu SET "role" = 'owner'
WHERE hu."user_id" = (
  SELECT first."user_id" FROM "household_user" first
  WHERE first."household_id" = hu."household_id"
  ORDER BY first."created_at" ASC, first."user_id" ASC
  LIMIT 1
);

-- CreateTable
CREATE TABLE "household_invite" (
    "code" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_invite_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "family_member" (
    "id" TEXT NOT NULL,
    "household_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sex" "sex" NOT NULL,
    "color" TEXT NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "family_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "household_invite_household_id_idx" ON "household_invite"("household_id");

-- CreateIndex
CREATE INDEX "family_member_household_id_idx" ON "family_member"("household_id");

-- AddForeignKey
ALTER TABLE "household_invite" ADD CONSTRAINT "household_invite_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_member" ADD CONSTRAINT "family_member_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
