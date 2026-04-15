---
name: voidx-task
description: 기존 Epic에 Task를 추가하거나, 기존 Task(taskKey)를 지정하여 바로 구현합니다.
---

# /voidx-task — 빠른 Task 실행

기존 Epic에 Task를 추가하거나, taskKey로 기존 Task를 바로 구현합니다.

## 사용법

```
/voidx-task                       ← Epic 선택 → 신규 Task 생성 → 구현
/voidx-task PROJ-15 버그 수정해줘    ← 기존 Task를 바로 구현
```

## 사전 조건

- `.voidx/config.json`이 존재해야 합니다. 없으면 `/voidx-init`을 먼저 실행하세요.

## 실행 흐름

### Step 1: 설정 로드

`.voidx/config.json`을 Read tool로 읽어서 `DASHBOARD_URL`, `PROJECT_ID`를 파악합니다.
`.voidx/config.local.json`을 Read tool로 읽어서 `API_KEY`를 파악합니다.

### Step 2: 모드 판단

**인자에 taskKey가 있는 경우 (예: `/voidx-task PROJ-15 ...`):**
→ Step 2-A로 이동 (기존 Task 바로 구현)

**인자가 없거나 taskKey가 없는 경우:**
→ Step 2-B로 이동 (Epic 선택 → 신규 Task 생성)

---

### Step 2-A: 기존 Task 바로 구현

taskKey로 Task를 조회합니다. 전체 Epic의 Task를 순회하여 `taskKey`가 일치하는 Task를 찾습니다:

```bash
# 프로젝트의 Epic 목록
EPICS=$(curl -s "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/epics" \
  -H "Authorization: Bearer ${API_KEY}")
```

각 Epic의 Task를 조회하여 `taskKey`가 일치하는 Task를 찾습니다:
```bash
TASKS=$(curl -s "${DASHBOARD_URL}/api/epics/${EPIC_ID}/tasks" \
  -H "Authorization: Bearer ${API_KEY}")
```

Task를 찾으면 `TASK_ID`, `TASK_KEY`, `EPIC_ID`를 저장하고 **Step 3으로 이동**합니다.
Task를 못 찾으면 "해당 Task를 찾을 수 없습니다" 안내 후 종료합니다.

---

### Step 2-B: Epic 선택 → 신규 Task 생성

Dashboard API에서 현재 프로젝트의 Epic 목록을 조회합니다:
```bash
curl -s "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/epics" \
  -H "Authorization: Bearer ${API_KEY}"
```

AskUserQuestion 도구로 질문합니다:
- question: "어떤 Epic에 Task를 추가하시겠습니까?"
- options: 조회된 Epic 제목 목록 + `신규 Epic 생성 (→ /voidx-pm 전환)`

**"신규 Epic 생성"을 선택한 경우:**
"신규 Epic은 brainstorming이 필요합니다. /voidx-pm 으로 전환합니다."
Skill tool로 `voidx-pm`을 호출하고 종료합니다.

**기존 Epic을 선택한 경우:**
`EPIC_ID`를 저장합니다.

Agent를 배정하고 Task를 생성합니다:
```bash
curl -s -X POST "${DASHBOARD_URL}/api/agents/find-or-create" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "${AGENT_NAME}", "role": "${ROLE}"}'

curl -s -X POST "${DASHBOARD_URL}/api/epics/${EPIC_ID}/tasks" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"title": "${TASK_TITLE}", "description": "구현 사항", "priority": ${PRIORITY}, "assigneeId": "${AGENT_ID}"}'
```

`TASK_ID`와 `TASK_KEY`를 저장합니다.

---

### Step 3: 구현 (Git 브랜치 + 코드 리뷰)

**⚠️ Git 브랜치 규칙 — 항상 main 기준으로 작업합니다:**

```
main (항상 여기서 시작)
 └─ feature/epic-{N}/{TASK_KEY}   ← main에서 직접 분기
```

**A. main에서 시작 + Task 브랜치 생성:**
```bash
# 1. 반드시 main으로 이동 + 최신 pull
git checkout main
git pull origin main

# 2. main에서 Task 브랜치 생성 (epic 브랜치 없이 main에서 직접)
git checkout -b feature/epic-${EPIC_NUMBER}/${TASK_KEY}
```

**B. Dashboard start:**
```bash
curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/start" \
  -H "Authorization: Bearer ${API_KEY}"
```

**C. 코드 구현**

**D. Summary 업데이트**

**E. Risk Policy 스캔**

**F. 커밋 + commits API:**
```bash
git add -A
git commit -m "feat(${TASK_KEY}): ${TASK_TITLE}"

COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)
REPO_URL=$(git remote get-url origin | sed 's/git@github[^:]*:/https:\/\/github.com\//' | sed 's/\.git$//')
curl -s -X POST "${DASHBOARD_URL}/api/tasks/${TASK_ID}/commits" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"hash\":\"${COMMIT_HASH}\",\"url\":\"${REPO_URL}/commit/${COMMIT_HASH}\",\"message\":\"${COMMIT_MSG}\"}"

git push -u origin feature/epic-${EPIC_NUMBER}/${TASK_KEY}
```

**G. PR 생성 → main 브랜치로:**
```bash
gh pr create \
  --title "feat(${TASK_KEY}): ${TASK_TITLE}" \
  --body "## Summary\n- Task: ${TASK_KEY}\n- ${TASK_DESCRIPTION}" \
  --base main
```

**H. 코드 리뷰:**
Skill tool로 `superpowers:requesting-code-review` 호출.
지적 사항 있으면 수정 → 재커밋 → 재푸시.

**I. 사용자 확인 후 PR 머지:**
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

**K. Dashboard 상태 완료:**
```bash
curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/complete" \
  -H "Authorization: Bearer ${API_KEY}"
curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/done" \
  -H "Authorization: Bearer ${API_KEY}"
```

### Step 4: 완료

```
✅ Task 완료!
- Task: ${TASK_KEY} — ${TASK_TITLE}
- Epic: ${EPIC_TITLE}
- 현재 브랜치: main (최신 상태)
📊 대시보드: ${DASHBOARD_URL}
```
