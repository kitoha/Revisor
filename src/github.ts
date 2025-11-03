import * as github from '@actions/github';
import type { ChangedFile, ReviewComment } from './types';
import { CONFIG } from './config';

export class GitHubClient {
  private octokit: ReturnType<typeof github.getOctokit>;
  private owner: string;
  private repo: string;
  private prNumber: number;

  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.owner = github.context.repo.owner;
    this.repo = github.context.repo.repo;
    this.prNumber = github.context.issue.number;
  }

  async getChangedFiles(): Promise<ChangedFile[]> {
    try {
      const { data } = await this.octokit.rest.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber,
        per_page: CONFIG.FILES_PER_PAGE
      });
      
      return data as ChangedFile[];
    } catch (error) {
      throw new Error(
        `변경된 파일을 가져오는 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }

  async createReview(summary: string, comments: ReviewComment[]): Promise<void> {
    try {
      await this.octokit.rest.pulls.createReview({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber,
        body: summary,
        event: CONFIG.REVIEW_EVENT,
        comments: comments
      });
    } catch (error) {
      throw new Error(
        `리뷰 작성 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      );
    }
  }
}