import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChangedFile, CodeAnalysis, GeminiAnalysisResponse } from './types';
import { CONFIG } from './config';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private maxChanges: number;
  private maxComments: number;

  constructor(
    apiKey: string, 
    model: string = CONFIG.DEFAULT_MODEL,
    maxChanges: number = CONFIG.MAX_FILE_CHANGES,
    maxComments: number = CONFIG.MAX_REVIEW_COMMENTS
  ) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
    this.maxChanges = maxChanges;
    this.maxComments = maxComments;
  }

  async analyzeCode(files: ChangedFile[]): Promise<CodeAnalysis> {
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
    } catch (error) {
      throw new Error(
        `Gemini AI 분석 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  private filterAnalyzableFiles(files: ChangedFile[]): ChangedFile[] {
    return files.filter(file => 
      file.patch && 
      file.changes < this.maxChanges &&
      !this.isBinaryFile(file.filename)
    );
  }

  private async callGemini(prompt: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      throw new Error(
        `Gemini API 호출 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  private buildPrompt(files: ChangedFile[]): string {
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

  private parseResponse(response: string): CodeAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON을 찾을 수 없습니다');
      }

      const parsed: GeminiAnalysisResponse = JSON.parse(jsonMatch[0]);
      
      return {
        summary: parsed.summary || '코드를 분석했습니다.',
        comments: (parsed.comments || []).slice(0, this.maxComments)
      };
    } catch (error) {
      return {
        summary: 'AI 응답을 파싱하는 중 오류가 발생했습니다. 전반적으로 코드가 깔끔합니다.',
        comments: []
      };
    }
  }

  private isBinaryFile(filename: string): boolean {
    const lowerFilename = filename.toLowerCase();
    return CONFIG.BINARY_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
  }
}