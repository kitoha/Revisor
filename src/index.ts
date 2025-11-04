import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHubClient } from './github';
import { GeminiClient } from './gemini';
import type { ActionInputs } from './types';
import { createReviewSummary, MESSAGES } from './templates';

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed <= 0 ? undefined : parsed;
}

function getInputs(): ActionInputs {
  return {
    geminiApiKey: core.getInput('gemini-api-key', { required: true }),
    githubToken: core.getInput('github-token', { required: true }),
    geminiModel: core.getInput('gemini-model') || 'gemini-2.5-flash',
    maxChanges: parseOptionalNumber(core.getInput('max-changes')),
    maxComments: parseOptionalNumber(core.getInput('max-comments'))
  };
}

function validatePullRequestEvent(): number {
  if (!github.context.payload.pull_request) {
    throw new Error(MESSAGES.INVALID_PR_EVENT);
  }
  return github.context.payload.pull_request.number;
}

async function run(): Promise<void> {
  try {
    core.info('Revisor AI Code Review 시작!');
    
    const inputs = getInputs();
    
    const prNumber = validatePullRequestEvent();
    core.info(`PR #${prNumber} 리뷰 중...`);
    
    const githubClient = new GitHubClient(inputs.githubToken);
    const geminiClient = new GeminiClient(
      inputs.geminiApiKey,
      inputs.geminiModel,
      inputs.maxChanges,
      inputs.maxComments
    );
    
    core.info('변경된 파일 가져오는 중...');
    const files = await githubClient.getChangedFiles();
    core.info(`변경된 파일: ${files.length}개`);
    
    if (files.length === 0) {
      core.info(MESSAGES.NO_FILES_TO_ANALYZE);
      return;
    }
    
    core.info('Gemini AI로 분석 중...');
    const analysis = await geminiClient.analyzeCode(files);
    core.info(`분석 완료! 이슈 ${analysis.comments.length}개 발견`);
    
    const reviewSummary = createReviewSummary(files, analysis);
    core.info('리뷰 작성 중...');
    await githubClient.createReview(reviewSummary, analysis.comments);
    
    core.info('리뷰 완료!');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : MESSAGES.UNKNOWN_ERROR;
    core.setFailed(`실패: ${errorMessage}`);
    throw error;
  }
}

run();