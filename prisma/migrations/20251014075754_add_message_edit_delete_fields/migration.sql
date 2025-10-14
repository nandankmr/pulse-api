-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "editedAt" TIMESTAMP(3);
