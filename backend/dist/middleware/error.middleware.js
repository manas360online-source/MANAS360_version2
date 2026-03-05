"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = exports.AppError = void 0;
const multer_1 = require("multer");
class AppError extends Error {
    statusCode;
    details;
    constructor(message, statusCode = 500, details) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.AppError = AppError;
const notFoundHandler = (_req, _res, next) => {
    next(new AppError('Route not found', 404));
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (error, _req, res, _next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error('[errorHandler]', error);
    }
    if (error instanceof multer_1.MulterError) {
        res.status(400).json({
            message: error.code === 'LIMIT_FILE_SIZE' ? 'File too large. Max size is 5MB' : error.message,
        });
        return;
    }
    if (error instanceof Error && 'name' in error && error.name === 'S3ServiceException') {
        res.status(502).json({
            message: 'Image storage service unavailable',
        });
        return;
    }
    const appError = error instanceof AppError ? error : new AppError('Internal server error', 500);
    const payload = {
        message: appError.message,
    };
    if (appError.details !== undefined) {
        payload.details = appError.details;
    }
    res.status(appError.statusCode).json(payload);
};
exports.errorHandler = errorHandler;
