"use client";

// 라우트 렌더링 중 발생한 예외를 잡는 App Router 에러 바운더리.
export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-semibold">페이지를 표시하는 중 문제가 발생했습니다.</p>
      <p className="text-sm text-gray-400 break-all max-w-md">
        {error?.message || "알 수 없는 오류"}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
      >
        다시 시도
      </button>
    </div>
  );
}
