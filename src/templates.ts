import type { ChangedFile, CodeAnalysis } from './types';

export function createReviewSummary(files: ChangedFile[], analysis: CodeAnalysis): string {
  return `
## Revisor AI Code Review

### 분석 결과
- **변경된 파일**: ${files.length}개
- **발견된 이슈**: ${analysis.comments.length}개

### 요약
${analysis.summary}

${analysis.comments.length > 0 ? '### 세부 사항\n아래 라인별 코멘트를 확인하세요.' : ''}

---
*Powered by Google Gemini AI*
  `.trim();
}

export function buildCodeReviewPrompt(files: ChangedFile[], maxComments: number): string {
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

중요한 이슈만 최대 ${maxComments}개까지 코멘트하세요.
보안 취약점, 버그, 성능 이슈에 집중하세요.
`;
}

export const MESSAGES = {
  NO_ANALYZABLE_FILES: '분석할 수 있는 파일이 없습니다. (바이너리 파일이거나 변경량이 너무 큽니다)',
  DEFAULT_ANALYSIS_SUMMARY: '코드를 분석했습니다.',
  PARSING_ERROR_SUMMARY: 'AI 응답을 파싱하는 중 오류가 발생했습니다. 전반적으로 코드가 깔끔합니다.'
} as const;

