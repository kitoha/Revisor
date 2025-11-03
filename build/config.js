"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
exports.CONFIG = {
    MAX_FILE_CHANGES: 500,
    MAX_REVIEW_COMMENTS: 3,
    DEFAULT_MODEL: 'gemini-pro',
    FILES_PER_PAGE: 100,
    BINARY_EXTENSIONS: [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
        '.pdf', '.zip', '.tar', '.gz',
        '.exe', '.dll', '.so', '.dylib',
        '.woff', '.woff2', '.ttf', '.eot',
        '.ico', '.bin'
    ],
    REVIEW_EVENT: 'COMMENT'
};
