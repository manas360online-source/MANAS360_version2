import type { NextFunction, Request, Response, RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { body, param, query, validationResult } from 'express-validator';
import { AppError } from './error.middleware';
import { filterProfileUpdatePayload } from '../utils/constants';
import { normalizePagination } from '../utils/pagination';

export const asyncHandler =
	(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
	(req, res, next) => {
		void handler(req, res, next).catch(next);
	};

const applyValidationResult = (req: Request, next: NextFunction): void => {
	const result = validationResult(req);

	if (result.isEmpty()) {
		next();
		return;
	}

	const errors = result.array({ onlyFirstError: true }).map((issue) => ({
		field: 'path' in issue ? issue.path : 'unknown',
		message: issue.msg,
		value: 'value' in issue ? issue.value : undefined,
	}));

	next(new AppError('Validation failed', 422, { errors }));
};

const extractValidatedProfileUpdate = (req: Request, _res: Response, next: NextFunction): void => {
	const { filtered } = filterProfileUpdatePayload(req.body as Record<string, unknown>);
	req.validatedUserUpdate = filtered;
	next();
};

const passwordStrengthRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const validateUpdateMeRequest: RequestHandler[] = [
	body()
		.custom((payload) => {
			if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
				throw new Error('Invalid request body');
			}

			const { filtered, forbiddenFields } = filterProfileUpdatePayload(payload as Record<string, unknown>);

			if (forbiddenFields.length > 0) {
				throw new Error(`Forbidden fields: ${forbiddenFields.join(', ')}`);
			}

			if (Object.keys(filtered).length === 0) {
				throw new Error('No allowed fields provided for update');
			}

			return true;
		}),
	body('name').optional().isString().trim().isLength({ min: 2, max: 50 }).withMessage('name must be 2-50 characters'),
	body('phone').optional().isString().trim().matches(/^\+?[1-9]\d{1,14}$/).withMessage('phone must be valid E.164 format'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedProfileUpdate,
];

const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png']);

const profilePhotoUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 5 * 1024 * 1024,
		files: 1,
	},
});

const checkProfilePhotoType: RequestHandler = (req, _res, next) => {
	void body('photo')
		.custom(() => {
			if (!req.file) {
				throw new Error('Profile photo file is required');
			}

			if (!allowedImageMimeTypes.has(req.file.mimetype)) {
				throw new Error('Only jpg, jpeg, png files are allowed');
			}

			return true;
		})
		.run(req)
		.then(() => applyValidationResult(req, next))
		.catch(next);
};

export const uploadProfilePhotoMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	profilePhotoUpload.single('photo')(req, res, (error: unknown) => {
		if (error instanceof MulterError) {
			if (error.code === 'LIMIT_FILE_SIZE') {
				next(new AppError('File too large. Max size is 5MB', 400));
				return;
			}

			next(new AppError(error.message, 400));
			return;
		}

		if (error) {
			next(error as Error);
			return;
		}

		if (!req.file) {
			next(new AppError('Profile photo file is required', 400));
			return;
		}

		checkProfilePhotoType(req, res, next);
	});
};

const extractValidatedChangePassword = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedChangePassword = {
		currentPassword: String(req.body.currentPassword).trim(),
		newPassword: String(req.body.newPassword).trim(),
		confirmPassword: String(req.body.confirmPassword).trim(),
	};
	next();
};

export const validateChangePasswordRequest: RequestHandler[] = [
	body('currentPassword').isString().trim().notEmpty().withMessage('currentPassword is required'),
	body('newPassword')
		.isString()
		.trim()
		.notEmpty()
		.withMessage('newPassword is required')
		.bail()
		.matches(passwordStrengthRegex)
		.withMessage(
			'newPassword must be at least 8 characters and include at least one number and one special character',
		),
	body('confirmPassword')
		.isString()
		.trim()
		.notEmpty()
		.withMessage('confirmPassword is required')
		.bail()
		.custom((value, { req }) => value === String(req.body.newPassword ?? '').trim())
		.withMessage('confirmPassword must match newPassword'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedChangePassword,
];

export const validateSessionIdParam: RequestHandler[] = [
	param('id').isUUID().withMessage('id must be a valid UUID'),
	(req, _res, next) => applyValidationResult(req, next),
];

const extractValidatedPatientProfile = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedPatientProfile = {
		age: Number(req.body.age),
		gender: req.body.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say',
		medicalHistory: typeof req.body.medicalHistory === 'string' ? req.body.medicalHistory.trim() : undefined,
		emergencyContact: {
			name: String(req.body.emergencyContact?.name ?? '').trim(),
			relation: String(req.body.emergencyContact?.relation ?? '').trim(),
			phone: String(req.body.emergencyContact?.phone ?? '').trim(),
		},
	};
	next();
};

export const validateCreatePatientProfileRequest: RequestHandler[] = [
	body('age').isInt({ min: 1, max: 120 }).withMessage('age must be between 1 and 120'),
	body('gender')
		.isIn(['male', 'female', 'other', 'prefer_not_to_say'])
		.withMessage('gender must be one of male, female, other, prefer_not_to_say'),
	body('medicalHistory').optional().isString().trim().isLength({ max: 2000 }).withMessage('medicalHistory max length is 2000'),
	body('emergencyContact').isObject().withMessage('emergencyContact is required'),
	body('emergencyContact.name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('emergencyContact.name must be 2-100 characters'),
	body('emergencyContact.relation')
		.isString()
		.trim()
		.isLength({ min: 2, max: 50 })
		.withMessage('emergencyContact.relation must be 2-50 characters'),
	body('emergencyContact.phone')
		.isString()
		.trim()
		.matches(/^\+?[1-9]\d{1,14}$/)
		.withMessage('emergencyContact.phone must be valid E.164 format'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedPatientProfile,
];

const extractValidatedPatientAssessment = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedPatientAssessment = {
		type: req.body.type as 'PHQ-9' | 'GAD-7',
		answers: (req.body.answers as number[]).map((value) => Number(value)),
	};
	next();
};

export const validateCreatePatientAssessmentRequest: RequestHandler[] = [
	body('type').isIn(['PHQ-9', 'GAD-7']).withMessage('type must be PHQ-9 or GAD-7'),
	body('answers').isArray({ min: 1 }).withMessage('answers must be an array of numbers'),
	body('answers').custom((answers, { req }) => {
		if (!Array.isArray(answers)) {
			throw new Error('answers must be an array');
		}

		const expectedLength = req.body.type === 'PHQ-9' ? 9 : req.body.type === 'GAD-7' ? 7 : null;
		if (!expectedLength) {
			throw new Error('type must be PHQ-9 or GAD-7');
		}

		if (answers.length !== expectedLength) {
			throw new Error(`answers must contain exactly ${expectedLength} values for ${req.body.type}`);
		}

		for (const value of answers) {
			if (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 3) {
				throw new Error('each answer must be an integer between 0 and 3');
			}
		}

		return true;
	}),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedPatientAssessment,
];

const extractValidatedPatientAssessmentHistoryQuery = (req: Request, _res: Response, next: NextFunction): void => {
	const pagination = normalizePagination(
		{
			page: req.query.page !== undefined ? Number(req.query.page) : undefined,
			limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
		},
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	req.validatedPatientAssessmentHistoryQuery = {
		type: typeof req.query.type === 'string' ? (req.query.type as 'PHQ-9' | 'GAD-7') : undefined,
		fromDate: typeof req.query.fromDate === 'string' ? new Date(req.query.fromDate) : undefined,
		toDate: typeof req.query.toDate === 'string' ? new Date(req.query.toDate) : undefined,
		page: pagination.page,
		limit: pagination.limit,
	};

	next();
};

export const validatePatientAssessmentHistoryQuery: RequestHandler[] = [
	query('type').optional().isIn(['PHQ-9', 'GAD-7']).withMessage('type must be PHQ-9 or GAD-7'),
	query('fromDate').optional().isISO8601().withMessage('fromDate must be a valid ISO8601 date'),
	query('toDate').optional().isISO8601().withMessage('toDate must be a valid ISO8601 date'),
	query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
	query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
	query().custom((value) => {
		const fromDate = value.fromDate ? new Date(value.fromDate as string) : null;
		const toDate = value.toDate ? new Date(value.toDate as string) : null;

		if (fromDate && toDate && fromDate > toDate) {
			throw new Error('fromDate must be less than or equal to toDate');
		}

		return true;
	}),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedPatientAssessmentHistoryQuery,
];

const extractValidatedPatientMoodHistoryQuery = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedPatientMoodHistoryQuery = {
		fromDate: typeof req.query.fromDate === 'string' ? new Date(req.query.fromDate) : undefined,
		toDate: typeof req.query.toDate === 'string' ? new Date(req.query.toDate) : undefined,
	};

	next();
};

export const validatePatientMoodHistoryQuery: RequestHandler[] = [
	query('fromDate').optional().isISO8601().withMessage('fromDate must be a valid ISO8601 date'),
	query('toDate').optional().isISO8601().withMessage('toDate must be a valid ISO8601 date'),
	query().custom((value) => {
		const fromDate = value.fromDate ? new Date(value.fromDate as string) : null;
		const toDate = value.toDate ? new Date(value.toDate as string) : null;

		if (fromDate && toDate && fromDate > toDate) {
			throw new Error('fromDate must be less than or equal to toDate');
		}

		return true;
	}),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedPatientMoodHistoryQuery,
];

const extractValidatedTherapistMatchQuery = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedTherapistMatchQuery = {
		languagePreference:
			typeof req.query.languagePreference === 'string' && req.query.languagePreference.trim().length > 0
				? req.query.languagePreference.trim()
				: undefined,
		specializationPreference:
			typeof req.query.specializationPreference === 'string' && req.query.specializationPreference.trim().length > 0
				? req.query.specializationPreference.trim()
				: undefined,
		nextHours: typeof req.query.nextHours === 'string' ? Number(req.query.nextHours) : 72,
	};

	next();
};

export const validateTherapistMatchQuery: RequestHandler[] = [
	query('languagePreference').optional().isString().trim().isLength({ min: 2, max: 50 }).withMessage('languagePreference must be 2-50 characters'),
	query('specializationPreference').optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage('specializationPreference must be 2-80 characters'),
	query('nextHours').optional().isInt({ min: 1, max: 336 }).withMessage('nextHours must be an integer between 1 and 336'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedTherapistMatchQuery,
];

const extractValidatedBookSessionPayload = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedBookSessionPayload = {
		therapistId: String(req.body.therapistId),
		dateTime: new Date(String(req.body.dateTime)),
	};

	next();
};

export const validateBookSessionRequest: RequestHandler[] = [
	body('therapistId').isUUID().withMessage('therapistId must be a valid UUID'),
	body('dateTime').isISO8601().withMessage('dateTime must be a valid ISO8601 date'),
	body('dateTime').custom((value) => {
		const date = new Date(String(value));
		if (Number.isNaN(date.getTime())) {
			throw new Error('dateTime must be a valid date');
		}

		if (date <= new Date()) {
			throw new Error('dateTime must be in the future');
		}

		return true;
	}),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedBookSessionPayload,
];

const extractValidatedPatientSessionHistoryQuery = (req: Request, _res: Response, next: NextFunction): void => {
	const pagination = normalizePagination(
		{
			page: req.query.page !== undefined ? Number(req.query.page) : undefined,
			limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
		},
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	req.validatedPatientSessionHistoryQuery = {
		status:
			typeof req.query.status === 'string'
				? (req.query.status as 'pending' | 'confirmed' | 'cancelled' | 'completed')
				: undefined,
		page: pagination.page,
		limit: pagination.limit,
	};

	next();
};

export const validatePatientSessionHistoryQuery: RequestHandler[] = [
	query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('status must be pending, confirmed, cancelled, or completed'),
	query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
	query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedPatientSessionHistoryQuery,
];

const extractValidatedTherapistSessionHistoryQuery = (req: Request, _res: Response, next: NextFunction): void => {
	const pagination = normalizePagination(
		{
			page: req.query.page !== undefined ? Number(req.query.page) : undefined,
			limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
		},
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	req.validatedTherapistSessionHistoryQuery = {
		status:
			typeof req.query.status === 'string'
				? (req.query.status as 'pending' | 'confirmed' | 'cancelled' | 'completed')
				: undefined,
		patient: typeof req.query.patient === 'string' ? String(req.query.patient).trim() : undefined,
		from: typeof req.query.from === 'string' ? String(req.query.from) : undefined,
		to: typeof req.query.to === 'string' ? String(req.query.to) : undefined,
		type: typeof req.query.type === 'string' ? String(req.query.type) : undefined,
		completion: typeof req.query.completion === 'string' ? (req.query.completion as 'complete' | 'incomplete') : undefined,
		page: pagination.page,
		limit: pagination.limit,
	};

	next();
};

export const validateTherapistSessionHistoryQuery: RequestHandler[] = [
	query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('status must be pending, confirmed, cancelled, or completed'),
	query('patient').optional().isString().trim().isLength({ min: 1 }).withMessage('patient must be a string'),
	query('from').optional().isISO8601().withMessage('from must be an ISO8601 date'),
	query('to').optional().isISO8601().withMessage('to must be an ISO8601 date'),
	query('type').optional().isString().trim().withMessage('type must be a string'),
	query('completion').optional().isIn(['complete', 'incomplete']).withMessage('completion must be complete or incomplete'),
	query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
	query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedTherapistSessionHistoryQuery,
];

const extractValidatedTherapistSessionStatusPayload = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedTherapistSessionStatusPayload = {
		status: req.body.status as 'confirmed' | 'cancelled' | 'completed',
	};

	next();
};

export const validateUpdateTherapistSessionStatusRequest: RequestHandler[] = [
	body('status').isIn(['confirmed', 'cancelled', 'completed']).withMessage('status must be confirmed, cancelled, or completed'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedTherapistSessionStatusPayload,
];

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const hhmmToMinuteOfDay = (time: string): number => {
	const [hourText, minuteText] = time.split(':');
	const hour = Number(hourText);
	const minute = Number(minuteText);

	return hour * 60 + minute;
};

const extractValidatedTherapistProfilePayload = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedTherapistProfilePayload = {
		bio: String(req.body.bio).trim(),
		specializations: (req.body.specializations as string[]).map((item) => String(item).trim()),
		languages: (req.body.languages as string[]).map((item) => String(item).trim()),
		yearsOfExperience: Number(req.body.yearsOfExperience),
		consultationFee: Number(req.body.consultationFee),
		availabilitySlots: (req.body.availabilitySlots as Array<Record<string, unknown>>).map((slot) => ({
			dayOfWeek: Number(slot.dayOfWeek),
			startMinute: hhmmToMinuteOfDay(String(slot.startTime)),
			endMinute: hhmmToMinuteOfDay(String(slot.endTime)),
			isAvailable: slot.isAvailable !== false,
		})),
	};

	next();
};

export const validateCreateTherapistProfileRequest: RequestHandler[] = [
	body('bio').isString().trim().notEmpty().withMessage('bio is required').isLength({ max: 2000 }).withMessage('bio max length is 2000'),
	body('specializations').isArray({ min: 1 }).withMessage('specializations must be a non-empty array'),
	body('specializations.*')
		.isString()
		.trim()
		.isLength({ min: 2, max: 80 })
		.withMessage('each specialization must be 2-80 characters'),
	body('languages').isArray({ min: 1 }).withMessage('languages must be a non-empty array'),
	body('languages.*').isString().trim().isLength({ min: 2, max: 50 }).withMessage('each language must be 2-50 characters'),
	body('yearsOfExperience').isInt({ min: 0, max: 60 }).withMessage('yearsOfExperience must be between 0 and 60'),
	body('consultationFee').isFloat({ min: 0, max: 100000 }).withMessage('consultationFee must be between 0 and 100000'),
	body('availabilitySlots').isArray({ min: 1 }).withMessage('availabilitySlots must be a non-empty array'),
	body('availabilitySlots.*.dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('availabilitySlots.dayOfWeek must be between 0 and 6'),
	body('availabilitySlots.*.startTime').matches(timeRegex).withMessage('availabilitySlots.startTime must be HH:mm (24-hour)'),
	body('availabilitySlots.*.endTime').matches(timeRegex).withMessage('availabilitySlots.endTime must be HH:mm (24-hour)'),
	body('availabilitySlots').custom((slots) => {
		if (!Array.isArray(slots)) {
			throw new Error('availabilitySlots must be an array');
		}

		for (const slot of slots) {
			const startMinute = hhmmToMinuteOfDay(String(slot.startTime));
			const endMinute = hhmmToMinuteOfDay(String(slot.endTime));

			if (endMinute <= startMinute) {
				throw new Error('availability slot endTime must be after startTime');
			}
		}

		return true;
	}),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedTherapistProfilePayload,
];

const allowedTherapistDocumentMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);

const therapistDocumentUpload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024,
		files: 1,
	},
});

const checkTherapistDocumentType: RequestHandler = (req, _res, next) => {
	void body('document')
		.custom(() => {
			if (!req.file) {
				throw new Error('Document file is required');
			}

			if (!allowedTherapistDocumentMimeTypes.has(req.file.mimetype)) {
				throw new Error('Only PDF, JPG, PNG files are allowed');
			}

			return true;
		})
		.run(req)
		.then(() => applyValidationResult(req, next))
		.catch(next);
};

export const uploadTherapistDocumentMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	therapistDocumentUpload.single('document')(req, res, (error: unknown) => {
		if (error instanceof MulterError) {
			if (error.code === 'LIMIT_FILE_SIZE') {
				next(new AppError('File too large. Max size is 10MB', 400));
				return;
			}

			next(new AppError(error.message, 400));
			return;
		}

		if (error) {
			next(error as Error);
			return;
		}

		if (!req.file) {
			next(new AppError('Document file is required', 400));
			return;
		}

		checkTherapistDocumentType(req, res, next);
	});
};

const extractValidatedTherapistDocumentPayload = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedTherapistDocumentPayload = {
		type: req.body.type as 'license' | 'degree' | 'certificate',
	};

	next();
};

export const validateUploadTherapistDocumentRequest: RequestHandler[] = [
	body('type').isIn(['license', 'degree', 'certificate']).withMessage('type must be one of license, degree, certificate'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedTherapistDocumentPayload,
];

const extractValidatedTherapistLeadsQuery = (req: Request, _res: Response, next: NextFunction): void => {
	const pagination = normalizePagination(
		{
			page: req.query.page !== undefined ? Number(req.query.page) : undefined,
			limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
		},
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	req.validatedTherapistLeadsQuery = {
		status:
			typeof req.query.status === 'string'
				? (req.query.status as 'available' | 'purchased')
				: undefined,
		page: pagination.page,
		limit: pagination.limit,
	};

	next();
};

export const validateTherapistLeadsQuery: RequestHandler[] = [
	query('status').optional().isIn(['available', 'purchased']).withMessage('status must be available or purchased'),
	query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
	query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedTherapistLeadsQuery,
];

const extractValidatedTherapistSessionNotePayload = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedTherapistSessionNotePayload = {
		content: String(req.body.content).trim(),
	};

	next();
};

export const validateTherapistSessionNoteRequest: RequestHandler[] = [
	body('content').isString().trim().notEmpty().withMessage('content is required').isLength({ max: 10000 }).withMessage('content max length is 10000'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedTherapistSessionNotePayload,
];

const extractValidatedTherapistEarningsQuery = (req: Request, _res: Response, next: NextFunction): void => {
	const pagination = normalizePagination(
		{
			page: req.query.page !== undefined ? Number(req.query.page) : undefined,
			limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
		},
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	req.validatedTherapistEarningsQuery = {
		fromDate: typeof req.query.fromDate === 'string' ? new Date(req.query.fromDate) : undefined,
		toDate: typeof req.query.toDate === 'string' ? new Date(req.query.toDate) : undefined,
		page: pagination.page,
		limit: pagination.limit,
	};

	next();
};

export const validateTherapistEarningsQuery: RequestHandler[] = [
	query('fromDate').optional().isISO8601().withMessage('fromDate must be a valid ISO8601 date'),
	query('toDate').optional().isISO8601().withMessage('toDate must be a valid ISO8601 date'),
	query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
	query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
	query().custom((value) => {
		const fromDate = value.fromDate ? new Date(value.fromDate as string) : null;
		const toDate = value.toDate ? new Date(value.toDate as string) : null;

		if (fromDate && toDate && fromDate > toDate) {
			throw new Error('fromDate must be less than or equal to toDate');
		}

		return true;
	}),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedTherapistEarningsQuery,
];

// Admin: List Users Query Validation
const extractValidatedAdminListUsersQuery = (req: Request, _res: Response, next: NextFunction): void => {
	const pagination = normalizePagination(
		{ page: Number(req.query.page), limit: Number(req.query.limit) },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	req.validatedAdminListUsersQuery = {
		role: typeof req.query.role === 'string' ? req.query.role : undefined,
		status: typeof req.query.status === 'string' ? req.query.status : undefined,
		page: pagination.page,
		limit: pagination.limit,
	};

	next();
};

export const validateAdminListUsersQuery: RequestHandler[] = [
	query('role')
		.optional()
		.isString()
		.isIn(['patient', 'therapist', 'admin'])
		.withMessage('role must be one of: patient, therapist, admin'),
	query('status')
		.optional()
		.isString()
		.isIn(['active', 'deleted'])
		.withMessage('status must be one of: active, deleted'),
	query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
	query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedAdminListUsersQuery,
];

// Admin: Get User ID Validation
const extractValidatedAdminGetUserIdParam = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedUserId = String(req.params.id);
	next();
};

export const validateAdminGetUserIdParam: RequestHandler[] = [
	param('id').isUUID().withMessage('id must be a valid UUID'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedAdminGetUserIdParam,
];

// Admin: Verify Therapist Param Validation
const extractValidatedTherapistProfileId = (req: Request, _res: Response, next: NextFunction): void => {
	req.validatedTherapistProfileId = String(req.params.id);
	next();
};

export const validateTherapistProfileIdParam: RequestHandler[] = [
	param('id').isUUID().withMessage('id must be a valid UUID'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedTherapistProfileId,
];

// Admin: List Subscriptions Query Validation
const extractValidatedAdminListSubscriptionsQuery = (req: Request, _res: Response, next: NextFunction): void => {
	const pagination = normalizePagination(
		{ page: Number(req.query.page), limit: Number(req.query.limit) },
		{ defaultPage: 1, defaultLimit: 10, maxLimit: 50 },
	);

	req.validatedAdminListSubscriptionsQuery = {
		planType: typeof req.query.planType === 'string' ? req.query.planType : undefined,
		status: typeof req.query.status === 'string' ? req.query.status : undefined,
		page: pagination.page,
		limit: pagination.limit,
	};

	next();
};

export const validateAdminListSubscriptionsQuery: RequestHandler[] = [
	query('planType')
		.optional()
		.isString()
		.isIn(['basic', 'premium', 'pro'])
		.withMessage('planType must be one of: basic, premium, pro'),
	query('status')
		.optional()
		.isString()
		.isIn(['active', 'expired', 'cancelled', 'paused'])
		.withMessage('status must be one of: active, expired, cancelled, paused'),
	query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
	query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
	(req, _res, next) => applyValidationResult(req, next),
	extractValidatedAdminListSubscriptionsQuery,
];

