import type { ChangedFile, CodeAnalysis, ReviewComment } from './types';

export function createReviewSummary(files: ChangedFile[], analysis: CodeAnalysis): string {
  const commentsCount = analysis.comments.length;
  const statusEmoji = commentsCount === 0 ? '✅' : commentsCount <= 2 ? '⚠️' : '🔍';
  
  return `
<div align="center">

## 🤖 Revisor AI Code Review

</div>

---

### 📊 분석 결과

| 항목 | 내용 |
|------|------|
| 📁 변경된 파일 | **${files.length}개** |
| ${statusEmoji} 발견된 이슈 | **${commentsCount}개** |

---

### 📝 리뷰 요약

${analysis.summary}

${analysis.comments.length > 0 ? `
---

### 💬 상세 코멘트

아래 라인별 코멘트에서 자세한 내용을 확인하세요.
` : `
---

### ✨ 추가 코멘트 없음

코드가 깔끔하게 작성되었습니다!
`}

---

<div align="center">

<sub>Powered by 🤖 Google Gemini AI</sub>

</div>
  `.trim();
}

export function formatComment(comment: ReviewComment): ReviewComment {
  const body = comment.body.trim();
  const issueType = detectIssueType(body);
  const emoji = getIssueEmoji(issueType);
  const startsWithEmoji = /^[🔍⚠️🔒🐛⚡💡✨🎨🧹📝]/.test(body);

  if (startsWithEmoji) {
    return {
      ...comment,
      body: formatMarkdown(body)
    };
  }

  const formattedBody = formatMarkdown(body);

  return {
    ...comment,
    body: `${emoji} **${issueType}**\n\n${formattedBody}`
  };
}

function detectIssueType(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('보안') || lowerText.includes('security') || lowerText.includes('취약점') || lowerText.includes('vulnerability')) {
    return '보안 이슈';
  }
  if (lowerText.includes('버그') || lowerText.includes('bug') || lowerText.includes('오류') || lowerText.includes('에러')) {
    return '버그';
  }
  if (lowerText.includes('성능') || lowerText.includes('performance') || lowerText.includes('느림') || lowerText.includes('최적화')) {
    return '성능 이슈';
  }
  if (lowerText.includes('개선') || lowerText.includes('improve') || lowerText.includes('리팩토링') || lowerText.includes('refactor')) {
    return '개선 사항';
  }
  if (lowerText.includes('코드 스타일') || lowerText.includes('스타일') || lowerText.includes('style') || lowerText.includes('포맷')) {
    return '코드 스타일';
  }
  if (lowerText.includes('제거') || lowerText.includes('remove') || lowerText.includes('삭제') || lowerText.includes('delete') || lowerText.includes('정리')) {
    return '정리 필요';
  }
  if (lowerText.includes('문서') || lowerText.includes('document') || lowerText.includes('주석') || lowerText.includes('comment')) {
    return '문서화';
  }
  
  return '검토 필요';
}

function getIssueEmoji(issueType: string): string {
  const emojiMap: Record<string, string> = {
    '보안 이슈': '🔒',
    '버그': '🐛',
    '성능 이슈': '⚡',
    '개선 사항': '💡',
    '코드 스타일': '🎨',
    '정리 필요': '🧹',
    '문서화': '📝',
    '검토 필요': '🔍'
  };
  
  return emojiMap[issueType] || '💬';
}

function formatMarkdown(text: string): string {
  let formatted = text;

  formatted = formatted.replace(/([a-zA-Z0-9_\-/]+\.[a-zA-Z0-9]+)/g, (match, filename) => {
    if (formatted.substring(0, formatted.indexOf(match)).match(/```[\s\S]*$/)) {
      return match;
    }
    return `\`${filename}\``;
  });

  const keywords = ['중요', '주의', '권장', '제안', '문제', '해결'];
  keywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi');
    formatted = formatted.replace(regex, (match) => {
      if (!formatted.includes(`**${match}**`) && !formatted.includes(`*${match}*`)) {
        return `**${match}**`;
      }
      return match;
    });
  });
  
  return formatted.trim();
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
      "body": "코멘트 (한국어, 마크다운 사용 가능, 이모지 포함 가능)"
    }
  ]
}

중요한 이슈만 최대 ${maxComments}개까지 코멘트하세요.
보안 취약점, 버그, 성능 이슈에 집중하세요.

코멘트 작성 시 다음을 고려하세요:
- 마크다운 문법을 활용하여 가독성을 높이세요 (예: **강조**, \`코드\`, 리스트 등)
- 적절한 이모지를 사용하면 더 직관적입니다
- 구체적이고 실행 가능한 제안을 포함하세요
- 코드 예시가 있으면 더 도움이 됩니다
`;
}

export const MESSAGES = {
  NO_ANALYZABLE_FILES: '분석할 수 있는 파일이 없습니다. (바이너리 파일이거나 변경량이 너무 큽니다)',
  DEFAULT_ANALYSIS_SUMMARY: '코드를 분석했습니다.',
  PARSING_ERROR_SUMMARY: 'AI 응답을 파싱하는 중 오류가 발생했습니다. 전반적으로 코드가 깔끔합니다.',
  GET_FILES_ERROR: '변경된 파일을 가져오는 중 오류 발생',
  CREATE_REVIEW_ERROR: '리뷰 작성 중 오류 발생',
  GEMINI_ANALYSIS_ERROR: 'Gemini AI 분석 중 오류 발생',
  GEMINI_API_ERROR: 'Gemini API 호출 실패',
  JSON_PARSE_ERROR: 'JSON을 찾을 수 없습니다',
  UNKNOWN_ERROR: '알 수 없는 오류',
  INVALID_PR_EVENT: '이 액션은 pull_request 이벤트에서만 작동합니다',
  NO_FILES_TO_ANALYZE: '분석할 파일이 없습니다'
} as const;

