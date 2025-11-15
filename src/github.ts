import * as github from '@actions/github';
import type { ChangedFile, ReviewComment } from './types';
import { CONFIG } from './config';
import { MESSAGES, formatComment } from './templates';

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
      const allFiles: ChangedFile[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data } = await this.octokit.rest.pulls.listFiles({
          owner: this.owner,
          repo: this.repo,
          pull_number: this.prNumber,
          per_page: CONFIG.FILES_PER_PAGE,
          page
        });

        allFiles.push(...(data as ChangedFile[]));
        hasMore = data.length === CONFIG.FILES_PER_PAGE;
        page++;
      }

      return allFiles;
    } catch (error) {
      throw new Error(
        `${MESSAGES.GET_FILES_ERROR}: ${error instanceof Error ? error.message : MESSAGES.UNKNOWN_ERROR}`
      );
    }
  }

  async getExistingReview(): Promise<number | null> {
    try {
      const { data: reviews } = await this.octokit.rest.pulls.listReviews({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber
      });

      const revisorReview = reviews.find(review => 
        review.body && review.body.includes('🤖 Revisor AI Code Review')
      );

      return revisorReview ? revisorReview.id : null;
    } catch (error) {
      return null;
    }
  }

  async deleteReview(reviewId: number): Promise<void> {
    try {
      await this.octokit.rest.pulls.deleteReview({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber,
        review_id: reviewId
      });
    } catch (error) {
    }
  }

  async createReview(summary: string, comments: ReviewComment[]): Promise<void> {
    try {
      const validComments = comments
        .filter(comment => comment.line > 0 && comment.path && comment.body)
        .map(comment => formatComment(comment));

      await this.octokit.rest.pulls.createReview({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber,
        body: summary,
        event: CONFIG.REVIEW_EVENT,
        comments: validComments
      });
    } catch (error) {
      throw new Error(
        `${MESSAGES.CREATE_REVIEW_ERROR}: ${error instanceof Error ? error.message : MESSAGES.UNKNOWN_ERROR}`
      );
    }
  }

  async createOrUpdateReview(summary: string, comments: ReviewComment[]): Promise<void> {
    const existingReviewId = await this.getExistingReview();
    
    if (existingReviewId) {
      await this.deleteReview(existingReviewId);
    }
    
    await this.createReview(summary, comments);
  }
}