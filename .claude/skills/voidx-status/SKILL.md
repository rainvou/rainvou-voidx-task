---
name: voidx-status
description: 터미널에서 프로젝트 상태를 즉시 확인합니다. Epic별 진행률, Agent 상태, Task 요약을 표시합니다.
---

# /voidx-status — 프로젝트 상태 조회

터미널에서 프로젝트 현황을 즉시 확인합니다.

## 사전 조건

- `.voidx/config.json`이 존재해야 합니다.

## 실행 흐름

### Step 1: 설정 로드

`.voidx/config.json`에서 `dashboardUrl`, `apiKey`, `projectId`를 읽습니다.

### Step 2: 인자 확인

- 인자 없음 또는 기본 → 현재 프로젝트 상태
- `--all` 인자 → 전체 프로젝트 요약

### Step 3: API 호출

```bash
# 현재 프로젝트
curl -s "${DASHBOARD_URL}/api/status?projectId=${PROJECT_ID}" \
  -H "Authorization: Bearer ${API_KEY}"

# 전체 프로젝트 (--all)
curl -s "${DASHBOARD_URL}/api/status/all" \
  -H "Authorization: Bearer ${API_KEY}"
```

### Step 4: 결과 포맷팅

**단일 프로젝트:**

```
📊 프로젝트명

Epic 1: 백엔드 API          ████████░░ 80%  (8/10 tasks)
Epic 2: 프론트엔드            ██████░░░░ 60%  (6/10 tasks)
Epic 3: 배포/인프라           ██░░░░░░░░ 20%  (1/5 tasks)

🤖 Agents:
  BE-Agent-1    🟢 active    Task: API 인증 구현
  FE-Agent-1    🟢 active    Task: 대시보드 레이아웃
  QA-Agent-1    ⚪ idle

📋 Summary: 15/25 tasks done (60%)
```

**전체 프로젝트 (--all):**

```
📊 All Projects

  Project A     ████████░░ 80%   15/20 tasks
  Project B     ████░░░░░░ 40%   8/20 tasks
  Project C     ██░░░░░░░░ 15%   3/20 tasks
```

### Step 5: 대시보드 링크

```
🔗 대시보드: ${DASHBOARD_URL}
```
