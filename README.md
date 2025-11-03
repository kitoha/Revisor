## Revisor AI Code Review

[![GitHub](https://img.shields.io/badge/GitHub-kitoha%2FRevisor-blue?logo=github)](https://github.com/kitoha/Revisor)
[![Powered by](https://img.shields.io/badge/Powered%20by-Google%20Gemini-orange)](https://ai.google.dev/)

Gemini 기반으로 Pull Request를 자동 분석하고, 요약과 라인별 리뷰 코멘트를 남기는 GitHub Action입니다.

 ### 미리보기
 ![Revisor review example](https://github.com/user-attachments/assets/286d7d25-730f-4930-afb3-eb9adde2b7cd)

### 주요 기능
- **AI 리뷰 요약 생성**: 변경 파일 수, 발견된 이슈 수와 함께 한국어 요약 제공
- **라인별 코멘트 작성**: 최대 코멘트 개수 내에서 중요한 변경점에 대해 구체적인 피드백 생성
- **바이너리/대용량 변경 필터링**: 분석 불가 파일과 과도한 변경을 자동 제외
- **모델/제한값 설정**: 모델명, 파일 변경 한도, 코멘트 개수 등을 입력으로 제어

### 동작 방식
1. PR 이벤트에서 변경 파일 목록을 수집합니다.
2. 분석 가능한 파일만 추려 Gemini에게 프롬프트를 전달합니다.
3. Gemini가 반환한 JSON을 안전하게 파싱합니다.
4. 요약 코멘트와 라인별 리뷰 코멘트를 PR에 생성합니다.

---

### 빠른 시작
`GEMINI_API_KEY`를 레포지토리 시크릿에 저장한 뒤, 다음과 같이 워크플로우를 추가하세요.

```yaml
name: Revisor

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run Revisor
        uses: kitoha/revisor@v1
        with:
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
          # github-token은 기본값으로 GitHub가 제공하는 토큰을 사용합니다.
          # github-token: ${{ secrets.GITHUB_TOKEN }}
          # 선택 입력값 예시
          # gemini-model: gemini-2.5-flash
          # max-changes: 500
          # max-comments: 3
```

로컬 리포에서 이 액션을 테스트하려면, 저장소 루트에서 다음과 같이 사용할 수 있습니다.

```yaml
- name: Run Revisor (local)
  uses: ./
  with:
    gemini-api-key: ${{ secrets.GEMINI_API_KEY }}
```

---

### 입력값
- **gemini-api-key (required)**: Gemini API Key
- **github-token (required, default: `${{ github.token }}`)**: Octokit 인증에 사용될 GitHub Token
- **gemini-model (optional, default: `gemini-2.5-flash`)**: 사용할 Gemini 모델명
- **max-changes (optional, default: `500`)**: 파일당 허용할 최대 변경(line) 수. 초과 시 해당 파일은 제외
- **max-comments (optional, default: `3`)**: PR에 남길 최대 리뷰 코멘트 개수

### 필요한 권한 (Permissions)
- **pull-requests: write**: 리뷰 생성 권한
- **contents: read**: 변경 파일 조회 권한

### 지원 이벤트
- `pull_request` 이벤트에서만 동작합니다. 다른 이벤트에서 실행 시 실패합니다.

---

### 설정과 기본값
- 기본 모델: `gemini-2.5-flash`
- 파일 변경 한도: `500` lines (초과 시 제외)
- 최대 리뷰 코멘트: `3`개
- 바이너리/에셋 파일은 자동 제외: `.png, .jpg, .svg, .pdf, .zip, .woff, ...`
- 리뷰 이벤트: GitHub Review의 `COMMENT` 모드로 리뷰를 생성합니다.

### 제한 사항 및 주의
- Gemini 응답이 JSON 규격을 벗어나면, 안전하게 처리하여 기본 요약만 남길 수 있습니다.
- 거대 PR 또는 바이너리 위주 변경은 자동으로 분석에서 제외될 수 있습니다.

### 라이선스
![License](https://img.shields.io/badge/license-MIT-green)




