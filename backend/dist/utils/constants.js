"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterProfileUpdatePayload = exports.FORBIDDEN_PROFILE_UPDATE_FIELDS = exports.ALLOWED_PROFILE_UPDATE_FIELDS = void 0;
exports.ALLOWED_PROFILE_UPDATE_FIELDS = ['name', 'phone', 'showNameToProviders'];
exports.FORBIDDEN_PROFILE_UPDATE_FIELDS = ['role', 'email', 'password', 'passwordHash'];
const filterProfileUpdatePayload = (rawPayload) => {
    const allowedFields = new Set(exports.ALLOWED_PROFILE_UPDATE_FIELDS);
    const forbiddenFieldsSet = new Set(exports.FORBIDDEN_PROFILE_UPDATE_FIELDS);
    const filtered = {};
    const forbiddenFields = [];
    const ignoredFields = [];
    for (const [key, value] of Object.entries(rawPayload)) {
        if (forbiddenFieldsSet.has(key)) {
            forbiddenFields.push(key);
            continue;
        }
        if (allowedFields.has(key)) {
            if ((key === 'name' || key === 'phone') && typeof value === 'string') {
                filtered[key] = value;
                continue;
            }
            if (key === 'showNameToProviders' && typeof value === 'boolean') {
                filtered.showNameToProviders = value;
            }
            continue;
        }
        ignoredFields.push(key);
    }
    return {
        filtered,
        forbiddenFields,
        ignoredFields,
    };
};
exports.filterProfileUpdatePayload = filterProfileUpdatePayload;
