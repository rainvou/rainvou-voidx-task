---
name: voidx-hotfix
description: Maintenance & HotFix 작업. brainstorming 없이 즉시 구현하고 Dashboard에 자동 등록합니다.
---

# /voidx-hotfix — 유지보수 & 핫픽스

Maintenance&HotFix Epic 하위에 Task를 생성하여 즉시 구현합니다.

## 사전 조건

- `.voidx/config.json`이 존재해야 합니다. 없으면 `/voidx-init`을 먼저 실행하세요.

## 실행 흐름

### Step 1: 설정 로드

`.voidx/config.json`을 Read tool로 읽어서 `DASHBOARD_URL`, `PROJECT_ID`를 파악합니다.
`.voidx/config.local.json`을 Read tool로 읽어서 `API_KEY`를 파악합니다.

### Step 2: Maintenance&HotFix Epic 조회/생성

Dashboard API에서 "Maintenance&HotFix" Epic을 찾습니다:
```bash
EPICS=$(curl -s "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/epics" \
  -H "Authorization: Bearer ${API_KEY}")
```

응답에서 `title`이 "Maintenance&HotFix"인 Epic을 찾습니다. 없으면 생성:
```bash
curl -s -X POST "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/epics" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Maintenance&HotFix", "priority": 3}'
```

`EPIC_ID`를 저장합니다.

### Step 3: Task 생성

사용자의 요청을 분석하여 Task를 생성합니다:
```bash
curl -s -X POST "${DASHBOARD_URL}/api/epics/${EPIC_ID}/tasks" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "${TASK_TITLE}",
    "description": "${TASK_DESCRIPTION}",
    "priority": ${PRIORITY}
  }'
```

응답에서 `data.id`와 `data.taskKey`를 저장합니다.

### Step 4: 구현

**A. main에서 시작 + hotfix 브랜치 생성:**
```bash
git checkout main
git pull origin main
git checkout -b hotfix/${TASK_KEY}
```

**B. Dashboard start:**
```bash
curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/start" \
  -H "Authorization: Bearer ${API_KEY}"
```

**C. 코드 구현**

**D. Summary 업데이트:**
```bash
curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/summary" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"summary": "구현 요약", "description": "변경 내용"}'
```

**E. 커밋 + commits API:**
```bash
git add -A
git commit -m "fix(${TASK_KEY}): ${TASK_TITLE}"

COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%s)
REPO_URL=$(git remote get-url origin | sed 's/git@github[^:]*:/https:\/\/github.com\//' | sed 's/\.git$//')

curl -s -X POST "${DASHBOARD_URL}/api/tasks/${TASK_ID}/commits" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"hash\": \"${COMMIT_HASH}\", \"url\": \"${REPO_URL}/commit/${COMMIT_HASH}\", \"message\": \"${COMMIT_MSG}\"}"

git push -u origin hotfix/${TASK_KEY}
```

**F. PR 생성 → main:**
```bash
gh pr create \
  --title "fix(${TASK_KEY}): ${TASK_TITLE}" \
  --body "## HotFix\n- Task: ${TASK_KEY}" \
  --base main
```

**G. 사용자 확인 후 PR 머지:**
```bash
gh pr merge --merge --delete-branch
```

**H. main으로 복귀 + pull:**
```bash
git checkout main
git pull origin main
```

**I. Dashboard complete + done:**
```bash
curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/complete" \
  -H "Authorization: Bearer ${API_KEY}"
curl -s -X PATCH "${DASHBOARD_URL}/api/tasks/${TASK_ID}/done" \
  -H "Authorization: Bearer ${API_KEY}"
```

### Step 5: 완료

```
✅ HotFix 완료!
- Task: ${TASK_KEY} — ${TASK_TITLE}
- Epic: Maintenance&HotFix
- 현재 브랜치: main (최신 상태)
📊 대시보드: ${DASHBOARD_URL}
```
