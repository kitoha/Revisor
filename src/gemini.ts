import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ChangedFile, CodeAnalysis, GeminiAnalysisResponse } from './types';
import { CONFIG } from './config';
import { buildCodeReviewPrompt, MESSAGES } from './templates';

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
        summary: MESSAGES.NO_ANALYZABLE_FILES,
        comments: []
      };
    }

    try {
      const prompt = buildCodeReviewPrompt(analyzableFiles, this.maxComments);
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

  private parseResponse(response: string): CodeAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON을 찾을 수 없습니다');
      }

      const parsed: GeminiAnalysisResponse = JSON.parse(jsonMatch[0]);
      
      return {
        summary: parsed.summary || MESSAGES.DEFAULT_ANALYSIS_SUMMARY,
        comments: (parsed.comments || []).slice(0, this.maxComments)
      };
    } catch (error) {
      return {
        summary: MESSAGES.PARSING_ERROR_SUMMARY,
        comments: []
      };
    }
  }

  private isBinaryFile(filename: string): boolean {
    const lowerFilename = filename.toLowerCase();
    return CONFIG.BINARY_EXTENSIONS.some(ext => lowerFilename.endsWith(ext));
  }
}