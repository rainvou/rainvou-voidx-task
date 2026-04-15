---
name: voidx-init
description: AI Task Dashboard 프로젝트 초기화. Dashboard URL과 API Key를 설정합니다.
---

# /voidx-init — 프로젝트 초기화

이 skill은 고객 프로젝트에서 AI Task Dashboard 연결을 설정합니다.

## 사전 체크

먼저 `.voidx/config.json` 파일이 이미 존재하는지 확인합니다.

**이미 존재하는 경우 (다른 팀원이 init 완료):**
- "이미 초기화된 프로젝트입니다." 안내
- `.voidx/config.local.json`에 API Key만 설정하면 됩니다.
- → **Step 7 (API Key 로컬 설정)** 으로 바로 이동

**존재하지 않는 경우:**
- → Step 1부터 진행

## 실행 순서

**중요: 각 Step은 반드시 AskUserQuestion 도구를 사용하여 한 번에 하나씩 질문합니다. 모든 질문을 한꺼번에 묻지 마세요.**

### Step 1: Dashboard URL 입력

AskUserQuestion 도구로 질문합니다:
- question: "Dashboard URL을 입력해주세요"
- options: `http://localhost:3000` (로컬 개발 환경 기본 주소), `http://localhost:8080` (대체 로컬 포트)

사용자 응답을 `DASHBOARD_URL`로 저장합니다.

### Step 2: API Key 입력

AskUserQuestion 도구로 질문합니다:
- question: "Dashboard API Key를 입력해주세요"
- options: `dev-api-key` (개발용 기본 API Key), `test-api-key` (테스트용 API Key)

사용자 응답을 `API_KEY`로 저장합니다.

### Step 3: 프로젝트 별칭 입력

먼저 Bash tool로 `basename $(pwd)`를 실행하여 현재 폴더명을 `FOLDER_NAME`으로 가져옵니다.

AskUserQuestion 도구로 질문합니다:
- question: "대시보드에 표시될 프로젝트 별칭을 입력해주세요"
- options: `{FOLDER_NAME}` (현재 폴더명 사용), `{FOLDER_NAME} 프로젝트` (폴더명 + 프로젝트)

사용자 응답을 `PROJECT_ALIAS`로 저장합니다.

### Step 4: 초기화 사용자 감지

Bash tool로 `git config user.name`을 실행하여 현재 개발자의 이름을 가져옵니다.

### Step 5: 프로젝트 등록

먼저 GitHub URL을 가져옵니다:
```bash
GITHUB_URL=$(git remote get-url origin 2>/dev/null | sed 's/git@github[^:]*:/https:\/\/github.com\//' | sed 's/\.git$//')
```

Dashboard API에 프로젝트를 등록합니다:

```bash
curl -s -X POST "${DASHBOARD_URL}/api/projects" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"${PROJECT_ALIAS}\", \"description\": \"repo: ${FOLDER_NAME}\", \"createdBy\": \"${GIT_USER}\", \"key\": \"${FOLDER_NAME}\", \"githubUrl\": \"${GITHUB_URL}\"}"
```

응답에서 `project_id`와 `key`를 추출합니다.

GitHub URL이 등록되지 않았으면 별도로 저장합니다:
```bash
curl -s -X PATCH "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/schedule" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"githubUrl\": \"${GITHUB_URL}\"}"
```

### Step 5.5: Maintenance&HotFix Epic 기본 생성

프로젝트에 기본 Epic을 생성합니다. 운영/핫픽스 작업용 Epic은 항상 필요합니다:
```bash
curl -s -X POST "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/epics" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Maintenance&HotFix", "priority": 5, "createdBy": "${GIT_USER}"}'
```

### Step 6: .voidx/config.json 생성 (Git 커밋 대상)

이 파일은 **Git에 커밋합니다** — 팀원 공유용.

```json
{
  "dashboardUrl": "<DASHBOARD_URL>",
  "projectId": "<API 응답에서 추출>",
  "projectKey": "<API 응답 key>",
  "projectAlias": "<PROJECT_ALIAS>",
  "repoName": "<FOLDER_NAME>"
}
```

Write tool로 `.voidx/config.json` 파일을 생성합니다.

**주의: API Key는 이 파일에 넣지 않습니다.**

### Step 7: .voidx/config.local.json 생성 (Git 제외 대상)

이 파일은 **Git에 커밋하지 않습니다** — 개인 API Key 보관용.

```json
{
  "apiKey": "<API_KEY>"
}
```

Write tool로 `.voidx/config.local.json` 파일을 생성합니다.

### Step 8: Risk Policy 다운로드

Dashboard에서 risk policy 규칙을 다운로드하여 `.voidx/risk-policy.json`에 저장합니다.

```bash
curl -s "${DASHBOARD_URL}/api/risk-policy" \
  -H "Authorization: Bearer ${API_KEY}" > .voidx/risk-policy.json
```

이 파일은 `/voidx-pm`이 코드 검증 시 사용합니다. gitignore 대상 (PM 실행마다 최신으로 재생성).

### Step 8.5: AI 분석 도구 설치

AskUserQuestion 도구로 질문합니다:
- question: "AI 브레인스토밍/분석 도구를 설치하시겠습니까? (나중에 /voidx-pm 실행 시 요구사항 분석에 활용됩니다)"
- options: `BMAD + Superpowers 모두 설치`, `BMAD만 설치`, `Superpowers만 설치`, `설치하지 않음`

선택에 따라 아래를 실행합니다.

**BMAD-METHOD 설치 (비대화형):**

`--directory`와 모든 config 옵션을 명시하면 프롬프트 없이 자동 설치됩니다:

**신규 설치:**
```bash
npx bmad-method install \
  --directory "$(pwd)" \
  --modules bmm,bmb,cis,gds,tea \
  --tools claude-code \
  --user-name voidx \
  --communication-language korean \
  --document-output-language korean \
  --output-folder _bmad-output \
  -y
```

**기존 설치가 있을 때 (전체 모듈 추가):**
```bash
npx bmad-method install \
  --directory "$(pwd)" \
  --action update \
  --modules bmm,bmb,cis,gds,tea \
  --tools claude-code \
  --user-name voidx \
  --communication-language korean \
  --document-output-language korean \
  --output-folder _bmad-output \
  -y
```

**핵심:** `--directory "$(pwd)"`가 반드시 있어야 디렉토리 확인 프롬프트를 건너뜁니다. 기존 설치가 감지되면 `--action update`를 사용해야 전체 모듈이 설치됩니다.

설치 실패 시, 사용자에게 직접 실행을 안내합니다:
```
BMAD 자동 설치에 실패했습니다. 터미널에서 직접 설치해주세요:
! npx bmad-method install
```

설치 확인: `.claude/skills/bmad-brainstorming/` 디렉토리 존재 여부 체크.

**Superpowers 설치:**
```bash
claude plugins add superpowers
```
설치 확인: `claude plugins list`로 superpowers가 보이는지 체크.
실패 시 대안:
```bash
git clone https://github.com/obra/superpowers.git .superpowers-tmp
mkdir -p .claude/plugins/superpowers
cp -r .superpowers-tmp/skills/* .claude/plugins/superpowers/
rm -rf .superpowers-tmp
```

설치 결과를 `.voidx/config.json`에 기록합니다:
```json
{
  "dashboardUrl": "...",
  "projectId": "...",
  "analysisTools": {
    "bmad": true,
    "superpowers": true
  }
}
```

### Step 9: .gitignore 업데이트

`.gitignore`에 다음을 추가합니다:
```
.voidx/config.local.json
.voidx/risk-policy.json
```

**주의: `.voidx/config.json`은 gitignore하지 않습니다 — 커밋 대상.**

### Step 9.1: CLAUDE.md에 Dashboard 연동 규칙 추가

CLAUDE.md 파일이 없으면 생성하고, 있으면 하단에 추가합니다. 이 규칙은 `/voidx-pm`을 사용하지 않는 **일반 작업 요청에서도 Dashboard에 Task가 자동 등록**되도록 합니다.

아래 내용을 CLAUDE.md에 추가합니다:

```markdown
## voidx Dashboard 연동

이 프로젝트는 AI Task Dashboard에 연결되어 있습니다.

### voidx 스킬 안내
- `/voidx-pm` — 신규 기능 개발 (brainstorming → PRD → 설계 → 구현)
- `/voidx-task` — 기존 Epic에 Task 추가하여 빠르게 구현
- `/voidx-hotfix` — Maintenance&HotFix 작업
- `/voidx-status` — 프로젝트 상태 조회

### 스킬 없이 일반 작업 요청 시

/voidx 스킬을 사용하지 않고 일반적으로 작업을 요청받은 경우, `/voidx-hotfix`와 동일한 흐름으로 처리합니다:

1. `.voidx/config.json`과 `.voidx/config.local.json`을 읽어 DASHBOARD_URL, API_KEY, PROJECT_ID를 파악합니다
2. "Maintenance&HotFix" Epic을 조회합니다. 없으면 생성합니다:
   ```
   curl -s -X POST "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/epics" \
     -H "Authorization: Bearer ${API_KEY}" \
     -H "Content-Type: application/json" \
     -d '{"title": "Maintenance&HotFix", "priority": 3}'
   ```
3. Task를 등록합니다:
   ```
   curl -s -X POST "${DASHBOARD_URL}/api/epics/${EPIC_ID}/tasks" \
     -H "Authorization: Bearer ${API_KEY}" \
     -H "Content-Type: application/json" \
     -d '{"title": "작업 제목", "description": "작업 설명", "priority": 3}'
   ```
4. Task 상태를 업데이트합니다: start → complete → done
5. 커밋마다 commit 로그를 등록합니다:
   ```
   curl -s -X POST "${DASHBOARD_URL}/api/tasks/${TASK_ID}/commits" \
     -H "Authorization: Bearer ${API_KEY}" \
     -H "Content-Type: application/json" \
     -d '{"hash": "커밋해시", "url": "커밋URL", "message": "커밋메시지"}'
   ```
```

커밋 대상에 CLAUDE.md도 포함합니다.

### Step 9.5: Git 커밋 + 반영

config.json과 .gitignore를 main 브랜치에 반영합니다.

**방법 1 — main에 직접 커밋 (기본):**
```bash
git add .voidx/config.json .gitignore CLAUDE.md
git commit -m "chore: add voidx dashboard config"
git push origin main
```

**방법 2 — PR 방식 (main 브랜치 보호 규칙이 있는 경우):**
```bash
# 1. init 브랜치 생성 + 커밋
git checkout -b voidx/init
git add .voidx/config.json .gitignore CLAUDE.md
git commit -m "chore: add voidx dashboard config"
git push -u origin voidx/init

# 2. PR 생성 + 머지
gh pr create --title "chore: add voidx dashboard config" --body "AI Task Dashboard 초기 설정 파일 추가" --base main
gh pr merge --merge --delete-branch

# 3. main으로 복귀
git checkout main
git pull
```

**판단 기준:**
- 먼저 방법 1로 `git push origin main`을 시도합니다.
- push가 거부되면(branch protection) 방법 2로 전환합니다.
- `gh` CLI가 없거나 PR이 실패하면 사용자에게 수동 머지를 안내합니다.

### Step 10: 완료 안내

```
✅ voidx 초기화 완료!

Dashboard: <DASHBOARD_URL>
Project: <PROJECT_ALIAS> (<PROJECT_KEY>)
ID: <PROJECT_ID>

📁 Git 커밋 대상: .voidx/config.json (팀원 공유)
🔒 개인 보관: .voidx/config.local.json (API Key)

다음 단계:
- /voidx-pm 으로 PM Agent를 실행하세요
- /voidx-status 로 프로젝트 상태를 확인하세요

팀원이 clone 후 /voidx-init 실행 시:
- config.json이 이미 있으므로 API Key만 설정합니다
```
