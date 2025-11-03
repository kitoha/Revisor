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
exports.GitHubClient = void 0;
const github = __importStar(require("@actions/github"));
const config_1 = require("./config");
const templates_1 = require("./templates");
class GitHubClient {
    constructor(token) {
        this.octokit = github.getOctokit(token);
        this.owner = github.context.repo.owner;
        this.repo = github.context.repo.repo;
        this.prNumber = github.context.issue.number;
    }
    async getChangedFiles() {
        try {
            const allFiles = [];
            let page = 1;
            let hasMore = true;
            while (hasMore) {
                const { data } = await this.octokit.rest.pulls.listFiles({
                    owner: this.owner,
                    repo: this.repo,
                    pull_number: this.prNumber,
                    per_page: config_1.CONFIG.FILES_PER_PAGE,
                    page
                });
                allFiles.push(...data);
                hasMore = data.length === config_1.CONFIG.FILES_PER_PAGE;
                page++;
            }
            return allFiles;
        }
        catch (error) {
            throw new Error(`${templates_1.MESSAGES.GET_FILES_ERROR}: ${error instanceof Error ? error.message : templates_1.MESSAGES.UNKNOWN_ERROR}`);
        }
    }
    async createReview(summary, comments) {
        try {
            const validComments = comments.filter(comment => comment.line > 0 && comment.path && comment.body);
            await this.octokit.rest.pulls.createReview({
                owner: this.owner,
                repo: this.repo,
                pull_number: this.prNumber,
                body: summary,
                event: config_1.CONFIG.REVIEW_EVENT,
                comments: validComments
            });
        }
        catch (error) {
            throw new Error(`${templates_1.MESSAGES.CREATE_REVIEW_ERROR}: ${error instanceof Error ? error.message : templates_1.MESSAGES.UNKNOWN_ERROR}`);
        }
    }
}
exports.GitHubClient = GitHubClient;
