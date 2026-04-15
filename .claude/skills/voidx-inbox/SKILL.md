---
name: voidx-inbox
description: 고객사가 Dashboard에서 등록한 신규 작업 요청을 확인합니다.
---

# /voidx-inbox — 작업 요청 확인

Dashboard에서 고객사가 등록한 신규 Task(TODO 상태)를 확인합니다.

## 사전 조건

- `.voidx/config.json`이 존재해야 합니다.

## 실행 흐름

### Step 1: 설정 로드

`.voidx/config.json`을 Read tool로 읽어서 `DASHBOARD_URL`, `PROJECT_ID`를 파악합니다.
`.voidx/config.local.json`을 Read tool로 읽어서 `API_KEY`를 파악합니다.

### Step 2: Epic 목록 조회

```bash
curl -s "${DASHBOARD_URL}/api/projects/${PROJECT_ID}/epics" \
  -H "Authorization: Bearer ${API_KEY}"
```

### Step 3: 각 Epic의 TODO Task 조회

각 Epic에 대해 Task를 조회하고, TODO 상태인 것만 필터링합니다:
```bash
curl -s "${DASHBOARD_URL}/api/epics/${EPIC_ID}/tasks" \
  -H "Authorization: Bearer ${API_KEY}"
```

### Step 4: 결과 표시

TODO 상태의 Task를 Epic별로 그룹핑하여 표시합니다:

```
📬 신규 작업 요청

Epic: 홈페이지 구현
  - [PROJ-15] 로그인 페이지 버그 수정 (P2)
  - [PROJ-16] 회원가입 폼 검증 추가 (P3)

Epic: Maintenance&HotFix
  - [PROJ-17] 서버 타임아웃 설정 변경 (P1)

총 3건의 미처리 작업이 있습니다.

💡 작업을 시작하려면:
  /voidx-task PROJ-15 로그인 페이지 버그 수정해줘
```

TODO Task가 없으면:
```
✅ 현재 미처리 작업이 없습니다.
```
