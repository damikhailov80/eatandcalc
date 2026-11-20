-- CreateTable
CREATE TABLE "member_norm" (
    "member_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_norm_pkey" PRIMARY KEY ("member_id","date")
);

-- AddForeignKey
ALTER TABLE "member_norm" ADD CONSTRAINT "member_norm_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every member's current norm becomes its first record, dated the day it was created.
INSERT INTO "member_norm" ("member_id", "date", "kcal", "protein", "fat", "carbs", "updated_at")
SELECT "id", "created_at"::date, "kcal", "protein", "fat", "carbs", CURRENT_TIMESTAMP FROM "family_member";
