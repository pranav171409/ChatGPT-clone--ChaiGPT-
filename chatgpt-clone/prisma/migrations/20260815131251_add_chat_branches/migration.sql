-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "branchId" TEXT;

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "parentMessageId" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Main',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branch_conversationId_idx" ON "Branch"("conversationId");

-- CreateIndex
CREATE INDEX "Branch_parentMessageId_idx" ON "Branch"("parentMessageId");

-- CreateIndex
CREATE INDEX "Message_branchId_createdAt_idx" ON "Message"("branchId", "createdAt" ASC);

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
