---
stepsCompleted: [step-01-validate, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - prd.md
  - architecture.md
status: 'complete'
---

# TaskManager - Epic Breakdown

## Overview

PRD, 아키텍처 문서를 기반으로 MVP 기능을 8개 Epic, 32개 Story로 분해합니다.

## Requirements Inventory

### Functional Requirements

- FR-C01: 태스크 생성, 조회, 수정, 삭제
- FR-C02: Epic > Story > Subtask 계층 구조
- FR-C03: 태스크에 Checklist 추가
- FR-C04: 팀별 커스텀 워크플로우 상태 정의
- FR-C05: 담당자, 라벨, 우선순위, 데드라인 설정
- FR-C06: 태스크 간 의존성 설정
- FR-C07: 프로젝트별 고유 태스크 키 자동 생성
- FR-C08: 다중 태스크 벌크 오퍼레이션
- FR-C10: 태스크 필터링
- FR-A01: 자연어 태스크 생성
- FR-A02: AI 생성 태스크 미리보기/확인
- FR-A03: Git 활동 기반 자동 상태 전환
- FR-A04: 유사/중복 태스크 자동 감지
- FR-L01: 스레드 기반 코멘트
- FR-L02: @멘션
- FR-L03: 리액션
- FR-L04: 역할 기반 접근 제어
- FR-V01: 칸반 보드 (커스텀 컬럼, 스윔레인)
- FR-V02: 드래그앤드롭 상태/순서 변경
- FR-V03: WIP 제한
- FR-V04: 번다운/번업 차트
- FR-V05: 벨로시티 트래킹
- FR-G01: Git 웹훅 수신
- FR-G02: 커밋 메시지 태스크 키 자동 연결
- FR-G03: PR 이벤트 자동 상태 전환
- FR-G04: 연결된 커밋/PR 목록 확인
- FR-P01: REST API 제공
- FR-P02: API 키 인증
- FR-P03: 일관된 JSON 응답
- FR-P04: 페이지네이션, 필터링, 정렬
- FR-U01: OAuth 2.0 소셜 로그인
- FR-U02: 이메일/비밀번호 로그인
- FR-U03: 프로젝트별 RBAC
- FR-U04: 팀 초대

### NonFunctional Requirements

- NFR-P01~P05: 성능 (페이지 < 2s, API < 500ms, 웹훅 < 10s, DnD < 100ms, 동시 100+)
- NFR-S01~S06: 보안 (HTTPS, bcrypt, OWASP, 멀티테넌시, 감사 로그)
- NFR-X01~X03: 확장성 (수평확장, 10K+ 태스크, 인덱싱)
- NFR-U01~U04: 사용성 (반응형, 다크모드, 키보드 단축키, 실시간)

### Additional Requirements (Architecture)

- Next.js 15 App Router + tRPC + Prisma 스택 초기화
- PostgreSQL + Redis (Docker Compose)
- Socket.io 실시간 통신 인프라
- BullMQ 큐 시스템 (Git 웹훅, AI 작업)
- Auth.js 인증 인프라

## FR Coverage Map

| FR | Epic 1 | Epic 2 | Epic 3 | Epic 4 | Epic 5 | Epic 6 | Epic 7 | Epic 8 |
|----|:------:|:------:|:------:|:------:|:------:|:------:|:------:|:------:|
| FR-U01~U04 | ● | | | | | | | |
| FR-C01~C10 | | ● | | | | | | |
| FR-V01~V03 | | | ● | | | | | |
| FR-G01~G04 | | | | ● | | | | |
| FR-A01~A04 | | | | | ● | | | |
| FR-L01~L04 | | | | | | ● | | |
| FR-V04~V05 | | | | | | | ● | |
| FR-P01~P04 | | | | | | | | ● |

## Epic List

1. **Epic 1: 프로젝트 기반 구축** — 인증, 프로젝트/팀 관리, 기술 스택 초기화
2. **Epic 2: 태스크 관리 Core** — 태스크 CRUD, 계층 구조, 상태 엔진, 필터링
3. **Epic 3: 칸반 보드** — 보드 UI, 드래그앤드롭, WIP 제한
4. **Epic 4: Git 통합** — 웹훅 수신, 태스크 키 매칭, 자동 상태 전환
5. **Epic 5: AI 기능** — 자연어 태스크 생성, 중복 감지
6. **Epic 6: 팀 협업** — 코멘트, 멘션, 리액션, 실시간 알림
7. **Epic 7: 대시보드** — 번다운/번업 차트, 벨로시티 트래킹
8. **Epic 8: 외부 REST API** — API 키 인증, 공개 API 엔드포인트

---

## Epic 1: 프로젝트 기반 구축

프로젝트의 기술 인프라를 세팅하고, 인증/인가 시스템과 프로젝트·팀 관리 기능을 구현합니다.

### Story 1.1: 프로젝트 초기화 및 개발 환경 설정

As a 개발자,
I want 기술 스택이 초기화된 프로젝트 보일러플레이트,
So that 모든 팀원이 즉시 개발을 시작할 수 있습니다.

**Acceptance Criteria:**

**Given** 빈 프로젝트 디렉토리가 존재할 때
**When** 초기화 스크립트를 실행하면
**Then** Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui가 설정됩니다
**And** Prisma + PostgreSQL 스키마가 초기화됩니다
**And** Docker Compose로 PostgreSQL + Redis가 실행됩니다
**And** ESLint + Prettier 코드 스타일이 설정됩니다
**And** Vitest + Playwright 테스트 프레임워크가 설정됩니다

### Story 1.2: 사용자 인증 시스템

As a 사용자,
I want OAuth 또는 이메일/비밀번호로 로그인,
So that 안전하게 시스템에 접근할 수 있습니다.

**Acceptance Criteria:**

**Given** 인증되지 않은 사용자가 앱에 접근할 때
**When** 로그인 페이지가 표시되면
**Then** Google OAuth, GitHub OAuth 소셜 로그인 버튼이 표시됩니다
**And** 이메일/비밀번호 로그인 폼이 표시됩니다
**And** 회원가입 링크가 표시됩니다

**Given** 유효한 자격증명으로 로그인할 때
**When** 인증이 성공하면
**Then** JWT 세션이 생성되고 대시보드로 리다이렉트됩니다
**And** 비밀번호는 bcrypt로 해싱되어 저장됩니다

### Story 1.3: 프로젝트 CRUD 및 팀 관리

As a Admin,
I want 프로젝트를 생성하고 팀원을 초대,
So that 팀 단위로 태스크를 관리할 수 있습니다.

**Acceptance Criteria:**

**Given** 인증된 사용자가 프로젝트 생성 버튼을 클릭할 때
**When** 프로젝트명과 키(예: PROJ)를 입력하면
**Then** 새 프로젝트가 생성되고 생성자가 Admin 역할로 등록됩니다

**Given** Admin이 팀원 초대를 실행할 때
**When** 이메일과 역할(PM/Dev/Viewer)을 입력하면
**Then** 초대 이메일이 발송되고 수락 시 프로젝트에 멤버로 추가됩니다

**Given** 프로젝트 설정 페이지에서
**When** 멤버 역할을 변경하면
**Then** RBAC 권한이 즉시 적용됩니다 (Admin/PM/Dev/Viewer)

### Story 1.4: 커스텀 워크플로우 상태 정의

As a PM,
I want 프로젝트별 워크플로우 상태를 커스터마이징,
So that 팀의 프로세스에 맞는 태스크 흐름을 설정할 수 있습니다.

**Acceptance Criteria:**

**Given** 프로젝트 설정의 워크플로우 탭에서
**When** 상태를 추가/수정/삭제/순서변경 하면
**Then** 커스텀 상태가 저장되고 칸반 보드/태스크에 즉시 반영됩니다
**And** 기본 상태 세트(Todo/InProgress/Review/Done)가 프리셋으로 제공됩니다
**And** 최소 1개의 시작 상태와 1개의 완료 상태가 필수입니다

---

## Epic 2: 태스크 관리 Core

태스크의 생성, 조회, 수정, 삭제와 계층 구조, 필터링, 벌크 오퍼레이션을 구현합니다.

### Story 2.1: 태스크 CRUD 및 태스크 키

As a 개발자,
I want 태스크를 생성/조회/수정/삭제하고 고유 키로 참조,
So that 작업을 체계적으로 추적할 수 있습니다.

**Acceptance Criteria:**

**Given** 인증된 Dev 이상 권한의 사용자가 태스크 생성 폼을 열 때
**When** 제목, 설명, 담당자, 라벨, 우선순위, 데드라인을 입력하면
**Then** 태스크가 생성되고 PROJ-123 형태의 고유 키가 자동 부여됩니다
**And** 태스크 키는 프로젝트 내에서 순차 증가합니다

**Given** 태스크 목록 페이지에서
**When** 태스크를 클릭하면
**Then** 태스크 상세 페이지가 표시됩니다 (제목, 설명, 상태, 담당자, 라벨, 우선순위, 데드라인, 이력)

### Story 2.2: 태스크 계층 구조

As a PM,
I want 태스크를 Epic > Story > Subtask 계층으로 구성,
So that 큰 작업을 관리 가능한 단위로 분해할 수 있습니다.

**Acceptance Criteria:**

**Given** Epic 태스크가 존재할 때
**When** 하위 Story 태스크를 생성하면
**Then** Story가 Epic의 자식으로 연결됩니다
**And** Epic 상세에서 하위 Story 목록이 표시됩니다
**And** Story 하위에 Subtask를 추가할 수 있습니다
**And** Subtask에 Checklist 항목을 추가할 수 있습니다

### Story 2.3: 태스크 의존성

As a PM,
I want 태스크 간 의존성(blocks/blocked-by)을 설정,
So that 작업 순서와 블로커를 명확히 할 수 있습니다.

**Acceptance Criteria:**

**Given** 태스크 상세 페이지에서
**When** 의존성 추가 버튼으로 다른 태스크를 연결하면
**Then** blocks/blocked-by/relates-to 관계가 설정됩니다
**And** 양쪽 태스크에서 관계가 표시됩니다
**And** blocked-by 태스크가 미완료면 경고 배지가 표시됩니다

### Story 2.4: 태스크 필터링 및 벌크 오퍼레이션

As a 사용자,
I want 태스크를 다양한 조건으로 필터링하고 일괄 처리,
So that 대량의 태스크를 효율적으로 관리할 수 있습니다.

**Acceptance Criteria:**

**Given** 태스크 목록 페이지에서
**When** 상태, 담당자, 라벨, 우선순위, 데드라인 필터를 적용하면
**Then** 조건에 맞는 태스크만 표시됩니다
**And** 필터는 URL 파라미터로 공유 가능합니다

**Given** 다중 태스크를 선택한 후
**When** 벌크 액션(상태 변경/담당자 변경/라벨 추가)을 실행하면
**Then** 선택된 모든 태스크에 일괄 적용됩니다

---

## Epic 3: 칸반 보드

칸반 보드 뷰를 구현하여 드래그앤드롭으로 태스크 상태를 관리합니다.

### Story 3.1: 칸반 보드 렌더링

As a 사용자,
I want 프로젝트의 태스크를 칸반 보드로 시각화,
So that 워크플로우 상태별 태스크 현황을 한눈에 파악할 수 있습니다.

**Acceptance Criteria:**

**Given** 칸반 보드 페이지에 접근할 때
**When** 보드가 렌더링되면
**Then** 프로젝트 워크플로우 상태별 컬럼이 표시됩니다
**And** 각 컬럼에 해당 상태의 태스크 카드가 표시됩니다
**And** 카드에 제목, 태스크 키, 담당자 아바타, 우선순위가 표시됩니다
**And** 스윔레인(담당자별/라벨별) 그룹핑이 지원됩니다

### Story 3.2: 드래그앤드롭 + WIP 제한

As a 사용자,
I want 태스크 카드를 드래그앤드롭으로 상태 변경,
So that 직관적으로 워크플로우를 관리할 수 있습니다.

**Acceptance Criteria:**

**Given** 칸반 보드에서 태스크 카드를 드래그할 때
**When** 다른 컬럼에 드롭하면
**Then** 태스크 상태가 변경되고 100ms 이내에 UI가 반영됩니다
**And** 같은 컬럼 내 드래그로 순서를 변경할 수 있습니다
**And** 실시간으로 다른 팀원에게도 변경이 전파됩니다

**Given** 컬럼에 WIP 제한이 설정되어 있을 때
**When** 제한 수를 초과하여 카드를 드롭하려 하면
**Then** 경고 메시지가 표시되고 드롭이 차단됩니다

---

## Epic 4: Git 통합

Git 웹훅을 수신하여 커밋/PR과 태스크를 자동 연결하고 상태를 자동 전환합니다.

### Story 4.1: Git 웹훅 수신 및 태스크 키 매칭

As a 시스템,
I want Git 웹훅 이벤트를 수신하고 태스크와 자동 연결,
So that 개발 활동이 태스크에 자동으로 기록됩니다.

**Acceptance Criteria:**

**Given** GitHub/GitLab에서 웹훅이 전송될 때
**When** POST /api/webhooks/git으로 수신하면
**Then** 서명을 검증하고 200을 즉시 반환합니다
**And** BullMQ 큐에 이벤트를 enqueue합니다

**Given** 큐 워커가 커밋 이벤트를 처리할 때
**When** 커밋 메시지에 태스크 키(PROJ-123)가 포함되면
**Then** 해당 태스크에 커밋이 연결되고 TaskEvent가 기록됩니다
**And** 태스크 상세에서 연결된 커밋 목록이 표시됩니다

### Story 4.2: PR 기반 자동 상태 전환

As a 개발자,
I want PR 생성/머지 시 태스크 상태가 자동 변경,
So that 수동으로 상태를 업데이트할 필요가 없습니다.

**Acceptance Criteria:**

**Given** 태스크 키가 포함된 브랜치에서 PR이 생성될 때
**When** 웹훅 워커가 PR open 이벤트를 처리하면
**Then** 해당 태스크 상태가 "Review"로 자동 전환됩니다
**And** 수동 오버라이드가 항상 가능합니다

**Given** PR이 머지될 때
**When** 웹훅 워커가 PR merged 이벤트를 처리하면
**Then** 해당 태스크 상태가 "Done"으로 자동 전환됩니다
**And** Git 웹훅 → 상태 반영이 10초 이내에 완료됩니다

### Story 4.3: Git 연동 설정 UI

As a Admin,
I want 프로젝트에 Git 저장소를 연결하고 웹훅을 설정,
So that 자동 상태 전환이 활성화됩니다.

**Acceptance Criteria:**

**Given** 프로젝트 설정의 Git 연동 탭에서
**When** 저장소 URL과 웹훅 시크릿을 입력하면
**Then** 웹훅 엔드포인트 URL이 표시되고 상태 전환 규칙을 커스터마이징할 수 있습니다
**And** PR open → Review, PR merged → Done이 기본 규칙으로 제공됩니다

---

## Epic 5: AI 기능

AI 에이전트가 자연어로 태스크를 생성하고 중복을 감지합니다.

### Story 5.1: 자연어 태스크 생성

As a 사용자,
I want 자연어로 태스크를 설명하면 구조화된 태스크가 생성,
So that 빠르게 태스크를 생성할 수 있습니다.

**Acceptance Criteria:**

**Given** AI 태스크 생성 입력란에 자연어를 입력할 때
**When** "로그인 페이지에 Google 소셜 로그인 추가해줘"를 입력하면
**Then** AI가 제목, 설명, 수용 기준, 라벨, 우선순위를 포함한 구조화 태스크를 생성합니다
**And** 미리보기 화면이 표시되어 사용자가 수정/확인할 수 있습니다
**And** 확인 클릭 시 실제 태스크가 생성됩니다
**And** AI 처리는 BullMQ 큐로 비동기 실행됩니다

### Story 5.2: 유사/중복 태스크 감지

As a 사용자,
I want 새 태스크 생성 시 유사한 기존 태스크를 안내받고,
So that 중복 태스크 생성을 방지할 수 있습니다.

**Acceptance Criteria:**

**Given** 새 태스크의 제목/설명을 입력할 때
**When** 유사도가 높은 기존 태스크가 존재하면
**Then** "유사 태스크 발견" 알림과 함께 해당 태스크 목록이 표시됩니다
**And** 사용자가 "그래도 생성" 또는 "기존 태스크로 이동"을 선택할 수 있습니다
**And** pg_trgm 기반 텍스트 유사도 검색이 사용됩니다

---

## Epic 6: 팀 협업

태스크별 코멘트, @멘션, 리액션, 실시간 알림을 구현합니다.

### Story 6.1: 코멘트 시스템

As a 팀원,
I want 태스크에 코멘트를 작성하고 토론,
So that 태스크 관련 소통을 한 곳에서 관리할 수 있습니다.

**Acceptance Criteria:**

**Given** 태스크 상세 페이지의 코멘트 섹션에서
**When** 코멘트를 작성하면
**Then** 스레드 형태로 코멘트가 표시됩니다
**And** Markdown 문법이 지원됩니다
**And** 코멘트 수정/삭제가 가능합니다 (본인 것만)

### Story 6.2: @멘션 및 리액션

As a 팀원,
I want @멘션으로 팀원을 태그하고 리액션으로 반응,
So that 효율적으로 소통할 수 있습니다.

**Acceptance Criteria:**

**Given** 코멘트 입력란에 @를 입력할 때
**When** 팀원 이름을 선택하면
**Then** @멘션이 삽입되고 해당 팀원에게 알림이 전송됩니다

**Given** 코멘트에 리액션 버튼을 클릭할 때
**When** 이모지를 선택하면
**Then** 리액션이 코멘트에 추가되고 카운트가 표시됩니다

### Story 6.3: 실시간 알림 및 WebSocket

As a 팀원,
I want 관련 태스크 변경 시 실시간 알림을 받고,
So that 중요한 변경을 즉시 인지할 수 있습니다.

**Acceptance Criteria:**

**Given** 프로젝트에 접속 중인 사용자가 있을 때
**When** 다른 팀원이 태스크 상태를 변경하면
**Then** WebSocket으로 실시간 업데이트가 전파됩니다
**And** 인앱 알림이 표시됩니다
**And** @멘션, 담당 태스크 변경 시 알림이 전송됩니다

---

## Epic 7: 대시보드

프로젝트 진행 현황을 시각화하는 번다운 차트와 벨로시티 트래킹을 구현합니다.

### Story 7.1: 번다운/번업 차트

As a PM,
I want 스프린트 번다운 차트를 확인,
So that 스프린트 진행 상황을 시각적으로 파악할 수 있습니다.

**Acceptance Criteria:**

**Given** 대시보드 페이지에 접근할 때
**When** 스프린트/기간을 선택하면
**Then** 번다운 차트가 표시됩니다 (이상적 라인 + 실제 라인)
**And** 번업 차트 전환이 가능합니다
**And** 마우스 호버 시 일자별 태스크 수가 표시됩니다

### Story 7.2: 벨로시티 트래킹

As a PM,
I want 스프린트별 팀 벨로시티 추이를 확인,
So that 팀의 처리 능력을 기반으로 계획을 수립할 수 있습니다.

**Acceptance Criteria:**

**Given** 대시보드의 벨로시티 섹션에서
**When** 최근 스프린트 데이터가 표시되면
**Then** 스프린트별 완료 태스크 수/스토리 포인트 바 차트가 표시됩니다
**And** 평균 벨로시티 라인이 표시됩니다
**And** 추세(증가/감소/안정)가 표시됩니다

---

## Epic 8: 외부 REST API

외부 시스템 연동을 위한 REST API와 API 키 인증을 구현합니다.

### Story 8.1: API 키 관리

As a Admin,
I want 프로젝트별 API 키를 생성/관리,
So that 외부 시스템이 안전하게 API에 접근할 수 있습니다.

**Acceptance Criteria:**

**Given** 프로젝트 설정의 API 탭에서
**When** API 키 생성 버튼을 클릭하면
**Then** 새 API 키가 생성되고 한 번만 표시됩니다 (이후 해시로만 저장)
**And** 키에 이름과 만료일을 설정할 수 있습니다
**And** 기존 키를 비활성화/삭제할 수 있습니다

### Story 8.2: REST API 엔드포인트

As a 외부 시스템,
I want REST API로 태스크를 CRUD,
So that 자동화 도구와 연동할 수 있습니다.

**Acceptance Criteria:**

**Given** 유효한 API 키가 Authorization 헤더에 포함될 때
**When** /api/v1/projects/{key}/tasks에 요청하면
**Then** 일관된 JSON 형식으로 응답합니다 `{ data, meta }`
**And** 페이지네이션 (page, limit), 필터링, 정렬을 지원합니다
**And** CRUD 전체 (GET/POST/PATCH/DELETE)를 지원합니다
**And** 잘못된 API 키로 요청 시 401 Unauthorized를 반환합니다
**And** 권한 부족 시 403 Forbidden을 반환합니다
