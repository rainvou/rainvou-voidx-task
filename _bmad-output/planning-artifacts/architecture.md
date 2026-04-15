---
stepsCompleted: [step-01-init, step-02-context, step-03-starter, step-04-decisions, step-05-patterns, step-06-structure, step-07-validation, step-08-complete]
inputDocuments:
  - prd.md
  - product-brief-rainvou-voidx-task.md
  - product-brief-rainvou-voidx-task-distillate.md
workflowType: 'architecture'
project_name: 'TaskManager'
date: '2026-04-15'
status: 'complete'
---

# Architecture Decision Document — TaskManager

---

## Project Context Analysis

### Requirements Overview

TaskManager는 AI 에이전트 기반 팀 협업 태스크 관리 시스템입니다. MVP 핵심 기능:

- 계층형 태스크 관리 (Epic/Story/Subtask) + 커스텀 워크플로우
- Git 통합 (웹훅 기반 자동 상태 전환)
- AI 자연어 태스크 생성, 중복 감지
- 칸반 보드 + 대시보드 (번다운, 벨로시티)
- 실시간 코멘트, @멘션
- RBAC, OAuth 2.0
- REST API

### Non-Functional Requirements Summary

| 카테고리 | 핵심 요구사항 |
|----------|-------------|
| 성능 | 페이지 로드 < 2s, API < 500ms (P95) |
| 실시간 | Git 웹훅 → 상태 반영 < 10s |
| 동시성 | 프로젝트당 100+ 동시 사용자 |
| 보안 | HTTPS, bcrypt, OWASP Top 10, 멀티테넌시 격리 |
| 확장성 | 수평 확장 가능, 프로젝트당 10,000+ 태스크 |

### Scale & Complexity

- **사용자 규모:** 팀당 5~50명, 초기 10개 팀 → 100개 팀 확장
- **데이터 규모:** 프로젝트당 10,000+ 태스크, 태스크당 50+ 이벤트
- **실시간 요구:** WebSocket 기반 태스크 상태/코멘트 실시간 업데이트
- **외부 연동:** Git 웹훅, OAuth 2.0, LLM API

### Cross-Cutting Concerns

- **인증/인가:** 모든 API에 적용, 프로젝트별 RBAC
- **감사 로그:** 모든 데이터 변경 이력 기록
- **에러 핸들링:** 일관된 에러 응답 형식, 구조화된 로깅
- **멀티테넌시:** 프로젝트 간 완전한 데이터 격리

---

## Starter Template Evaluation

### Primary Technology Domain

**Full-stack TypeScript Web Application**

### Selected Stack

| 레이어 | 기술 | 선정 사유 |
|--------|------|----------|
| Frontend | **Next.js 15 (App Router)** | SSR/SSG, React 생태계, API Routes 통합 |
| UI Library | **React 19** | 컴포넌트 기반, 거대 생태계 |
| Styling | **Tailwind CSS 4 + shadcn/ui** | 유틸리티 기반, 일관된 디자인 시스템 |
| State | **Zustand + TanStack Query** | 경량 전역 상태 + 서버 상태 캐싱 |
| Backend | **Next.js API Routes + tRPC** | 타입 안전 API, 프론트/백 타입 공유 |
| Database | **PostgreSQL 16** | JSONB, 전문 검색, 성숙한 생태계 |
| ORM | **Prisma** | 타입 안전 쿼리, 마이그레이션 관리 |
| Auth | **NextAuth.js (Auth.js)** | OAuth 2.0/OIDC, 세션 관리 |
| Real-time | **Socket.io** | WebSocket 추상화, 재연결, 룸 지원 |
| Queue | **BullMQ (Redis)** | 웹훅 처리, AI 작업 비동기 큐 |
| AI | **Anthropic Claude API** | 자연어 처리, 태스크 구조화 |
| Testing | **Vitest + Playwright** | 유닛/통합 + E2E |
| Package Manager | **pnpm** | 빠른 설치, 디스크 효율 |

### Initialization

```bash
pnpm create next-app taskmanager --typescript --tailwind --eslint --app --src-dir
```

---

## Core Architectural Decisions

### ADR-1: 모노리포 vs 분리 서비스

**결정:** Next.js 기반 모노리스 (API Routes + Frontend 통합)

**사유:**
- MVP 단계에서 배포/운영 복잡도 최소화
- tRPC로 프론트/백 타입 공유, 개발 속도 극대화
- 필요 시 API Routes를 별도 서비스로 추출 가능

### ADR-2: 데이터베이스 설계

**결정:** PostgreSQL + Prisma ORM

**사유:**
- 태스크 계층 구조 → 재귀 CTE 지원
- 태스크 메타데이터 → JSONB 유연성
- 전문 검색 → pg_trgm + GIN 인덱스 (중복 감지용)
- Prisma 마이그레이션으로 스키마 버전 관리

**핵심 테이블:**

```
Project       ─┬─ Epic       ─┬─ Story      ─┬─ Subtask
               │               │               └─ Checklist
               ├─ Member (RBAC)│
               ├─ Workflow     └─ Comment
               ├─ Label           └─ Reaction
               └─ ApiKey
               
TaskEvent (감사 로그 + Git 연동)
Notification
StandupEntry
AutomationRule
```

### ADR-3: 인증/인가

**결정:** Auth.js (NextAuth) + Custom RBAC Middleware

**사유:**
- OAuth 2.0/OIDC 표준 지원 (Google, GitHub)
- 이메일/비밀번호 Credentials Provider
- 프로젝트별 Role (Admin/PM/Dev/Viewer) → Middleware에서 검증
- API 키 인증 → 별도 Middleware

**Role Permission Matrix:**

| 권한 | Admin | PM | Dev | Viewer |
|------|:-----:|:--:|:---:|:------:|
| 프로젝트 설정 | ● | | | |
| 멤버 관리 | ● | ● | | |
| 태스크 생성/수정 | ● | ● | ● | |
| 태스크 조회 | ● | ● | ● | ● |
| 코멘트 작성 | ● | ● | ● | |
| 대시보드 조회 | ● | ● | ● | ● |
| 자동화 규칙 관리 | ● | ● | | |

### ADR-4: 실시간 통신

**결정:** Socket.io (WebSocket)

**사유:**
- 태스크 상태 변경, 코멘트, 알림의 실시간 전파
- Room 기반 프로젝트별 격리
- 자동 재연결, 폴백 지원
- Redis Adapter로 수평 확장 가능

**이벤트 설계:**

```
task:created    → 프로젝트 Room 전체
task:updated    → 프로젝트 Room 전체
task:status     → 프로젝트 Room + 담당자 개인
comment:created → 태스크 구독자
notification    → 개인 Room
```

### ADR-5: Git 통합

**결정:** 웹훅 수신 → BullMQ 큐 → 비동기 처리

**사유:**
- Git 웹훅은 빠른 응답 필요 (수신 즉시 200 반환)
- 태스크 키 파싱, 상태 전환 로직은 큐에서 처리
- 재시도 메커니즘 내장 (최대 3회, 지수 백오프)

**처리 흐름:**

```
GitHub/GitLab Webhook
  → POST /api/webhooks/git
  → 서명 검증 → 200 즉시 반환
  → BullMQ 큐에 enqueue
  → Worker: 커밋 메시지 태스크 키 파싱
  → 매칭 태스크 상태 전환
  → TaskEvent 기록
  → WebSocket 실시간 알림
```

### ADR-6: AI 통합

**결정:** Anthropic Claude API + 구조화 출력 (JSON)

**사유:**
- 자연어 태스크 생성: 사용자 입력 → Claude → 구조화 JSON → 미리보기 → 확인 → 생성
- 중복 감지: 새 태스크 제목/설명 → 임베딩 유사도 + pg_trgm 검색
- BullMQ 큐로 비동기 처리 (응답 시간 보장)

### ADR-7: API 설계

**결정:** tRPC (내부) + REST API (외부)

**사유:**
- tRPC: 프론트엔드 ↔ 백엔드 타입 안전 통신, 자동 타입 추론
- REST: 외부 연동, API 키 인증, OpenAPI 스펙 자동 생성
- REST 엔드포인트는 tRPC 라우터를 래핑하여 이중 구현 방지

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

| 대상 | 컨벤션 | 예시 |
|------|--------|------|
| 파일명 (컴포넌트) | PascalCase | `TaskCard.tsx` |
| 파일명 (유틸) | camelCase | `formatDate.ts` |
| 파일명 (API 라우트) | kebab-case | `route.ts` (App Router) |
| 변수/함수 | camelCase | `getTaskById` |
| 타입/인터페이스 | PascalCase | `TaskWithRelations` |
| DB 테이블 | PascalCase (Prisma) | `Task`, `TaskEvent` |
| DB 컬럼 | camelCase | `createdAt`, `projectId` |
| 환경변수 | SCREAMING_SNAKE | `DATABASE_URL` |
| CSS 클래스 | Tailwind 유틸리티 | `className="flex gap-2"` |

### Structure Patterns

- **Feature 기반 디렉토리:** 기능별로 컴포넌트/훅/유틸 그룹화
- **Barrel exports 금지:** 직접 경로 import
- **서버/클라이언트 분리:** `'use client'` 디렉티브 최소 사용, 서버 컴포넌트 기본
- **공유 타입:** `src/types/` 디렉토리에서 관리

### Communication Patterns

- **API 에러:** `{ error: { code: string, message: string, details?: unknown } }` 형식 통일
- **페이지네이션:** `{ data: T[], meta: { total, page, limit, totalPages } }`
- **WebSocket:** `{ event: string, payload: unknown, timestamp: string }`

### Process Patterns

- **Git 브랜치:** `feature/epic-{n}/{task-key}` (예: `feature/epic-1/TASK-42`)
- **커밋 메시지:** `feat(TASK-42): 태스크 생성 API 구현`
- **PR:** Task 브랜치 → Epic 브랜치 → main

---

## Project Structure & Boundaries

```
taskmanager/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 인증 그룹
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/              # 대시보드 그룹
│   │   │   ├── [projectKey]/         # 프로젝트별
│   │   │   │   ├── board/page.tsx    # 칸반 보드
│   │   │   │   ├── tasks/            # 태스크 목록/상세
│   │   │   │   ├── dashboard/        # 차트/대시보드
│   │   │   │   └── settings/         # 프로젝트 설정
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── trpc/[trpc]/route.ts  # tRPC 엔드포인트
│   │   │   ├── webhooks/git/route.ts # Git 웹훅 수신
│   │   │   └── v1/                   # REST API v1
│   │   └── layout.tsx                # 루트 레이아웃
│   │
│   ├── components/                   # 공유 UI 컴포넌트
│   │   ├── ui/                       # shadcn/ui 컴포넌트
│   │   ├── task/                     # 태스크 관련
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── TaskFilters.tsx
│   │   ├── board/                    # 칸반 보드
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   └── KanbanCard.tsx
│   │   ├── dashboard/                # 대시보드/차트
│   │   │   ├── BurndownChart.tsx
│   │   │   └── VelocityChart.tsx
│   │   └── comment/                  # 코멘트
│   │       ├── CommentThread.tsx
│   │       └── CommentForm.tsx
│   │
│   ├── server/                       # 서버 사이드 로직
│   │   ├── trpc/                     # tRPC 라우터
│   │   │   ├── router.ts             # 루트 라우터
│   │   │   ├── task.ts               # 태스크 라우터
│   │   │   ├── project.ts            # 프로젝트 라우터
│   │   │   ├── comment.ts            # 코멘트 라우터
│   │   │   └── ai.ts                 # AI 기능 라우터
│   │   ├── services/                 # 비즈니스 로직
│   │   │   ├── taskService.ts
│   │   │   ├── gitIntegrationService.ts
│   │   │   ├── aiService.ts
│   │   │   ├── notificationService.ts
│   │   │   └── webhookService.ts
│   │   ├── queue/                    # BullMQ 큐/워커
│   │   │   ├── gitWebhookQueue.ts
│   │   │   ├── aiQueue.ts
│   │   │   └── notificationQueue.ts
│   │   └── middleware/               # 서버 미들웨어
│   │       ├── auth.ts
│   │       ├── rbac.ts
│   │       └── apiKey.ts
│   │
│   ├── lib/                          # 유틸리티
│   │   ├── prisma.ts                 # Prisma 클라이언트
│   │   ├── redis.ts                  # Redis 클라이언트
│   │   ├── socket.ts                 # Socket.io 설정
│   │   ├── ai.ts                     # Claude API 클라이언트
│   │   └── taskKey.ts                # 태스크 키 생성/파싱
│   │
│   ├── hooks/                        # React 커스텀 훅
│   │   ├── useTask.ts
│   │   ├── useRealtime.ts
│   │   └── useProject.ts
│   │
│   └── types/                        # 공유 타입 정의
│       ├── task.ts
│       ├── project.ts
│       └── api.ts
│
├── prisma/
│   ├── schema.prisma                 # DB 스키마
│   └── migrations/                   # 마이그레이션
│
├── tests/
│   ├── unit/                         # Vitest 유닛 테스트
│   ├── integration/                  # API 통합 테스트
│   └── e2e/                          # Playwright E2E
│
├── .env.example
├── docker-compose.yml                # PostgreSQL + Redis
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Architectural Boundaries

| 레이어 | 의존 가능 | 의존 불가 |
|--------|----------|----------|
| `app/` (페이지) | components, hooks, server/trpc | server/services 직접 호출 |
| `components/` | hooks, lib, types | server 레이어 |
| `server/trpc/` | server/services, lib | components, hooks |
| `server/services/` | lib, prisma, queue | trpc, components |
| `server/queue/` | server/services, lib | trpc, components |
| `lib/` | types | 상위 레이어 |
| `types/` | 없음 (순수 타입) | 모든 레이어 |

---

## Architecture Validation Results

### Coherence Validation ✅

- 모든 ADR이 상호 일관적
- 기술 스택 간 충돌 없음 (Next.js + tRPC + Prisma + Socket.io)
- 실시간 요구사항 ↔ Socket.io 결정 정합

### Requirements Coverage ✅

| PRD 요구사항 | 아키텍처 커버리지 |
|-------------|----------------|
| FR-C01~C10 (태스크 관리) | Prisma 스키마 + tRPC 라우터 |
| FR-A01~A04 (AI MVP) | Claude API + BullMQ 큐 |
| FR-L01~L04 (협업) | Socket.io + 코멘트 서비스 |
| FR-V01~V05 (시각화) | React 컴포넌트 + 차트 라이브러리 |
| FR-G01~G04 (Git 통합) | 웹훅 수신 + BullMQ + 태스크 키 |
| FR-P01~P04 (API) | tRPC + REST API |
| FR-U01~U04 (인증) | Auth.js + RBAC 미들웨어 |
| NFR 전체 | PostgreSQL 인덱싱, Redis 캐싱, WebSocket |

### Implementation Readiness ✅

- 프로젝트 구조 정의 완료
- 네이밍/커뮤니케이션 패턴 정의 완료
- 레이어 간 의존성 경계 명확
- AI 에이전트가 독립적으로 구현 가능한 수준

### Architecture Completeness Checklist

- [x] 기술 스택 결정
- [x] 데이터베이스 설계 방향
- [x] 인증/인가 아키텍처
- [x] 실시간 통신 설계
- [x] 외부 연동 (Git) 설계
- [x] AI 통합 설계
- [x] API 설계 패턴
- [x] 프로젝트 구조
- [x] 아키텍처 경계 규칙
- [x] 구현 패턴/컨벤션
