"use client";

// 데이터 로딩 실패 시 스피너/빈 화면 대신 보여주는 공용 에러 표시.
export default function LoadError({
  message = "데이터를 불러오지 못했습니다.",
  onRetry,
}) {
  return (
    <div className="mx-auto my-4 max-w-md rounded-lg border border-red-500/40 bg-red-900/20 p-4 text-center text-sm text-red-200">
      <p>⚠️ {message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded bg-red-700/60 px-3 py-1 text-xs text-white hover:bg-red-600"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
