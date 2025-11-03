import * as github from '@actions/github';

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

  async getChangedFiles() {
    const { data } = await this.octokit.rest.pulls.listFiles({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
      per_page: 100
    });
    
    return data;
  }

  async createReview(summary: string, comments: any[]) {
    await this.octokit.rest.pulls.createReview({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.prNumber,
      body: summary,
      event: 'COMMENT',
      comments: comments
    });
  }
}