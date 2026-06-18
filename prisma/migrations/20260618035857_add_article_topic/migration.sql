-- CreateEnum
CREATE TYPE "Topic" AS ENUM ('POLITICS', 'ECONOMY', 'TECH', 'INTERNET', 'SPORTS', 'WORLD', 'HEALTH', 'SCIENCE', 'CLIMATE', 'CULTURE', 'CRIME', 'EDUCATION', 'DEFENSE', 'MISCELLANEOUS');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "topic" "Topic" NOT NULL DEFAULT 'MISCELLANEOUS';

-- CreateIndex
CREATE INDEX "Article_topic_idx" ON "Article"("topic");
