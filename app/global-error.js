"use client";

// 루트 레이아웃 자체에서 예외가 났을 때의 최후 폴백. <html>/<body>를 직접 렌더한다.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="ko">
      <body className="bg-black text-white">
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg font-semibold">문제가 발생했습니다.</p>
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
      </body>
    </html>
  );
}
