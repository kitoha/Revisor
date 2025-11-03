"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("./config");
const templates_1 = require("./templates");
function createErrorMessage(baseMessage, error) {
    return `${baseMessage}: ${error instanceof Error ? error.message : templates_1.MESSAGES.UNKNOWN_ERROR}`;
}
class GeminiClient {
    constructor(apiKey, model = config_1.CONFIG.DEFAULT_MODEL, maxChanges = config_1.CONFIG.MAX_FILE_CHANGES, maxComments = config_1.CONFIG.MAX_REVIEW_COMMENTS) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = model;
        this.maxChanges = maxChanges;
        this.maxComments = maxComments;
    }
    async analyzeCode(files) {
        const analyzableFiles = this.filterAnalyzableFiles(files);
        if (analyzableFiles.length === 0) {
            return {
                summary: templates_1.MESSAGES.NO_ANALYZABLE_FILES,
                comments: []
            };
        }
        try {
            const prompt = (0, templates_1.buildCodeReviewPrompt)(analyzableFiles, this.maxComments);
            const result = await this.callGemini(prompt);
            return this.parseResponse(result);
        }
        catch (error) {
            throw new Error(createErrorMessage(templates_1.MESSAGES.GEMINI_ANALYSIS_ERROR, error));
        }
    }
    filterAnalyzableFiles(files) {
        return files.filter(file => file.patch &&
            file.changes < this.maxChanges &&
            !this.isBinaryFile(file.filename));
    }
    async callGemini(prompt) {
        try {
            const model = this.genAI.getGenerativeModel({ model: this.model });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
            throw new Error(createErrorMessage(templates_1.MESSAGES.GEMINI_API_ERROR, error));
        }
    }
    parseResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error(templates_1.MESSAGES.JSON_PARSE_ERROR);
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                summary: parsed.summary || templates_1.MESSAGES.DEFAULT_ANALYSIS_SUMMARY,
                comments: (parsed.comments || []).slice(0, this.maxComments)
            };
        }
        catch (error) {
            return {
                summary: templates_1.MESSAGES.PARSING_ERROR_SUMMARY,
                comments: []
            };
        }
    }
    isBinaryFile(filename) {
        const lowerFilename = filename.toLowerCase();
        return config_1.CONFIG.BINARY_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
    }
}
exports.GeminiClient = GeminiClient;
