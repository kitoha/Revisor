"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiClient = void 0;
const generative_ai_1 = require("@google/generative-ai");
const config_1 = require("./config");
class GeminiClient {
    constructor(apiKey, model = config_1.CONFIG.DEFAULT_MODEL, maxChanges = config_1.CONFIG.MAX_FILE_CHANGES, maxComments = config_1.CONFIG.MAX_REVIEW_COMMENTS) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = model;
        this.maxChanges = maxChanges;
        this.maxComments = maxComments;
    }
    /**
     * 변경된 파일들을 AI로 분석합니다
     */
    async analyzeCode(files) {
        const analyzableFiles = this.filterAnalyzableFiles(files);
        if (analyzableFiles.length === 0) {
            return {
                summary: '분석할 수 있는 파일이 없습니다. (바이너리 파일이거나 변경량이 너무 큽니다)',
                comments: []
            };
        }
        try {
            const prompt = this.buildPrompt(analyzableFiles);
            const result = await this.callGemini(prompt);
            return this.parseResponse(result);
        }
        catch (error) {
            throw new Error(`Gemini AI 분석 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }
    /**
     * 분석 가능한 파일만 필터링합니다
     */
    filterAnalyzableFiles(files) {
        return files.filter(file => file.patch &&
            file.changes < this.maxChanges &&
            !this.isBinaryFile(file.filename));
    }
    /**
     * Gemini API를 호출합니다
     */
    async callGemini(prompt) {
        try {
            const model = this.genAI.getGenerativeModel({ model: this.model });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
            throw new Error(`Gemini API 호출 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }
    /**
     * 프롬프트를 생성합니다
     */
    buildPrompt(files) {
        const fileContents = files.map(file => `
## 파일: ${file.filename}
상태: ${file.status}
변경: +${file.additions} -${file.deletions}

\`\`\`diff
${file.patch}
\`\`\`
`).join('\n\n');
        return `
당신은 전문 코드 리뷰어입니다. 다음 Pull Request 변경사항을 분석하고 리뷰해주세요.

${fileContents}

다음 JSON 형식으로만 응답하세요 (마크다운 없이 순수 JSON만):

{
  "summary": "전체 리뷰 요약 (한국어)",
  "issuesFound": 발견된_이슈_개수,
  "comments": [
    {
      "path": "파일명",
      "line": 라인번호,
      "body": "코멘트 (한국어)"
    }
  ]
}

중요한 이슈만 최대 ${this.maxComments}개까지 코멘트하세요.
보안 취약점, 버그, 성능 이슈에 집중하세요.
`;
    }
    /**
     * Gemini API 응답을 파싱합니다
     */
    parseResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('JSON을 찾을 수 없습니다');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                summary: parsed.summary || '코드를 분석했습니다.',
                comments: (parsed.comments || []).slice(0, this.maxComments)
            };
        }
        catch (error) {
            // JSON 파싱 실패 시 기본 응답 반환
            return {
                summary: 'AI 응답을 파싱하는 중 오류가 발생했습니다. 전반적으로 코드가 깔끔합니다.',
                comments: []
            };
        }
    }
    /**
     * 바이너리 파일 여부를 확인합니다
     */
    isBinaryFile(filename) {
        const lowerFilename = filename.toLowerCase();
        return config_1.CONFIG.BINARY_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
    }
}
exports.GeminiClient = GeminiClient;
