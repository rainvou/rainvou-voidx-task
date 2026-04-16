import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, key, description } = await req.json();

    if (!name || !key) {
      return NextResponse.json(
        { error: { message: "name과 key는 필수입니다" } },
        { status: 400 }
      );
    }

    const existing = await prisma.project.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json(
        { error: { message: "이미 존재하는 프로젝트 키입니다" } },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        key: key.toUpperCase(),
        description: description || null,
        workflows: {
          create: [
            { name: "Todo", displayOrder: 0, isStart: true, color: "#6B7280" },
            { name: "InProgress", displayOrder: 1, color: "#3B82F6" },
            { name: "Review", displayOrder: 2, color: "#F59E0B" },
            { name: "Done", displayOrder: 3, isDone: true, color: "#10B981" },
          ],
        },
      },
    });

    return NextResponse.json({ data: project });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: { message: "프로젝트 생성 중 오류가 발생했습니다" } },
      { status: 500 }
    );
  }
}
