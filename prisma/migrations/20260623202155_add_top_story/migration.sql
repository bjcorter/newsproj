-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "isTopStory" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Article_isTopStory_idx" ON "Article"("isTopStory");
