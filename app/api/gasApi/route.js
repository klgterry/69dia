const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;

function notConfigured() {
  return new Response(JSON.stringify({ error: "GAS_URL not configured" }), {
    status: 500,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// GAS 응답 텍스트를 JSON으로 파싱해 Response로 감싼다.
// GAS가 JSON이 아닌 응답(HTML 오류 페이지 등)을 주면 502로 정규화한다.
function jsonResponse(text, status) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return new Response(
      JSON.stringify({
        error: "GAS invalid response",
        details: text.slice(0, 500),
      }),
      { status: 502, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
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

  try {
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();
    return jsonResponse(text, response.status);
  } catch (error) {
    console.error("🚨 GAS API 호출 오류:", error.message);
    return new Response(
      JSON.stringify({ error: "GAS 요청 실패", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}

export async function POST(req) {
  if (!GAS_URL) return notConfigured();

  try {
    const body = await req.json();
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return jsonResponse(text, response.status);
  } catch (error) {
    console.error("🚨 [POST] GAS API 호출 오류:", error.message);
    return new Response(
      JSON.stringify({ error: "GAS 요청 실패", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
}
