"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!key) {
      const autoKey = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
      setKey(autoKey);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, key, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "프로젝트 생성 실패");
      }

      const { data } = await res.json();
      router.push(`/${data.key}/board`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <a href="/" className="text-xl font-bold text-zinc-900 dark:text-white">
            TaskManager
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-16">
        <h2 className="mb-8 text-2xl font-semibold text-zinc-900 dark:text-white">
          새 프로젝트 생성
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              프로젝트 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="예: TaskManager"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-zinc-700"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              프로젝트 키
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="예: TASK"
              required
              maxLength={10}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-mono text-zinc-900 uppercase outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-zinc-700"
            />
            <p className="mt-1 text-xs text-zinc-400">
              태스크 키에 사용됩니다 (예: {key || "TASK"}-1, {key || "TASK"}-2)
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              설명 <span className="text-zinc-400">(선택)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트에 대한 간단한 설명"
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-zinc-700"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !name || !key}
              className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "생성 중..." : "프로젝트 생성"}
            </button>
            <a
              href="/"
              className="rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              취소
            </a>
          </div>
        </form>
      </main>
    </div>
  );
}
