"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
/**
 * 애플리케이션 설정 상수
 */
exports.CONFIG = {
    // 파일 필터링 설정
    MAX_FILE_CHANGES: 500,
    // 리뷰 설정
    MAX_REVIEW_COMMENTS: 3,
    // Gemini 설정
    DEFAULT_MODEL: 'gemini-2.5-flash',
    // GitHub API 설정
    FILES_PER_PAGE: 100,
    // 바이너리 파일 확장자
    BINARY_EXTENSIONS: [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
        '.pdf', '.zip', '.tar', '.gz',
        '.exe', '.dll', '.so', '.dylib',
        '.woff', '.woff2', '.ttf', '.eot',
        '.ico', '.bin'
    ],
    // 리뷰 이벤트 타입
    REVIEW_EVENT: 'COMMENT'
};
