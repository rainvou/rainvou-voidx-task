---
name: voidx-pm
description: PM Agent — BMAD로 분석/기획/설계, Superpowers로 구현. Dashboard 실시간 연동 + Git 브랜치 전략.
---

# /voidx-pm — PM Agent

AI PM Agent입니다. BMAD로 분석·기획·설계하고, Superpowers로 구현·리뷰합니다.

## 사전 조건

- `.voidx/config.json`이 존재해야 합니다. 없으면 `/voidx-init`을 먼저 실행하세요.

## 전체 흐름 개요

```
Phase 1: 분석 (BMAD)      → 브레인스토밍, Product Brief
Phase 2: 기획 (BMAD)      → PRD 작성, PRD 검증, UX 디자인
Phase 3: 설계 (BMAD)      → 아키텍처, Epic/Story 생성, 준비도 검증
핸드오프: BMAD → Superpowers → 스프린트 계획
Phase 4: 구현 (Superpowers) → 스토리별 구현 설계, TDD, 코드 리뷰, Git PR
완료                       → 회고 (BMAD)
```

## 실행 흐름

### Step 1: 설정 로드

`.voidx/config.json`을 Read tool로 읽어서 `dashboardUrl`, `projectId`를 파악합니다.
`.voidx/config.local.json`을 Read tool로 읽어서 `apiKey`를 파악합니다.

이후 모든 API 호출에서 사용:
- `DASHBOARD_URL` = dashboardUrl
- `API_KEY` = apiKey
- `PROJECT_ID` = projectId

### Step 1.5: 현재 사용자 감지

Bash tool로 `git config user.name`을 실행하여 `GIT_USER`를 가져옵니다.

### Step 1.6: 프로젝트 일정 등록

AskUserQuestion 도구로 질문합니다:
- question: "프로젝트 일정을 입력해주세요 (선택사항, 건너뛰기 가능)"

3가지 일정을 순서대로 질문합니다:

1. **개발 완료 목표일** — "개발 완료 목표일을 입력해주세요 (예: 2026-05-01)"
   - options: `2주 후`, `4주 후`, `직접 입력`
2. **QA 완료 목표일** — "QA 완료 목표일을 입력해주세요"
   - options: `개발완료 1주 후`, `개발완료 2주 후`, `직접 입력`
3. **오픈 목표일** — "오픈(런칭) 목표일을 입력해주세요"
   - options: `QA완료 1주 후`, `QA완료 2주 후`, `직접 입력`

GitHub URL도 함께 가져옵니다:
```bash
GITHUB_URL=$(git remote get-url origin 2>/dev/null | sed 's/git@github[^:]*:/https:\/\/github.com\//' | sed 's/\.git$//')
```

입력된 일정 + GitHub URL을 Dashboard API로 저장합니다:
```bash
curl -s -X PATCH "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/schedule" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "devDeadline": "2026-05-01",
    "qaDeadline": "2026-05-15",
    "launchDate": "2026-05-22",
    "githubUrl": "${GITHUB_URL}"
  }'
```

이 일정은 이후 Phase에서 지연 여부를 판단하는 기준으로 사용됩니다.

### Step 1.7: 분석 도구 선택 (매번 필수)

**⚠️ 이 단계는 /voidx-pm 실행 시 매번 반드시 수행합니다. 절대 건너뛰지 마세요.**

AskUserQuestion 도구로 질문합니다:
- question: "요구사항 분석에 사용할 도구를 선택해주세요"
- options:
  1. `BMAD 분석 (권장)` — BMAD 프레임워크의 체계적 분석·기획·설계 (Phase 1~3)
  2. `Superpowers 분석` — Superpowers brainstorming → writing-plans
  3. `직접 분석` — Claude AI가 직접 PRD 작성

**선택별 Phase 분기:**
- **BMAD 선택** → Phase 1~3 전체 수행
- **Superpowers 선택** → `superpowers:brainstorming` → `superpowers:writing-plans` 호출 후 Phase 3의 Dashboard 등록으로 이동
- **직접 분석** → Claude가 PRD 직접 작성 후 Phase 3의 Dashboard 등록으로 이동

**모든 선택지에서 PRD가 생성되어야 합니다.** PRD 없이 구현 단계로 넘어가지 마세요.

---

## Phase 1: 분석 (BMAD)

**이 Phase는 Step 1.7에서 "BMAD 분석"을 선택한 경우에만 수행합니다.**

### Step 2: 브레인스토밍 + Product Brief

1. Skill tool로 `bmad-help`를 호출하여 현재 프로젝트 상태를 확인합니다.
2. Skill tool로 `bmad-brainstorming`을 호출하여 아이디어를 정리합니다.
3. Skill tool로 `bmad-create-product-brief`를 호출하여 Product Brief를 작성합니다.

결과물: `_bmad-output/planning-artifacts/product-brief.md`

---

## Phase 2: 기획 (BMAD)

### Step 3: PRD + 검증

1. Skill tool로 `bmad-create-prd`를 호출하여 PRD를 작성합니다. **(필수)**
2. Skill tool로 `bmad-validate-prd`를 호출하여 PRD를 검증합니다.
3. (UI 프로젝트일 경우) Skill tool로 `bmad-create-ux-design`을 호출합니다.

결과물: `_bmad-output/planning-artifacts/prd.md`

**⚠️ PRD 저장 (필수 — 절대 건너뛰지 마세요):**
PRD가 생성되면 **즉시** 아래를 수행합니다:
1. PRD 파일 경로를 확인합니다 (BMAD: `_bmad-output/planning-artifacts/prd.md`, Superpowers: `docs/superpowers/specs/*.md`, 직접 작성: `docs/prd/*.md`)
2. Read tool로 PRD 파일 전체 내용을 읽어서 `PRD_CONTENT` 변수에 저장합니다
3. PRD 파일명을 `PRD_FILENAME` 변수에 저장합니다

```
PRD_CONTENT = (PRD 파일 전체 내용)
PRD_FILENAME = "prd.md"
```

**이 변수들은 Step 5에서 모든 Epic에 첨부할 때 사용됩니다. PRD_CONTENT가 비어있으면 Step 5 진행을 중단하고 PRD를 다시 확인하세요.**

---

## Phase 3: 설계 (BMAD)

### Step 4: 아키텍처 + Epic/Story 생성 + 준비도 검증

1. Skill tool로 `bmad-create-architecture`를 호출하여 아키텍처 문서를 작성합니다. **(필수)**
2. Skill tool로 `bmad-create-epics-and-stories`를 호출하여 Epic과 Story를 생성합니다. **(필수)**
3. Skill tool로 `bmad-check-implementation-readiness`를 호출하여 준비도를 검증합니다. **(PASS 필요)**

**Readiness Report가 PASS가 아니면 Phase 2~3을 보완합니다.**

---

## 핸드오프: BMAD → Dashboard + Superpowers

### Step 5: Dashboard 등록 + 스프린트 계획

#### 5-0. PRD 첨부 사전 검증 (HARD GATE)

**⛔ 아래 조건이 충족되지 않으면 Epic 등록을 진행하지 마세요:**

1. `PRD_CONTENT` 변수가 비어있지 않은지 확인합니다
2. 비어있으면 아래 경로에서 PRD 파일을 찾아 읽습니다:
   - `_bmad-output/planning-artifacts/prd.md`
   - `docs/prd/*.md`
   - `docs/superpowers/specs/*.md`
3. 그래도 없으면 사용자에게 "PRD가 생성되지 않았습니다. Phase 2를 먼저 완료해주세요." 안내 후 중단합니다

```bash
# PRD 파일 탐색 (우선순위 순)
PRD_FILE=$(ls _bmad-output/planning-artifacts/prd.md 2>/dev/null || ls docs/prd/*.md 2>/dev/null | head -1 || ls docs/superpowers/specs/*.md 2>/dev/null | head -1 || echo "")
```

PRD_FILE이 확인되면 Read tool로 읽어서 `PRD_CONTENT`에 저장합니다.

#### 5-1. Dashboard에 Epic/Task 등록

BMAD에서 생성된 Epic/Story를 Dashboard API에 등록합니다.

**Epic 생성 — 모든 Epic에 PRD를 반드시 첨부합니다:**
```bash
# ⚠️ prdContent와 prdFilename이 반드시 포함되어야 합니다
curl -s -X POST "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/epics" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "${EPIC_TITLE}",
    "priority": 1,
    "createdBy": "${GIT_USER}",
    "prdFilename": "${PRD_FILENAME}",
    "prdContent": "${PRD_CONTENT}"
  }'
```
- **prdContent가 빈 문자열이면 API 호출을 중단하고 PRD 파일을 다시 확인하세요**
- 응답에서 `data.id`를 EPIC_ID로 저장합니다

**Epic 생성 후 검증:**
각 Epic 생성 응답에서 `data.prdContent`가 null이 아닌지 확인합니다. null이면 PATCH로 재첨부합니다:
```bash
curl -s -X PATCH "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/epics/${EPIC_ID}/prd" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"prdContent": "${PRD_CONTENT}", "prdFilename": "${PRD_FILENAME}"}'
```

**Agent 배정:**
```bash
curl -s -X POST "${DASHBOARD_URL}/api/agents/find-or-create" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "FE-1", "role": "FE"}'
```

**Task 생성 (상세 description 필수 + Agent 배정):**
```bash
curl -s -X POST "${DASHBOARD_URL}/api/epics/${EPIC_ID}/tasks" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "${TASK_TITLE}",
    "description": "구체적 구현 사항, 기술 스택, 수용 기준",
    "priority": 1,
    "assigneeId": "${AGENT_ID}"
  }'
```
응답에서 `data.id`와 `data.taskKey`를 저장합니다.

#### 5-2. Epic 브랜치 생성

```bash
git checkout main && git pull origin main
git checkout -b feature/epic-${EPIC_NUMBER}
git push -u origin feature/epic-${EPIC_NUMBER}
```

#### 5-3. 스프린트 계획

Skill tool로 `bmad-sprint-planning`을 호출하여 스프린트 계획을 수립합니다.

사용자에게 계획을 제시하고 **승인을 받은 후** Phase 4로 진행합니다.

---

## Phase 4: 구현 (Superpowers) — Task별 반복

### Step 6: Task 구현 사이클

**Git 브랜치 구조 — 항상 main에서 분기:**
```
main (항상 여기서 시작)
 ├─ feature/epic-1/PROJ-1   ← main에서 직접 분기 → PR → main merge
 ├─ feature/epic-1/PROJ-2   ← main에서 직접 분기 → PR → main merge
 └─ feature/epic-1/PROJ-3   ← main에서 직접 분기 → PR → main merge
```

각 Task마다 아래 A~J를 반복합니다:

**A. Story 파일 생성 (BMAD):**
Skill tool로 `bmad-create-story`를 호출하여 스토리 스펙 파일을 생성합니다.
결과물: `_bmad-output/implementation-artifacts/{task-key}-story.md`

**B. 구현 설계 (Superpowers):**
Skill tool로 `superpowers:brainstorming`을 호출하여 구현 설계를 수행합니다.
이어서 Skill tool로 `superpowers:writing-plans`를 호출하여 구현 계획을 작성합니다.

**C. main에서 Task 브랜치 생성 + Dashboard 상태:**
```bash
# 항상 main에서 시작
git checkout main
git pull origin main
git checkout -b feature/epic-${EPIC_NUMBER}/${TASK_KEY}

curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/start" \
  -H "Authorization: Bearer ${API_KEY}"
```

**D. TDD 구현 (Superpowers):**
Skill tool로 `superpowers:test-driven-development`를 호출합니다.
- RED: 테스트 작성 (실패)
- GREEN: 최소 구현 (통과)
- REFACTOR: 리팩토링

**E. Summary 업데이트:**
```bash
curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/summary" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"summary": "구현 요약", "description": "변경 파일, 주요 변경"}'
```

**F. Risk Policy 스캔:**
1. `curl -s "${DASHBOARD_URL}/api/risk-policy" -H "Authorization: Bearer ${API_KEY}" > .voidx/risk-policy.json`
2. `git diff --name-only feature/epic-${EPIC_NUMBER}`
3. rules 패턴으로 grep 검사 → 위반 시 자동 수정 + Dashboard 보고
4. **위반 모두 해결 후 다음 단계로**

**G. 완료 검증 (Superpowers):**
Skill tool로 `superpowers:verification-before-completion`을 호출합니다.
증거 기반으로 구현이 완료되었는지 확인합니다.

**H. 커밋 + 푸시 + commit URL 저장 + PR:**
```bash
git add -A
git commit -m "feat(${TASK_KEY}): ${TASK_TITLE}"
git push -u origin feature/epic-${EPIC_NUMBER}/${TASK_KEY}
```

커밋 후 commit 정보를 Dashboard에 추가합니다 (복수 커밋 지원):
```bash
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)
REPO_URL=$(git remote get-url origin | sed 's/git@github[^:]*:/https:\/\/github.com\//' | sed 's/\.git$//')
COMMIT_URL="${REPO_URL}/commit/${COMMIT_HASH}"

curl -s -X POST "${DASHBOARD_URL}/api/tasks/${TASK_ID}/commits" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"hash\": \"${COMMIT_HASH}\", \"url\": \"${COMMIT_URL}\", \"message\": \"${COMMIT_MSG}\"}"
```
**매 커밋마다 이 API를 호출합니다.** 하나의 Task에 여러 커밋이 있을 수 있습니다.
```

PR 생성 → **main 브랜치로:**
```bash
gh pr create \
  --title "feat(${TASK_KEY}): ${TASK_TITLE}" \
  --body "## Summary\n- Task: ${TASK_KEY}\n- ${TASK_DESCRIPTION}" \
  --base main
```

**I. 코드 리뷰 (Superpowers):**
Skill tool로 `superpowers:requesting-code-review`를 호출합니다.
리뷰 지적 사항 있으면 수정 → 재커밋 → 재푸시.

사용자에게 PR 링크를 보여주고 머지 여부를 확인합니다.
승인하면:
```bash
gh pr merge --merge --delete-branch
```

**J. main으로 복귀 + pull:**
```bash
git checkout main
git pull origin main
```

**J. Dashboard 상태 완료:**
```bash
curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/complete" \
  -H "Authorization: Bearer ${API_KEY}"
curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/done" \
  -H "Authorization: Bearer ${API_KEY}"
```

### Step 6.5: 병렬 실행 (선택)

독립적인 Task들은 **Agent 도구를 하나의 메시지에 여러 개 호출하여 병렬 실행**합니다.

```
Agent({
  description: "FE-1: UI 컴포넌트",
  isolation: "worktree",
  prompt: "Step 6의 A~J 전체 절차를 포함한 자체 완결 프롬프트..."
})

Agent({
  description: "BE-1: API 구현",
  isolation: "worktree",
  prompt: "..."
})
```

**병렬 처리 원칙:**
- 같은 파일을 수정하지 않는 Task만 병렬
- `isolation: "worktree"` 사용 시 Git worktree로 격리
- 에이전트당 5~6개 Task 적정

### Step 6.6: 스프린트 상태 업데이트

Skill tool로 `bmad-sprint-status`를 호출하여 스프린트 진행 상황을 확인합니다.

---

## Step 7: 완료 + 회고

모든 Task가 DONE이 되면 (각 Task PR이 이미 main에 머지된 상태):

Skill tool로 `bmad-retrospective`를 호출하여 회고를 진행합니다.

```
✅ 구현 완료!

📊 대시보드: ${DASHBOARD_URL}
  - Epic N개, Task N개 모두 DONE

🔀 Git:
  - Task PR: N개 머지 (코드 리뷰 통과)
  - Epic PR: main 머지 완료
```

## 주의사항

- **Phase 1~3은 BMAD 스킬 사용**, Phase 4는 **Superpowers 스킬 사용**
- Readiness Report가 PASS가 아니면 구현 단계로 넘어가지 않음
- **⛔ PRD 첨부는 필수입니다.** 모든 Epic 생성 시 `prdContent`를 포함해야 합니다. PRD_CONTENT가 비어있으면 Epic 등록을 중단하세요.
- 각 Task 구현 전후로 반드시 start/complete/done API 호출
- Task ID/taskKey를 잃어버리면 Dashboard 상태 업데이트 불가 — 반드시 기록 유지
- .voidx/config.json 없으면 즉시 /voidx-init 안내
