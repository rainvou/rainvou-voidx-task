import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing data
  await prisma.taskEvent.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.taskDependency.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
  await prisma.workflowStatus.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.gitConfig.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();

  // Create project
  const project = await prisma.project.create({
    data: {
      name: "TaskManager MVP",
      key: "TASK",
      description: "AI 에이전트 기반 팀 협업 태스크 관리 시스템",
      taskCounter: 16,
    },
  });

  // Create workflow statuses
  const todo = await prisma.workflowStatus.create({
    data: { projectId: project.id, name: "Todo", displayOrder: 0, isStart: true, color: "#6B7280" },
  });
  const inProgress = await prisma.workflowStatus.create({
    data: { projectId: project.id, name: "In Progress", displayOrder: 1, color: "#0052CC" },
  });
  const inReview = await prisma.workflowStatus.create({
    data: { projectId: project.id, name: "In Review", displayOrder: 2, color: "#FF991F" },
  });
  const done = await prisma.workflowStatus.create({
    data: { projectId: project.id, name: "Done", displayOrder: 3, isDone: true, color: "#36B37E" },
  });

  // Find or create users
  let user1 = await prisma.user.findUnique({ where: { email: "dev1@taskmanager.io" } });
  if (!user1) user1 = await prisma.user.create({ data: { email: "dev1@taskmanager.io", name: "김개발" } });

  let user2 = await prisma.user.findUnique({ where: { email: "dev2@taskmanager.io" } });
  if (!user2) user2 = await prisma.user.create({ data: { email: "dev2@taskmanager.io", name: "이프론트" } });

  let user3 = await prisma.user.findUnique({ where: { email: "pm@taskmanager.io" } });
  if (!user3) user3 = await prisma.user.create({ data: { email: "pm@taskmanager.io", name: "박매니저" } });

  // Add members
  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: user1.id, role: "DEV" },
      { projectId: project.id, userId: user2.id, role: "DEV" },
      { projectId: project.id, userId: user3.id, role: "PM" },
    ],
  });

  // Create labels
  const labelBug = await prisma.label.create({ data: { projectId: project.id, name: "Bug", color: "#FF5630" } });
  const labelFeature = await prisma.label.create({ data: { projectId: project.id, name: "Feature", color: "#36B37E" } });
  const labelUI = await prisma.label.create({ data: { projectId: project.id, name: "UI", color: "#6554C0" } });
  const labelAPI = await prisma.label.create({ data: { projectId: project.id, name: "API", color: "#0065FF" } });
  const labelPerf = await prisma.label.create({ data: { projectId: project.id, name: "Performance", color: "#FF991F" } });

  // Sample tasks
  const tasks = [
    // Todo
    { key: "TASK-1", title: "AI 자연어 태스크 생성 프롬프트 최적화", type: "STORY" as const, priority: "HIGH" as const, status: todo.id, assignee: user1.id, labels: [labelFeature.id] },
    { key: "TASK-2", title: "프로젝트 설정 페이지 UI 구현", type: "STORY" as const, priority: "MEDIUM" as const, status: todo.id, assignee: user2.id, labels: [labelUI.id] },
    { key: "TASK-3", title: "Slack 웹훅 연동 설계", type: "EPIC" as const, priority: "LOW" as const, status: todo.id, assignee: null, labels: [labelAPI.id] },
    { key: "TASK-4", title: "비동기 스탠드업 자동 수집 기능", type: "STORY" as const, priority: "MEDIUM" as const, status: todo.id, assignee: null, labels: [labelFeature.id] },

    // In Progress
    { key: "TASK-5", title: "칸반 보드 드래그앤드롭 성능 개선", type: "STORY" as const, priority: "HIGH" as const, status: inProgress.id, assignee: user2.id, labels: [labelUI.id, labelPerf.id] },
    { key: "TASK-6", title: "Git 웹훅 PR 머지 시 자동 상태 전환", type: "STORY" as const, priority: "URGENT" as const, status: inProgress.id, assignee: user1.id, labels: [labelAPI.id] },
    { key: "TASK-7", title: "태스크 필터링 URL 쿼리 파라미터 지원", type: "SUBTASK" as const, priority: "MEDIUM" as const, status: inProgress.id, assignee: user1.id, labels: [labelFeature.id] },

    // In Review
    { key: "TASK-8", title: "OAuth Google 로그인 콜백 에러 수정", type: "STORY" as const, priority: "URGENT" as const, status: inReview.id, assignee: user1.id, labels: [labelBug.id] },
    { key: "TASK-9", title: "대시보드 번다운 차트 SVG 렌더링", type: "STORY" as const, priority: "HIGH" as const, status: inReview.id, assignee: user2.id, labels: [labelUI.id] },
    { key: "TASK-10", title: "REST API 페이지네이션 구현", type: "STORY" as const, priority: "MEDIUM" as const, status: inReview.id, assignee: user1.id, labels: [labelAPI.id] },

    // Done
    { key: "TASK-11", title: "프로젝트 CRUD + 팀 관리 API", type: "STORY" as const, priority: "HIGH" as const, status: done.id, assignee: user1.id, labels: [labelAPI.id] },
    { key: "TASK-12", title: "사용자 인증 시스템 (Auth.js)", type: "EPIC" as const, priority: "URGENT" as const, status: done.id, assignee: user1.id, labels: [labelFeature.id] },
    { key: "TASK-13", title: "Prisma 스키마 전체 모델 설계", type: "STORY" as const, priority: "HIGH" as const, status: done.id, assignee: user1.id, labels: [labelAPI.id] },
    { key: "TASK-14", title: "커스텀 워크플로우 상태 CRUD", type: "STORY" as const, priority: "MEDIUM" as const, status: done.id, assignee: user2.id, labels: [labelFeature.id] },
    { key: "TASK-15", title: "태스크 키 자동 생성 (PROJ-123)", type: "SUBTASK" as const, priority: "MEDIUM" as const, status: done.id, assignee: user1.id, labels: [labelAPI.id] },
    { key: "TASK-16", title: "코멘트 스레드 + @멘션 시스템", type: "STORY" as const, priority: "HIGH" as const, status: done.id, assignee: user2.id, labels: [labelFeature.id, labelUI.id] },
  ];

  for (const t of tasks) {
    const task = await prisma.task.create({
      data: {
        taskKey: t.key,
        projectId: project.id,
        title: t.title,
        type: t.type,
        priority: t.priority,
        statusId: t.status,
        assigneeId: t.assignee,
      },
    });

    // Add labels
    for (const labelId of t.labels) {
      await prisma.taskLabel.create({
        data: { taskId: task.id, labelId },
      });
    }
  }

  console.log("✅ Seed complete: 1 project, 4 statuses, 3 members, 5 labels, 16 tasks");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
