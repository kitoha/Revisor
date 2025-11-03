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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const github_1 = require("./github");
const gemini_1 = require("./gemini");
const templates_1 = require("./templates");
function parseOptionalNumber(value) {
    if (!value)
        return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}
function getInputs() {
    return {
        geminiApiKey: core.getInput('gemini-api-key', { required: true }),
        githubToken: core.getInput('github-token', { required: true }),
        geminiModel: core.getInput('gemini-model') || undefined,
        maxChanges: parseOptionalNumber(core.getInput('max-changes')),
        maxComments: parseOptionalNumber(core.getInput('max-comments'))
    };
}
function validatePullRequestEvent() {
    if (!github.context.payload.pull_request) {
        throw new Error(templates_1.MESSAGES.INVALID_PR_EVENT);
    }
    return github.context.payload.pull_request.number;
}
async function run() {
    try {
        core.info('Revisor AI Code Review 시작!');
        const inputs = getInputs();
        const prNumber = validatePullRequestEvent();
        core.info(`PR #${prNumber} 리뷰 중...`);
        const githubClient = new github_1.GitHubClient(inputs.githubToken);
        const geminiClient = new gemini_1.GeminiClient(inputs.geminiApiKey, inputs.geminiModel, inputs.maxChanges, inputs.maxComments);
        core.info('변경된 파일 가져오는 중...');
        const files = await githubClient.getChangedFiles();
        core.info(`변경된 파일: ${files.length}개`);
        if (files.length === 0) {
            core.info(templates_1.MESSAGES.NO_FILES_TO_ANALYZE);
            return;
        }
        core.info('Gemini AI로 분석 중...');
        const analysis = await geminiClient.analyzeCode(files);
        core.info(`분석 완료! 이슈 ${analysis.comments.length}개 발견`);
        const reviewSummary = (0, templates_1.createReviewSummary)(files, analysis);
        core.info('리뷰 작성 중...');
        await githubClient.createReview(reviewSummary, analysis.comments);
        core.info('리뷰 완료!');
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : templates_1.MESSAGES.UNKNOWN_ERROR;
        core.setFailed(`실패: ${errorMessage}`);
        throw error;
    }
}
run();
