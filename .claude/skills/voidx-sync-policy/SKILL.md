---
name: voidx-sync-policy
description: Dashboard에서 최신 Risk Policy를 다운로드하여 로컬에 동기화합니다.
---

# /voidx-sync-policy — Risk Policy 동기화

Dashboard에서 최신 risk policy 규칙을 다운로드하여 `.voidx/risk-policy.json`에 저장합니다.

## 사전 조건

- `.voidx/config.json`과 `.voidx/config.local.json`이 존재해야 합니다.

## 실행 순서

### Step 1: 설정 로드

`.voidx/config.json`에서 `dashboardUrl`, `.voidx/config.local.json`에서 `apiKey`를 읽습니다.

### Step 2: Risk Policy 다운로드

```bash
curl -s "${DASHBOARD_URL}/api/risk-policy" \
  -H "Authorization: Bearer ${API_KEY}" > .voidx/risk-policy.json
```

### Step 3: 결과 확인

`.voidx/risk-policy.json`을 Read tool로 읽어서 룰 개수를 확인합니다.

```
✅ Risk Policy 동기화 완료!

- Rules: N개
- 파일: .voidx/risk-policy.json
- 동기화 시각: YYYY-MM-DD HH:MM:SS
```
