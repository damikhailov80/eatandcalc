-- CreateTable
CREATE TABLE "member_weight" (
    "member_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kg" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_weight_pkey" PRIMARY KEY ("member_id","date")
);

-- AddForeignKey
ALTER TABLE "member_weight" ADD CONSTRAINT "member_weight_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "family_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
