import type { Request, Response } from 'express';
import { AppError } from '../middleware/error.middleware';
import {
	changeMyPassword,
	getMyProfile,
	invalidateMySession,
	invalidateAllMySessions,
	listMyActiveSessions,
	softDeleteMyAccount,
	updateMyProfile,
	uploadMyProfilePhoto,
} from '../services/user.service';
import { sendSuccess } from '../utils/response';

const getAuthUserId = (req: Request): string => {
	const userId = req.auth?.userId;

	if (!userId) {
		throw new AppError('Authentication required', 401);
	}

	return userId;
};

export const getMeController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const profile = await getMyProfile(userId);

	sendSuccess(res, profile, 'Profile fetched');
};

export const patchMeController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const validatedPayload = req.validatedUserUpdate;

	if (!validatedPayload) {
		throw new AppError('Invalid update payload', 400);
	}

	const updatedProfile = await updateMyProfile(userId, validatedPayload);

	sendSuccess(res, updatedProfile, 'Profile updated');
};

export const deleteMeController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	await softDeleteMyAccount(userId);

	sendSuccess(res, null, 'Account deleted');
};

export const uploadMePhotoController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);

	if (!req.file) {
		throw new AppError('Profile photo file is required', 400);
	}

	const updatedProfile = await uploadMyProfilePhoto(userId, {
		buffer: req.file.buffer,
		mimetype: req.file.mimetype,
	});

	sendSuccess(res, updatedProfile, 'Profile photo updated');
};

export const patchMePasswordController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const validatedPayload = req.validatedChangePassword;

	if (!validatedPayload) {
		throw new AppError('Invalid password payload', 400);
	}

	await changeMyPassword(userId, validatedPayload);

	sendSuccess(res, null, 'Password updated successfully');
};

export const getMySessionsController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const sessions = await listMyActiveSessions(userId, req.auth?.sessionId);

	sendSuccess(res, sessions, 'Active sessions fetched');
};

export const deleteMySessionController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	await invalidateMySession(userId, String(req.params.id));

	sendSuccess(res, null, 'Session invalidated successfully');
};

export const deleteMySessionsController = async (req: Request, res: Response): Promise<void> => {
	const userId = getAuthUserId(req);
	const result = await invalidateAllMySessions(userId);

	sendSuccess(res, result, 'All sessions invalidated successfully');
};

