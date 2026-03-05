"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAdminListSubscriptionsQuery = exports.validateTherapistProfileIdParam = exports.validateAdminGetUserIdParam = exports.validateAdminListUsersQuery = exports.validateTherapistEarningsQuery = exports.validateTherapistSessionNoteRequest = exports.validateTherapistLeadsQuery = exports.validateUploadTherapistDocumentRequest = exports.uploadTherapistDocumentMiddleware = exports.validateCreateTherapistProfileRequest = exports.validateUpdateTherapistSessionStatusRequest = exports.validateTherapistSessionHistoryQuery = exports.validatePatientSessionHistoryQuery = exports.validateBookSessionRequest = exports.validateTherapistMatchQuery = exports.validatePatientMoodHistoryQuery = exports.validatePatientAssessmentHistoryQuery = exports.validateCreatePatientAssessmentRequest = exports.validateCreatePatientProfileRequest = exports.validateSessionIdParam = exports.validateChangePasswordRequest = exports.uploadProfilePhotoMiddleware = exports.validateUpdateMeRequest = exports.asyncHandler = void 0;
const multer_1 = __importStar(require("multer"));
const express_validator_1 = require("express-validator");
const error_middleware_1 = require("./error.middleware");
const constants_1 = require("../utils/constants");
const pagination_1 = require("../utils/pagination");
const asyncHandler = (handler) => (req, res, next) => {
    void handler(req, res, next).catch(next);
};
exports.asyncHandler = asyncHandler;
const applyValidationResult = (req, next) => {
    const result = (0, express_validator_1.validationResult)(req);
    if (result.isEmpty()) {
        next();
        return;
    }
    const errors = result.array({ onlyFirstError: true }).map((issue) => ({
        field: 'path' in issue ? issue.path : 'unknown',
        message: issue.msg,
        value: 'value' in issue ? issue.value : undefined,
    }));
    next(new error_middleware_1.AppError('Validation failed', 422, { errors }));
};
const extractValidatedProfileUpdate = (req, _res, next) => {
    const { filtered } = (0, constants_1.filterProfileUpdatePayload)(req.body);
    req.validatedUserUpdate = filtered;
    next();
};
const passwordStrengthRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
exports.validateUpdateMeRequest = [
    (0, express_validator_1.body)()
        .custom((payload) => {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new Error('Invalid request body');
        }
        const { filtered, forbiddenFields } = (0, constants_1.filterProfileUpdatePayload)(payload);
        if (forbiddenFields.length > 0) {
            throw new Error(`Forbidden fields: ${forbiddenFields.join(', ')}`);
        }
        if (Object.keys(filtered).length === 0) {
            throw new Error('No allowed fields provided for update');
        }
        return true;
    }),
    (0, express_validator_1.body)('name').optional().isString().trim().isLength({ min: 2, max: 50 }).withMessage('name must be 2-50 characters'),
    (0, express_validator_1.body)('phone').optional().isString().trim().matches(/^\+?[1-9]\d{1,14}$/).withMessage('phone must be valid E.164 format'),
    (0, express_validator_1.body)('showNameToProviders').optional().isBoolean().withMessage('showNameToProviders must be a boolean'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedProfileUpdate,
];
const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png']);
const profilePhotoUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});
const checkProfilePhotoType = (req, _res, next) => {
    void (0, express_validator_1.body)('photo')
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
const uploadProfilePhotoMiddleware = (req, res, next) => {
    profilePhotoUpload.single('photo')(req, res, (error) => {
        if (error instanceof multer_1.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                next(new error_middleware_1.AppError('File too large. Max size is 5MB', 400));
                return;
            }
            next(new error_middleware_1.AppError(error.message, 400));
            return;
        }
        if (error) {
            next(error);
            return;
        }
        if (!req.file) {
            next(new error_middleware_1.AppError('Profile photo file is required', 400));
            return;
        }
        checkProfilePhotoType(req, res, next);
    });
};
exports.uploadProfilePhotoMiddleware = uploadProfilePhotoMiddleware;
const extractValidatedChangePassword = (req, _res, next) => {
    req.validatedChangePassword = {
        currentPassword: String(req.body.currentPassword).trim(),
        newPassword: String(req.body.newPassword).trim(),
        confirmPassword: String(req.body.confirmPassword).trim(),
    };
    next();
};
exports.validateChangePasswordRequest = [
    (0, express_validator_1.body)('currentPassword').isString().trim().notEmpty().withMessage('currentPassword is required'),
    (0, express_validator_1.body)('newPassword')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('newPassword is required')
        .bail()
        .matches(passwordStrengthRegex)
        .withMessage('newPassword must be at least 8 characters and include at least one number and one special character'),
    (0, express_validator_1.body)('confirmPassword')
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
exports.validateSessionIdParam = [
    (0, express_validator_1.param)('id').isUUID().withMessage('id must be a valid UUID'),
    (req, _res, next) => applyValidationResult(req, next),
];
const extractValidatedPatientProfile = (req, _res, next) => {
    req.validatedPatientProfile = {
        age: Number(req.body.age),
        gender: req.body.gender,
        medicalHistory: typeof req.body.medicalHistory === 'string' ? req.body.medicalHistory.trim() : undefined,
        emergencyContact: {
            name: String(req.body.emergencyContact?.name ?? '').trim(),
            relation: String(req.body.emergencyContact?.relation ?? '').trim(),
            phone: String(req.body.emergencyContact?.phone ?? '').trim(),
        },
    };
    next();
};
exports.validateCreatePatientProfileRequest = [
    (0, express_validator_1.body)('age').isInt({ min: 1, max: 120 }).withMessage('age must be between 1 and 120'),
    (0, express_validator_1.body)('gender')
        .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
        .withMessage('gender must be one of male, female, other, prefer_not_to_say'),
    (0, express_validator_1.body)('medicalHistory').optional().isString().trim().isLength({ max: 2000 }).withMessage('medicalHistory max length is 2000'),
    (0, express_validator_1.body)('emergencyContact').isObject().withMessage('emergencyContact is required'),
    (0, express_validator_1.body)('emergencyContact.name').isString().trim().isLength({ min: 2, max: 100 }).withMessage('emergencyContact.name must be 2-100 characters'),
    (0, express_validator_1.body)('emergencyContact.relation')
        .isString()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('emergencyContact.relation must be 2-50 characters'),
    (0, express_validator_1.body)('emergencyContact.phone')
        .isString()
        .trim()
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('emergencyContact.phone must be valid E.164 format'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedPatientProfile,
];
const extractValidatedPatientAssessment = (req, _res, next) => {
    req.validatedPatientAssessment = {
        type: req.body.type,
        answers: req.body.answers.map((value) => Number(value)),
    };
    next();
};
exports.validateCreatePatientAssessmentRequest = [
    (0, express_validator_1.body)('type').isIn(['PHQ-9', 'GAD-7']).withMessage('type must be PHQ-9 or GAD-7'),
    (0, express_validator_1.body)('answers').isArray({ min: 1 }).withMessage('answers must be an array of numbers'),
    (0, express_validator_1.body)('answers').custom((answers, { req }) => {
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
const extractValidatedPatientAssessmentHistoryQuery = (req, _res, next) => {
    const pagination = (0, pagination_1.normalizePagination)({
        page: req.query.page !== undefined ? Number(req.query.page) : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    req.validatedPatientAssessmentHistoryQuery = {
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        fromDate: typeof req.query.fromDate === 'string' ? new Date(req.query.fromDate) : undefined,
        toDate: typeof req.query.toDate === 'string' ? new Date(req.query.toDate) : undefined,
        page: pagination.page,
        limit: pagination.limit,
    };
    next();
};
exports.validatePatientAssessmentHistoryQuery = [
    (0, express_validator_1.query)('type').optional().isIn(['PHQ-9', 'GAD-7']).withMessage('type must be PHQ-9 or GAD-7'),
    (0, express_validator_1.query)('fromDate').optional().isISO8601().withMessage('fromDate must be a valid ISO8601 date'),
    (0, express_validator_1.query)('toDate').optional().isISO8601().withMessage('toDate must be a valid ISO8601 date'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
    (0, express_validator_1.query)().custom((value) => {
        const fromDate = value.fromDate ? new Date(value.fromDate) : null;
        const toDate = value.toDate ? new Date(value.toDate) : null;
        if (fromDate && toDate && fromDate > toDate) {
            throw new Error('fromDate must be less than or equal to toDate');
        }
        return true;
    }),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedPatientAssessmentHistoryQuery,
];
const extractValidatedPatientMoodHistoryQuery = (req, _res, next) => {
    req.validatedPatientMoodHistoryQuery = {
        fromDate: typeof req.query.fromDate === 'string' ? new Date(req.query.fromDate) : undefined,
        toDate: typeof req.query.toDate === 'string' ? new Date(req.query.toDate) : undefined,
    };
    next();
};
exports.validatePatientMoodHistoryQuery = [
    (0, express_validator_1.query)('fromDate').optional().isISO8601().withMessage('fromDate must be a valid ISO8601 date'),
    (0, express_validator_1.query)('toDate').optional().isISO8601().withMessage('toDate must be a valid ISO8601 date'),
    (0, express_validator_1.query)().custom((value) => {
        const fromDate = value.fromDate ? new Date(value.fromDate) : null;
        const toDate = value.toDate ? new Date(value.toDate) : null;
        if (fromDate && toDate && fromDate > toDate) {
            throw new Error('fromDate must be less than or equal to toDate');
        }
        return true;
    }),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedPatientMoodHistoryQuery,
];
const extractValidatedTherapistMatchQuery = (req, _res, next) => {
    req.validatedTherapistMatchQuery = {
        languagePreference: typeof req.query.languagePreference === 'string' && req.query.languagePreference.trim().length > 0
            ? req.query.languagePreference.trim()
            : undefined,
        specializationPreference: typeof req.query.specializationPreference === 'string' && req.query.specializationPreference.trim().length > 0
            ? req.query.specializationPreference.trim()
            : undefined,
        nextHours: typeof req.query.nextHours === 'string' ? Number(req.query.nextHours) : 72,
    };
    next();
};
exports.validateTherapistMatchQuery = [
    (0, express_validator_1.query)('languagePreference').optional().isString().trim().isLength({ min: 2, max: 50 }).withMessage('languagePreference must be 2-50 characters'),
    (0, express_validator_1.query)('specializationPreference').optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage('specializationPreference must be 2-80 characters'),
    (0, express_validator_1.query)('nextHours').optional().isInt({ min: 1, max: 336 }).withMessage('nextHours must be an integer between 1 and 336'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedTherapistMatchQuery,
];
const extractValidatedBookSessionPayload = (req, _res, next) => {
    req.validatedBookSessionPayload = {
        therapistId: String(req.body.therapistId),
        dateTime: new Date(String(req.body.dateTime)),
    };
    next();
};
exports.validateBookSessionRequest = [
    (0, express_validator_1.body)('therapistId').isUUID().withMessage('therapistId must be a valid UUID'),
    (0, express_validator_1.body)('dateTime').isISO8601().withMessage('dateTime must be a valid ISO8601 date'),
    (0, express_validator_1.body)('dateTime').custom((value) => {
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
const extractValidatedPatientSessionHistoryQuery = (req, _res, next) => {
    const pagination = (0, pagination_1.normalizePagination)({
        page: req.query.page !== undefined ? Number(req.query.page) : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    req.validatedPatientSessionHistoryQuery = {
        status: typeof req.query.status === 'string'
            ? req.query.status
            : undefined,
        page: pagination.page,
        limit: pagination.limit,
    };
    next();
};
exports.validatePatientSessionHistoryQuery = [
    (0, express_validator_1.query)('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('status must be pending, confirmed, cancelled, or completed'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedPatientSessionHistoryQuery,
];
const extractValidatedTherapistSessionHistoryQuery = (req, _res, next) => {
    const pagination = (0, pagination_1.normalizePagination)({
        page: req.query.page !== undefined ? Number(req.query.page) : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    req.validatedTherapistSessionHistoryQuery = {
        status: typeof req.query.status === 'string'
            ? req.query.status
            : undefined,
        patient: typeof req.query.patient === 'string' ? String(req.query.patient).trim() : undefined,
        from: typeof req.query.from === 'string' ? String(req.query.from) : undefined,
        to: typeof req.query.to === 'string' ? String(req.query.to) : undefined,
        type: typeof req.query.type === 'string' ? String(req.query.type) : undefined,
        completion: typeof req.query.completion === 'string' ? req.query.completion : undefined,
        page: pagination.page,
        limit: pagination.limit,
    };
    next();
};
exports.validateTherapistSessionHistoryQuery = [
    (0, express_validator_1.query)('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('status must be pending, confirmed, cancelled, or completed'),
    (0, express_validator_1.query)('patient').optional().isString().trim().isLength({ min: 1 }).withMessage('patient must be a string'),
    (0, express_validator_1.query)('from').optional().isISO8601().withMessage('from must be an ISO8601 date'),
    (0, express_validator_1.query)('to').optional().isISO8601().withMessage('to must be an ISO8601 date'),
    (0, express_validator_1.query)('type').optional().isString().trim().withMessage('type must be a string'),
    (0, express_validator_1.query)('completion').optional().isIn(['complete', 'incomplete']).withMessage('completion must be complete or incomplete'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedTherapistSessionHistoryQuery,
];
const extractValidatedTherapistSessionStatusPayload = (req, _res, next) => {
    req.validatedTherapistSessionStatusPayload = {
        status: req.body.status,
    };
    next();
};
exports.validateUpdateTherapistSessionStatusRequest = [
    (0, express_validator_1.body)('status').isIn(['confirmed', 'cancelled', 'completed']).withMessage('status must be confirmed, cancelled, or completed'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedTherapistSessionStatusPayload,
];
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const hhmmToMinuteOfDay = (time) => {
    const [hourText, minuteText] = time.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    return hour * 60 + minute;
};
const extractValidatedTherapistProfilePayload = (req, _res, next) => {
    req.validatedTherapistProfilePayload = {
        bio: String(req.body.bio).trim(),
        specializations: req.body.specializations.map((item) => String(item).trim()),
        languages: req.body.languages.map((item) => String(item).trim()),
        yearsOfExperience: Number(req.body.yearsOfExperience),
        consultationFee: Number(req.body.consultationFee),
        availabilitySlots: req.body.availabilitySlots.map((slot) => ({
            dayOfWeek: Number(slot.dayOfWeek),
            startMinute: hhmmToMinuteOfDay(String(slot.startTime)),
            endMinute: hhmmToMinuteOfDay(String(slot.endTime)),
            isAvailable: slot.isAvailable !== false,
        })),
    };
    next();
};
exports.validateCreateTherapistProfileRequest = [
    (0, express_validator_1.body)('bio').isString().trim().notEmpty().withMessage('bio is required').isLength({ max: 2000 }).withMessage('bio max length is 2000'),
    (0, express_validator_1.body)('specializations').isArray({ min: 1 }).withMessage('specializations must be a non-empty array'),
    (0, express_validator_1.body)('specializations.*')
        .isString()
        .trim()
        .isLength({ min: 2, max: 80 })
        .withMessage('each specialization must be 2-80 characters'),
    (0, express_validator_1.body)('languages').isArray({ min: 1 }).withMessage('languages must be a non-empty array'),
    (0, express_validator_1.body)('languages.*').isString().trim().isLength({ min: 2, max: 50 }).withMessage('each language must be 2-50 characters'),
    (0, express_validator_1.body)('yearsOfExperience').isInt({ min: 0, max: 60 }).withMessage('yearsOfExperience must be between 0 and 60'),
    (0, express_validator_1.body)('consultationFee').isFloat({ min: 0, max: 100000 }).withMessage('consultationFee must be between 0 and 100000'),
    (0, express_validator_1.body)('availabilitySlots').isArray({ min: 1 }).withMessage('availabilitySlots must be a non-empty array'),
    (0, express_validator_1.body)('availabilitySlots.*.dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('availabilitySlots.dayOfWeek must be between 0 and 6'),
    (0, express_validator_1.body)('availabilitySlots.*.startTime').matches(timeRegex).withMessage('availabilitySlots.startTime must be HH:mm (24-hour)'),
    (0, express_validator_1.body)('availabilitySlots.*.endTime').matches(timeRegex).withMessage('availabilitySlots.endTime must be HH:mm (24-hour)'),
    (0, express_validator_1.body)('availabilitySlots').custom((slots) => {
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
const therapistDocumentUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
    },
});
const checkTherapistDocumentType = (req, _res, next) => {
    void (0, express_validator_1.body)('document')
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
const uploadTherapistDocumentMiddleware = (req, res, next) => {
    therapistDocumentUpload.single('document')(req, res, (error) => {
        if (error instanceof multer_1.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                next(new error_middleware_1.AppError('File too large. Max size is 10MB', 400));
                return;
            }
            next(new error_middleware_1.AppError(error.message, 400));
            return;
        }
        if (error) {
            next(error);
            return;
        }
        if (!req.file) {
            next(new error_middleware_1.AppError('Document file is required', 400));
            return;
        }
        checkTherapistDocumentType(req, res, next);
    });
};
exports.uploadTherapistDocumentMiddleware = uploadTherapistDocumentMiddleware;
const extractValidatedTherapistDocumentPayload = (req, _res, next) => {
    req.validatedTherapistDocumentPayload = {
        type: req.body.type,
    };
    next();
};
exports.validateUploadTherapistDocumentRequest = [
    (0, express_validator_1.body)('type').isIn(['license', 'degree', 'certificate']).withMessage('type must be one of license, degree, certificate'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedTherapistDocumentPayload,
];
const extractValidatedTherapistLeadsQuery = (req, _res, next) => {
    const pagination = (0, pagination_1.normalizePagination)({
        page: req.query.page !== undefined ? Number(req.query.page) : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    req.validatedTherapistLeadsQuery = {
        status: typeof req.query.status === 'string'
            ? req.query.status
            : undefined,
        page: pagination.page,
        limit: pagination.limit,
    };
    next();
};
exports.validateTherapistLeadsQuery = [
    (0, express_validator_1.query)('status').optional().isIn(['available', 'purchased']).withMessage('status must be available or purchased'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedTherapistLeadsQuery,
];
const extractValidatedTherapistSessionNotePayload = (req, _res, next) => {
    req.validatedTherapistSessionNotePayload = {
        content: String(req.body.content).trim(),
    };
    next();
};
exports.validateTherapistSessionNoteRequest = [
    (0, express_validator_1.body)('content').isString().trim().notEmpty().withMessage('content is required').isLength({ max: 10000 }).withMessage('content max length is 10000'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedTherapistSessionNotePayload,
];
const extractValidatedTherapistEarningsQuery = (req, _res, next) => {
    const pagination = (0, pagination_1.normalizePagination)({
        page: req.query.page !== undefined ? Number(req.query.page) : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    req.validatedTherapistEarningsQuery = {
        fromDate: typeof req.query.fromDate === 'string' ? new Date(req.query.fromDate) : undefined,
        toDate: typeof req.query.toDate === 'string' ? new Date(req.query.toDate) : undefined,
        page: pagination.page,
        limit: pagination.limit,
    };
    next();
};
exports.validateTherapistEarningsQuery = [
    (0, express_validator_1.query)('fromDate').optional().isISO8601().withMessage('fromDate must be a valid ISO8601 date'),
    (0, express_validator_1.query)('toDate').optional().isISO8601().withMessage('toDate must be a valid ISO8601 date'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
    (0, express_validator_1.query)().custom((value) => {
        const fromDate = value.fromDate ? new Date(value.fromDate) : null;
        const toDate = value.toDate ? new Date(value.toDate) : null;
        if (fromDate && toDate && fromDate > toDate) {
            throw new Error('fromDate must be less than or equal to toDate');
        }
        return true;
    }),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedTherapistEarningsQuery,
];
// Admin: List Users Query Validation
const extractValidatedAdminListUsersQuery = (req, _res, next) => {
    const pagination = (0, pagination_1.normalizePagination)({ page: Number(req.query.page), limit: Number(req.query.limit) }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    req.validatedAdminListUsersQuery = {
        role: typeof req.query.role === 'string' ? req.query.role : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        page: pagination.page,
        limit: pagination.limit,
    };
    next();
};
exports.validateAdminListUsersQuery = [
    (0, express_validator_1.query)('role')
        .optional()
        .isString()
        .isIn(['patient', 'therapist', 'admin'])
        .withMessage('role must be one of: patient, therapist, admin'),
    (0, express_validator_1.query)('status')
        .optional()
        .isString()
        .isIn(['active', 'deleted'])
        .withMessage('status must be one of: active, deleted'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedAdminListUsersQuery,
];
// Admin: Get User ID Validation
const extractValidatedAdminGetUserIdParam = (req, _res, next) => {
    req.validatedUserId = String(req.params.id);
    next();
};
exports.validateAdminGetUserIdParam = [
    (0, express_validator_1.param)('id').isUUID().withMessage('id must be a valid UUID'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedAdminGetUserIdParam,
];
// Admin: Verify Therapist Param Validation
const extractValidatedTherapistProfileId = (req, _res, next) => {
    req.validatedTherapistProfileId = String(req.params.id);
    next();
};
exports.validateTherapistProfileIdParam = [
    (0, express_validator_1.param)('id').isUUID().withMessage('id must be a valid UUID'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedTherapistProfileId,
];
// Admin: List Subscriptions Query Validation
const extractValidatedAdminListSubscriptionsQuery = (req, _res, next) => {
    const pagination = (0, pagination_1.normalizePagination)({ page: Number(req.query.page), limit: Number(req.query.limit) }, { defaultPage: 1, defaultLimit: 10, maxLimit: 50 });
    req.validatedAdminListSubscriptionsQuery = {
        planType: typeof req.query.planType === 'string' ? req.query.planType : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        page: pagination.page,
        limit: pagination.limit,
    };
    next();
};
exports.validateAdminListSubscriptionsQuery = [
    (0, express_validator_1.query)('planType')
        .optional()
        .isString()
        .isIn(['basic', 'premium', 'pro'])
        .withMessage('planType must be one of: basic, premium, pro'),
    (0, express_validator_1.query)('status')
        .optional()
        .isString()
        .isIn(['active', 'expired', 'cancelled', 'paused'])
        .withMessage('status must be one of: active, expired, cancelled, paused'),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
    (req, _res, next) => applyValidationResult(req, next),
    extractValidatedAdminListSubscriptionsQuery,
];
