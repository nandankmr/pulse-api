import { randomBytes } from 'crypto';
import { Group, GroupMember, GroupRole } from '../../generated/prisma';
import { GroupRepository, GroupInvitationRecord } from './group.repository';
import { SystemMessageService } from '../message/system-message.service';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../../shared/errors/app.errors';
import { logger } from '../../shared/utils/logger';

export type GroupWithMembers = Group & { members: GroupMember[] };

function sanitizeGroup(group: GroupWithMembers) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    avatarUrl: group.avatarUrl,
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    members: group.members.map((member) => ({
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
    })),
  };
}

function sanitizeInvitation(invitation: GroupInvitationRecord) {
  return {
    id: invitation.id,
    groupId: invitation.groupId,
    inviterId: invitation.inviterId,
    token: invitation.token,
    inviteeEmail: invitation.inviteeEmail,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    createdAt: invitation.createdAt,
  };
}

const DEFAULT_INVITATION_EXPIRATION_HOURS = 72;
const MAX_INVITATION_TOKEN_ATTEMPTS = 5;

export class GroupService {
  private repository = new GroupRepository();
  private systemMessageService = new SystemMessageService();

  async createGroup(ownerId: string, data: { name: string; description?: string; avatarUrl?: string }): Promise<ReturnType<typeof sanitizeGroup>> {
    const group = await this.repository.createGroup({
      name: data.name,
      description: data.description ?? null,
      avatarUrl: data.avatarUrl ?? null,
      ownerId,
    });
    logger.info('Group created via service', { groupId: group.id, ownerId });

    await this.systemMessageService.publishGroupCreated(group.id, ownerId);

    return sanitizeGroup(group);
  }

  async listUserGroups(userId: string) {
    const groups = await this.repository.listGroupsForUser(userId);
    return groups.map(sanitizeGroup);
  }

  async getGroupById(groupId: string, requesterId: string) {
    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Group');
    }

    this.ensureMember(group, requesterId);
    return sanitizeGroup(group);
  }

  async updateGroup(groupId: string, requesterId: string, payload: { name?: string; description?: string | null; avatarUrl?: string | null }) {
    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Group');
    }

    this.ensureAdmin(group, requesterId);

    if (payload.name === undefined && payload.description === undefined && payload.avatarUrl === undefined) {
      throw new ValidationError('At least one field must be provided to update the group');
    }

    const previousName = group.name;
    const previousDescription = group.description ?? null;
    const previousAvatarUrl = group.avatarUrl ?? null;

    const normalized = {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
    };

    const updated = await this.repository.updateGroup(groupId, normalized);
    const refreshed = await this.repository.findById(updated.id);
    if (!refreshed) {
      throw new NotFoundError('Group');
    }
    logger.info('Group updated via service', { groupId, requesterId });

    if (payload.name !== undefined && payload.name !== previousName) {
      await this.systemMessageService.publishGroupRenamed(groupId, requesterId, {
        previousName,
        newName: payload.name,
      });
    }

    if (payload.description !== undefined && payload.description !== previousDescription) {
      await this.systemMessageService.publishGroupDescriptionUpdated(groupId, requesterId, {
        previousDescription,
        newDescription: payload.description ?? null,
      });
    }

    if (payload.avatarUrl !== undefined && payload.avatarUrl !== previousAvatarUrl) {
      await this.systemMessageService.publishGroupAvatarUpdated(groupId, requesterId, {
        previousAvatarUrl,
        newAvatarUrl: payload.avatarUrl ?? null,
      });
    }

    return sanitizeGroup(refreshed);
  }

  async deleteGroup(groupId: string, requesterId: string) {
    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Group');
    }

    this.ensureAdmin(group, requesterId);

    await this.repository.deleteGroup(groupId);
    logger.info('Group deleted via service', { groupId, requesterId });
    return { id: groupId };
  }

  async addMember(groupId: string, requesterId: string, userId: string, role: GroupRole = GroupRole.MEMBER) {
    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Group');
    }

    this.ensureAdmin(group, requesterId);

    const existing = await this.repository.findMember(groupId, userId);
    if (existing) {
      throw new ValidationError('User is already a member of this group');
    }

    await this.repository.addMember(groupId, userId, role);
    const updatedGroup = await this.repository.findById(groupId);
    if (!updatedGroup) {
      throw new NotFoundError('Group');
    }
    logger.info('Member added to group via service', { groupId, addedUserId: userId, requesterId });

    await this.systemMessageService.publishMemberAdded(groupId, requesterId, userId, {
      role,
    });

    return sanitizeGroup(updatedGroup);
  }

  async updateMemberRole(groupId: string, requesterId: string, userId: string, role: GroupRole) {
    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Group');
    }

    this.ensureAdmin(group, requesterId);

    const member = group.members.find((m) => m.userId === userId);
    if (!member) {
      throw new ValidationError('Member not found in group');
    }

    const previousRole = member.role;

    if (member.role === GroupRole.ADMIN && role !== GroupRole.ADMIN) {
      const adminCount = await this.repository.countAdmins(groupId);
      if (adminCount <= 1) {
        throw new ValidationError('At least one admin must remain in the group');
      }
    }

    await this.repository.updateMemberRole(groupId, userId, role);
    const updatedGroup = await this.repository.findById(groupId);
    if (!updatedGroup) {
      throw new NotFoundError('Group');
    }
    logger.info('Member role updated via service', { groupId, userId, role, requesterId });

    await this.systemMessageService.publishMemberRoleChanged(groupId, requesterId, userId, {
      previousRole,
      newRole: role,
    });

    return sanitizeGroup(updatedGroup);
  }

  async removeMember(groupId: string, requesterId: string, userId: string) {
    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Group');
    }

    const member = group.members.find((m) => m.userId === userId);
    if (!member) {
      throw new ValidationError('Member not found in group');
    }

    const isSelfRemoval = requesterId === userId;
    if (!isSelfRemoval) {
      this.ensureAdmin(group, requesterId);
    } else if (member.role === GroupRole.ADMIN) {
      const adminCount = await this.repository.countAdmins(groupId);
      if (adminCount <= 1) {
        throw new ValidationError('Cannot leave group as the last admin');
      }
    }

    if (member.role === GroupRole.ADMIN && !isSelfRemoval) {
      const adminCount = await this.repository.countAdmins(groupId);
      if (adminCount <= 1) {
        throw new ValidationError('At least one admin must remain in the group');
      }
    }

    await this.repository.removeMember(groupId, userId);
    const updatedGroup = await this.repository.findById(groupId);
    if (!updatedGroup) {
      throw new NotFoundError('Group');
    }
    logger.info('Member removed from group via service', { groupId, removedUserId: userId, requesterId });

    if (requesterId === userId) {
      await this.systemMessageService.publishMemberLeft(groupId, requesterId);
    } else {
      await this.systemMessageService.publishMemberRemoved(groupId, requesterId, userId);
    }

    return sanitizeGroup(updatedGroup);
  }

  async createInvitation(
    groupId: string,
    requesterId: string,
    payload: { email?: string | undefined; expiresInHours?: number | undefined }
  ): Promise<ReturnType<typeof sanitizeInvitation>> {
    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Group');
    }

    this.ensureAdmin(group, requesterId);

    const expiresInHours = payload.expiresInHours ?? DEFAULT_INVITATION_EXPIRATION_HOURS;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const token = await this.generateUniqueInvitationToken();

    const invitation = await this.repository.createInvitation({
      groupId,
      inviterId: requesterId,
      token,
      inviteeEmail: payload.email ?? null,
      expiresAt,
    });

    logger.info('Group invitation created via service', { groupId, requesterId, invitationId: invitation.id });
    return sanitizeInvitation(invitation);
  }

  async joinGroupWithToken(
    groupId: string,
    requester: { id: string; email?: string | undefined },
    token: string,
  ): Promise<ReturnType<typeof sanitizeGroup>> {
    const invitation = await this.repository.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    if (invitation.groupId !== groupId) {
      throw new ValidationError('Invitation token does not match this group');
    }

    if (invitation.acceptedAt) {
      throw new ValidationError('Invitation has already been used');
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.repository.deleteInvitation(invitation.id);
      throw new ValidationError('Invitation has expired');
    }

    if (invitation.inviteeEmail) {
      const requesterEmail = requester.email?.toLowerCase();
      if (!requesterEmail || requesterEmail !== invitation.inviteeEmail.toLowerCase()) {
        throw new UnauthorizedError('This invitation is not valid for your account');
      }
    }

    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Group');
    }

    const isAlreadyMember = group.members.some((member) => member.userId === requester.id);
    if (isAlreadyMember) {
      throw new ConflictError('You are already a member of this group');
    }

    await this.repository.addMember(groupId, requester.id, GroupRole.MEMBER);
    await this.repository.markInvitationAccepted(invitation.id);

    const updatedGroup = await this.repository.findById(groupId);
    if (!updatedGroup) {
      throw new NotFoundError('Group');
    }

    logger.info('Group joined via invitation token', { groupId, userId: requester.id });

    await this.systemMessageService.publishMemberAdded(groupId, requester.id, requester.id, {
      role: GroupRole.MEMBER,
      invitedBy: invitation.inviterId,
    });

    return sanitizeGroup(updatedGroup);
  }

  private ensureMember(group: GroupWithMembers, userId: string) {
    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new UnauthorizedError('You are not a member of this group');
    }
  }

  private ensureAdmin(group: GroupWithMembers, userId: string) {
    const isAdmin = group.members.some((m) => m.userId === userId && m.role === GroupRole.ADMIN);
    if (!isAdmin) {
      throw new UnauthorizedError('Only group admins can perform this action');
    }
  }

  private async generateUniqueInvitationToken(): Promise<string> {
    for (let attempt = 0; attempt < MAX_INVITATION_TOKEN_ATTEMPTS; attempt += 1) {
      const token = randomBytes(16).toString('hex');
      const existing = await this.repository.findInvitationByToken(token);
      if (!existing) {
        return token;
      }
    }
    throw new ValidationError('Failed to generate a unique invitation token, please try again');
  }
}
