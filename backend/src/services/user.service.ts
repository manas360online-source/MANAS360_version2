import { prisma } from '../config/db';
import { AppError } from '../middleware/error.middleware';
import type { ChangePasswordPayload, ProfileUpdatePayload } from '../utils/constants';
import { deleteFileFromS3, getSignedProfilePhotoUrl, uploadProfilePhotoToS3 } from './s3.service';
import { hashPassword, verifyPassword } from '../utils/hash';

const db = prisma as any;

const uuidRegex =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const assertUserIsActive = async (userId: string): Promise<void> => {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { id: true, isDeleted: true },
	});

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (user.isDeleted) {
		throw new AppError('User account is deleted', 410);
	}
};

export const getMyProfile = async (userId: string) => {
	await assertUserIsActive(userId);

	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			phone: true,
			showNameToProviders: true,
			role: true,
			provider: true,
			emailVerified: true,
			phoneVerified: true,
			firstName: true,
			lastName: true,
			profileImageKey: true,
			profileImageUrl: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	if (!user) {
		throw new AppError('User not found', 404);
	}

	return {
		...user,
		role: String(user.role).toLowerCase(),
		provider: String(user.provider).toLowerCase(),
	};
};

export const updateMyProfile = async (userId: string, payload: ProfileUpdatePayload) => {
	await assertUserIsActive(userId);

	const updatePayload: ProfileUpdatePayload = {};

	if (payload.name !== undefined) {
		updatePayload.name = payload.name;
	}

	if (payload.phone !== undefined) {
		const existingPhoneOwner = await db.user.findFirst({
			where: {
				phone: payload.phone,
				isDeleted: false,
				id: { not: userId },
			},
			select: { id: true },
		});

		if (existingPhoneOwner) {
			throw new AppError('Phone is already in use', 409);
		}

		updatePayload.phone = payload.phone;
	}

	if (payload.showNameToProviders !== undefined) {
		updatePayload.showNameToProviders = payload.showNameToProviders;
	}

	if (Object.keys(updatePayload).length === 0) {
		throw new AppError('No allowed fields provided for update', 400);
	}

	const nameParts = (updatePayload.name ?? '').trim().split(/\s+/).filter(Boolean);
	const nextFirstName = updatePayload.name !== undefined ? nameParts.slice(0, 1).join(' ') : undefined;
	const nextLastName = updatePayload.name !== undefined ? nameParts.slice(1).join(' ') : undefined;

	const updatedUser = await db.user.updateMany({
		where: { id: userId, isDeleted: false },
		data: {
			...(updatePayload.name !== undefined
				? {
					name: updatePayload.name,
					firstName: nextFirstName ?? '',
					lastName: nextLastName ?? '',
				}
				: {}),
			...(updatePayload.phone !== undefined ? { phone: updatePayload.phone } : {}),
			...(updatePayload.showNameToProviders !== undefined
				? { showNameToProviders: updatePayload.showNameToProviders }
				: {}),
		},
	});

	if (updatedUser.count === 0) {
		throw new AppError('User not found', 404);
	}

	return getMyProfile(userId);
};

export const softDeleteMyAccount = async (userId: string): Promise<void> => {
	const updated = await db.user.updateMany({
		where: { id: userId, isDeleted: false },
		data: {
			isDeleted: true,
			deletedAt: new Date(),
		},
	});

	await db.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });

	if (updated.count === 0) {
		throw new AppError('User not found', 404);
	}
};

export const uploadMyProfilePhoto = async (
	userId: string,
	file: { buffer: Buffer; mimetype: string },
) => {
	await assertUserIsActive(userId);

	const existingUser = await db.user.findFirst({
		where: { id: userId, isDeleted: false },
		select: { id: true, profileImageKey: true },
	});

	if (!existingUser) {
		throw new AppError('User not found', 404);
	}

	const uploaded = await uploadProfilePhotoToS3({
		userId,
		buffer: file.buffer,
		mimeType: file.mimetype,
	});

	if (existingUser.profileImageKey) {
		await deleteFileFromS3(existingUser.profileImageKey);
	}

	const updated = await db.user.updateMany({
		where: { id: userId, isDeleted: false },
		data: {
			profileImageKey: uploaded.objectKey,
			profileImageUrl: uploaded.objectUrl,
		},
	});

	if (updated.count === 0) {
		throw new AppError('User not found', 404);
	}

	const signedProfileImageUrl = await getSignedProfilePhotoUrl(uploaded.objectKey);

	return {
		...(await getMyProfile(userId)),
		signedProfileImageUrl,
	};
};

export const changeMyPassword = async (userId: string, payload: ChangePasswordPayload): Promise<void> => {
	await assertUserIsActive(userId);

	const user = await db.user.findFirst({
		where: { id: userId, isDeleted: false },
		select: { id: true, passwordHash: true },
	});

	if (!user) {
		throw new AppError('User not found', 404);
	}

	if (!user.passwordHash) {
		throw new AppError('Password login is not enabled for this account', 400);
	}

	const currentPasswordMatches = await verifyPassword(payload.currentPassword, user.passwordHash);
	if (!currentPasswordMatches) {
		throw new AppError('currentPassword is incorrect', 401);
	}

	const newMatchesCurrent = await verifyPassword(payload.newPassword, user.passwordHash);
	if (newMatchesCurrent) {
		throw new AppError('newPassword must be different from currentPassword', 400);
	}

	const newPasswordHash = await hashPassword(payload.newPassword);

	await db.user.updateMany({
		where: { id: userId, isDeleted: false },
		data: {
			passwordHash: newPasswordHash,
			passwordChangedAt: new Date(),
		},
	});

	await db.authSession.updateMany({
		where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
		data: { revokedAt: new Date() },
	});
};

export const listMyActiveSessions = async (userId: string, currentSessionId?: string) => {
	await assertUserIsActive(userId);

	const sessions = await db.authSession.findMany({
		where: {
			userId,
			revokedAt: null,
			expiresAt: { gt: new Date() },
		},
		orderBy: { createdAt: 'desc' },
	});

	return sessions.map((session) => ({
		id: String(session.id),
		device: session.device,
		ipAddress: session.ipAddress,
		createdAt: session.createdAt,
		lastActiveAt: session.lastActiveAt,
		isCurrent: currentSessionId ? String(session.id) === currentSessionId : false,
	}));
};

export const invalidateMySession = async (userId: string, sessionId: string): Promise<void> => {
	await assertUserIsActive(userId);

	if (!uuidRegex.test(sessionId)) {
		throw new AppError('Invalid session id', 400);
	}

	const session = await db.authSession.findFirst({
		where: {
			id: sessionId,
			userId,
			revokedAt: null,
			expiresAt: { gt: new Date() },
		},
	});

	if (!session) {
		throw new AppError('Session not found', 404);
	}

	await db.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
};

export const invalidateAllMySessions = async (userId: string): Promise<{ revokedCount: number }> => {
	await assertUserIsActive(userId);

	const result = await db.authSession.updateMany({
		where: {
			userId,
			revokedAt: null,
			expiresAt: { gt: new Date() },
		},
		data: { revokedAt: new Date() },
	});

	return { revokedCount: Number(result.count || 0) };
};

export const restoreDeletedUserAccount = async (userId: string) => {
	const restored = await db.user.updateMany({
		where: { id: userId, isDeleted: true },
		data: {
			isDeleted: false,
			deletedAt: null,
		},
	});

	if (restored.count === 0) {
		throw new AppError('Deleted user not found', 404);
	}

	return getMyProfile(userId);
};

