-- CreateEnum
CREATE TYPE "restaurant" AS ENUM ('mcdonalds', 'kfc', 'burgerking', 'pizzahut', 'other');

-- AlterTable
ALTER TABLE "meal_dish" ADD COLUMN     "restaurant" "restaurant";

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "restaurant" "restaurant";
