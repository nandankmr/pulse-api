import { Group, GroupMember, GroupRole } from '../../generated/prisma';
import { prisma } from '../../shared/services/prisma.service';
import { logger } from '../../shared/utils/logger';

export type GroupInvitationRecord = {
  id: string;
  groupId: string;
  inviterId: string;
  token: string;
  inviteeEmail: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
};

export class GroupRepository {
  async createGroup(data: { name: string; description?: string | null | undefined; avatarUrl?: string | null | undefined; ownerId: string }): Promise<Group & { members: GroupMember[] }> {
    try {
      logger.info('Creating group', { name: data.name, ownerId: data.ownerId });
      const group = await prisma.group.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          avatarUrl: data.avatarUrl ?? null,
          createdBy: data.ownerId,
          members: {
            create: {
              userId: data.ownerId,
              role: GroupRole.ADMIN,
            },
          },
        },
        include: {
          members: true,
        },
      });
      logger.info('Group created', { groupId: group.id, ownerId: data.ownerId });
      return group;
    } catch (error) {
      logger.error('Failed to create group', {
        name: data.name,
        ownerId: data.ownerId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async findById(id: string): Promise<(Group & { members: GroupMember[] }) | null> {
    try {
      return await prisma.group.findUnique({
        where: { id },
        include: {
          members: true,
        },
      });
    } catch (error) {
      logger.error('Failed to find group by id', { id, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async updateGroup(id: string, data: { name?: string; description?: string | null; avatarUrl?: string | null }): Promise<Group> {
    try {
      logger.info('Updating group', { id, fields: Object.keys(data) });
      return await prisma.group.update({
        where: { id },
        data,
      });
    } catch (error) {
      logger.error('Failed to update group', { id, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteGroup(id: string): Promise<Group> {
    try {
      logger.info('Deleting group', { id });
      await prisma.groupMember.deleteMany({ where: { groupId: id } });
      return await prisma.group.delete({ where: { id } });
    } catch (error) {
      logger.error('Failed to delete group', { id, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async addMember(groupId: string, userId: string, role: GroupRole = GroupRole.MEMBER): Promise<GroupMember> {
    try {
      logger.info('Adding member to group', { groupId, userId, role });
      return await prisma.groupMember.create({
        data: {
          groupId,
          userId,
          role,
        },
      });
    } catch (error) {
      logger.error('Failed to add member to group', {
        groupId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findMember(groupId: string, userId: string): Promise<GroupMember | null> {
    try {
      return await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to find group member', { groupId, userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async updateMemberRole(groupId: string, userId: string, role: GroupRole): Promise<GroupMember> {
    try {
      logger.info('Updating member role', { groupId, userId, role });
      return await prisma.groupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
        data: { role },
      });
    } catch (error) {
      logger.error('Failed to update member role', { groupId, userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async removeMember(groupId: string, userId: string): Promise<GroupMember> {
    try {
      logger.info('Removing member from group', { groupId, userId });
      return await prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to remove member from group', { groupId, userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listMemberUserIds(groupId: string): Promise<string[]> {
    try {
      const members = await prisma.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
      });
      return members.map((member) => member.userId);
    } catch (error) {
      logger.error('Failed to list group member userIds', { groupId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listGroupsForUser(userId: string): Promise<(Group & { members: GroupMember[] })[]> {
    try {
      const groups = await prisma.group.findMany({
        where: {
          members: {
            some: { userId },
          },
        },
        include: {
          members: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return groups;
    } catch (error) {
      logger.error('Failed to list groups for user', { userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async countAdmins(groupId: string): Promise<number> {
    try {
      return await prisma.groupMember.count({
        where: {
          groupId,
          role: GroupRole.ADMIN,
        },
      });
    } catch (error) {
      logger.error('Failed to count admins for group', { groupId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async createInvitation(data: { groupId: string; inviterId: string; token: string; inviteeEmail?: string | null; expiresAt: Date }): Promise<GroupInvitationRecord> {
    try {
      logger.info('Creating group invitation', { groupId: data.groupId, inviterId: data.inviterId });
      const delegate = (prisma as any).groupInvitation;
      if (!delegate?.create) {
        throw new Error('GroupInvitation delegate not available on Prisma client');
      }
      return (await delegate.create({
        data: {
          groupId: data.groupId,
          inviterId: data.inviterId,
          token: data.token,
          inviteeEmail: data.inviteeEmail ?? null,
          expiresAt: data.expiresAt,
        },
      })) as GroupInvitationRecord;
    } catch (error) {
      logger.error('Failed to create group invitation', {
        groupId: data.groupId,
        inviterId: data.inviterId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findInvitationByToken(token: string): Promise<GroupInvitationRecord | null> {
    try {
      const delegate = (prisma as any).groupInvitation;
      if (!delegate?.findUnique) {
        throw new Error('GroupInvitation delegate not available on Prisma client');
      }
      const result = await delegate.findUnique({
        where: { token },
      });
      return (result ?? null) as GroupInvitationRecord | null;
    } catch (error) {
      logger.error('Failed to find group invitation by token', { token, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async markInvitationAccepted(id: string): Promise<GroupInvitationRecord> {
    try {
      const delegate = (prisma as any).groupInvitation;
      if (!delegate?.update) {
        throw new Error('GroupInvitation delegate not available on Prisma client');
      }
      return (await delegate.update({
        where: { id },
        data: {
          acceptedAt: new Date(),
        },
      })) as GroupInvitationRecord;
    } catch (error) {
      logger.error('Failed to mark invitation accepted', { id, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteInvitation(id: string): Promise<GroupInvitationRecord> {
    try {
      const delegate = (prisma as any).groupInvitation;
      if (!delegate?.delete) {
        throw new Error('GroupInvitation delegate not available on Prisma client');
      }
      return (await delegate.delete({ where: { id } })) as GroupInvitationRecord;
    } catch (error) {
      logger.error('Failed to delete group invitation', { id, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
