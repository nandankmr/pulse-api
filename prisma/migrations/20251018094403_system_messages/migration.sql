-- CreateEnum
CREATE TYPE "SystemMessageType" AS ENUM ('GROUP_CREATED', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'MEMBER_LEFT', 'MEMBER_PROMOTED', 'MEMBER_DEMOTED', 'GROUP_RENAMED', 'GROUP_DESCRIPTION_UPDATED', 'GROUP_AVATAR_UPDATED');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "systemType" "SystemMessageType",
ADD COLUMN     "targetUserId" TEXT;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
