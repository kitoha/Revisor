import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHubClient } from './github';

async function run(): Promise<void> {
  try {
    core.info('Revisor AI Code Review 시작!');
    
    const geminiApiKey = core.getInput('gemini-api-key', { required: true });
    const githubToken = core.getInput('github-token', { required: true });
    
    core.info(`API 키 확인 완료`);

    const context = github.context;
    if (!context.payload.pull_request) {
      core.warning('이 액션은 pull_request 이벤트에서만 작동합니다');
      return;
    }
    
    const prNumber = context.payload.pull_request.number;
    core.info(`PR #${prNumber} 리뷰 준비 중...`);

    const githubClient = new GitHubClient(githubToken);
    
    const files = await githubClient.getChangedFiles();
    core.info(`변경된 파일: ${files.length}개`);

    files.forEach((file: { filename: string; additions: number; deletions: number }) => {
      core.info(`  - ${file.filename} (+${file.additions} -${file.deletions})`);
    });
    
    core.info('완료!');
    
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`실패: ${error.message}`);
    }
  }
}

run();