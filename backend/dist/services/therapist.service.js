"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMyTherapistDocument = exports.getMyTherapistProfile = exports.createTherapistProfile = void 0;
const db_1 = require("../config/db");
const error_middleware_1 = require("../middleware/error.middleware");
const db = db_1.prisma;
const normalizeArray = (values) => {
    const normalized = values
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    return Array.from(new Set(normalized));
};
const minuteToTime = (minute) => {
    const hours = Math.floor(minute / 60)
        .toString()
        .padStart(2, '0');
    const mins = (minute % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
};
const assertTherapistUser = async (userId) => {
    const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, firstName: true, lastName: true },
    });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    if (String(user.role) !== 'THERAPIST') {
        throw new error_middleware_1.AppError('Therapist role required', 403);
    }
    return user;
};
const toSafeProfile = (profile) => ({
    id: profile._id.toString(),
    displayName: profile.displayName,
    bio: profile.bio ?? null,
    specializations: profile.specializations,
    languages: profile.languages,
    yearsOfExperience: profile.yearsOfExperience,
    consultationFee: profile.consultationFee,
    availabilitySlots: profile.availabilitySlots.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: minuteToTime(slot.startMinute),
        endTime: minuteToTime(slot.endMinute),
        isAvailable: slot.isAvailable,
    })),
    averageRating: profile.averageRating,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
});
const createTherapistProfile = async (userId, input) => {
    await assertTherapistUser(userId);
    void input;
    throw new error_middleware_1.AppError('Therapist profile creation is unavailable until therapist profile Prisma models are introduced', 501);
};
exports.createTherapistProfile = createTherapistProfile;
const getMyTherapistProfile = async (userId) => {
    await assertTherapistUser(userId);
    throw new error_middleware_1.AppError('Therapist profile retrieval is unavailable until therapist profile Prisma models are introduced', 501);
};
exports.getMyTherapistProfile = getMyTherapistProfile;
const uploadMyTherapistDocument = async (userId, payload, file) => {
    await assertTherapistUser(userId);
    void payload;
    void file;
    throw new error_middleware_1.AppError('Therapist document upload is unavailable until therapist document Prisma models are introduced', 501);
};
exports.uploadMyTherapistDocument = uploadMyTherapistDocument;
