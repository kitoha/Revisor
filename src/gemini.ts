import { GoogleGenAI } from '@google/genai';
import type { ChangedFile, CodeAnalysis, GeminiAnalysisResponse } from './types';
import { CONFIG } from './config';
import { buildCodeReviewPrompt, MESSAGES } from './templates';

function createErrorMessage(baseMessage: string, error: unknown): string {
  return `${baseMessage}: ${error instanceof Error ? error.message : MESSAGES.UNKNOWN_ERROR}`;
}

export class GeminiClient {
  private ai: GoogleGenAI;
  private model: string;
  private maxChanges: number;
  private maxComments: number;

  constructor(
    apiKey: string, 
    model: string = CONFIG.DEFAULT_MODEL,
    maxChanges: number = CONFIG.MAX_FILE_CHANGES,
    maxComments: number = CONFIG.MAX_REVIEW_COMMENTS
  ) {
    this.ai = new GoogleGenAI({ apiKey });
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
      throw new Error(createErrorMessage(MESSAGES.GEMINI_ANALYSIS_ERROR, error));
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
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt
      });
      const text = (response as any).text ?? (typeof (response as any).text === 'function' ? (response as any).text() : undefined);
      if (typeof text === 'string') return text;
      if (text && typeof text.then === 'function') return await text;
      throw new Error('응답에서 텍스트를 가져올 수 없습니다');
    } catch (error) {
      throw new Error(createErrorMessage(MESSAGES.GEMINI_API_ERROR, error));
    }
  }

  private parseResponse(response: string): CodeAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(MESSAGES.JSON_PARSE_ERROR);
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