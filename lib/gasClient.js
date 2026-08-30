// GAS 프록시(/api/gasApi) 호출용 공용 클라이언트.
// 아래 세 가지를 한곳에서 처리한다.
//  1) HTTP 상태 확인 (!res.ok → 에러)
//  2) 비정상(비 JSON) 응답 감지
//  3) GAS가 { error: "..." } 로 돌려주는 애플리케이션 에러 감지
// 실패는 모두 GasError로 던진다.

export class GasError extends Error {
  constructor(message, { status, action, cause } = {}) {
    super(message);
    this.name = "GasError";
    this.status = status;
    this.action = action;
    if (cause) this.cause = cause;
  }
}

async function parseOrThrow(res, action) {
  const text = await res.text();

  if (!res.ok) {
    throw new GasError(`GAS 요청 실패: ${action} (HTTP ${res.status})`, {
      status: res.status,
      action,
    });
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new GasError(`GAS 응답을 해석할 수 없습니다: ${action}`, { action, cause: e });
  }

  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.error
  ) {
    throw new GasError(`GAS 오류: ${data.error}`, { action });
  }

  return data;
}

/**
 * GET /api/gasApi?action=...&<params>
 * @param {string} action
 * @param {Record<string, string|number>} [params] action 외 추가 쿼리 파라미터
 */
export async function gasGet(action, params = {}) {
  const qs = new URLSearchParams({ action });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  }

  const res = await fetch(`/api/gasApi?${qs.toString()}`);
  return parseOrThrow(res, action);
}

/**
 * POST /api/gasApi  (body: { action, ...payload })
 * @param {string} action
 * @param {Record<string, unknown>} [payload]
 */
export async function gasPost(action, payload = {}) {
  const res = await fetch("/api/gasApi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  return parseOrThrow(res, action);
}
