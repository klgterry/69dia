const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;

// GAS(Google Apps Script)는 부하가 걸리면 응답이 느려지거나
// 간헐적으로 HTML 오류 페이지 / 빈 본문을 돌려준다.
// GET(읽기 전용)은 짧은 백오프 후 한 번 재시도한다.
const GET_MAX_ATTEMPTS = 2;
const GET_RETRY_DELAY_MS = 1000;
const PER_ATTEMPT_TIMEOUT_MS = 45000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function json(body, status) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function notConfigured() {
  return json({ error: "GAS_URL not configured" }, 500);
}

function isValidJson(text) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

export async function GET(req) {
  if (!GAS_URL) return notConfigured();

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "";
  const username = searchParams.get("username") || "";
  const season = searchParams.get("season") || "";
  const playerA = searchParams.get("playerA") || "";
  const playerB = searchParams.get("playerB") || "";
  const limit = searchParams.get("limit") || "";

  // 화이트리스트 방식: 허용된 파라미터만 GAS로 전달
  const query = new URLSearchParams({
    ...(action && { action }),
    ...(username && { username }),
    ...(season && { season }),
    ...(playerA && { playerA }),
    ...(playerB && { playerB }),
    ...(limit && { limit }),
  });
  const url = `${GAS_URL}?${query.toString()}`;

  let lastDetail = "no response";
  let lastStatus = 502;

  for (let attempt = 1; attempt <= GET_MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) await sleep(GET_RETRY_DELAY_MS);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS),
      });
      const text = await response.text();

      if (response.ok && isValidJson(text)) {
        return json(text, 200);
      }

      if (response.ok) {
        lastDetail = `GAS가 JSON이 아닌 응답을 반환 (HTTP ${response.status})`;
        lastStatus = 502;
      } else if (response.status >= 500 || response.status === 429) {
        lastDetail = `GAS HTTP ${response.status}`;
        lastStatus = 502;
      } else {
        // 4xx (429 제외): 재시도해도 소용 없음
        return json(
          { error: "GAS 요청 실패", details: `GAS HTTP ${response.status}` },
          response.status
        );
      }
    } catch (error) {
      lastDetail = error.name === "TimeoutError" ? "GAS 응답 시간 초과" : error.message;
      lastStatus = 504;
    }
  }

  console.error("🚨 GAS GET 실패(재시도 소진):", action, lastDetail);
  return json({ error: "GAS 요청 실패", details: lastDetail }, lastStatus);
}

export async function POST(req) {
  if (!GAS_URL) return notConfigured();

  // POST(결과 등록 등)는 멱등하지 않으므로 재시도하지 않는다.
  try {
    const body = await req.json();
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();

    if (!isValidJson(text)) {
      console.error("🚨 [POST] GAS가 JSON이 아닌 응답을 반환");
      return json(
        { error: "GAS invalid response", details: text.slice(0, 500) },
        502
      );
    }
    return json(text, response.status);
  } catch (error) {
    console.error("🚨 [POST] GAS API 호출 오류:", error.message);
    return json({ error: "GAS 요청 실패", details: error.message }, 500);
  }
}
