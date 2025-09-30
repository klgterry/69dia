const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;

console.log("🌐 GAS_URL:", process.env.NEXT_PUBLIC_GAS_URL);

export async function GET(req) {
  if (!GAS_URL) {
    return new Response(JSON.stringify({ error: "GAS_URL not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(req.url);
  const action   = searchParams.get("action") || "";
  const username = searchParams.get("username") || "";
  const season   = searchParams.get("season")   || "";
  const playerA  = searchParams.get("playerA")  || "";   // ✅ 추가
  const playerB  = searchParams.get("playerB")  || "";   // ✅ 추가
  const limit    = searchParams.get("limit")    || "";   // (옵션) getHeadToHead에서 씀

  // ✅ 필요한 파라미터 전부 전달 (화이트리스트 방식 유지)
  const query = new URLSearchParams({
    ...(action   && { action }),
    ...(username && { username }),
    ...(season   && { season }),
    ...(playerA  && { playerA }),
    ...(playerB  && { playerB }),
    ...(limit    && { limit }),
  });

  const url = `${GAS_URL}?${query.toString()}`;
  console.log("🚀 GAS 요청 URL:", url);

  try {
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();
    // GAS가 text를 돌려줄 때 대비
    let data; try { data = JSON.parse(text); } catch { data = text; }

    console.log("✅ GAS 응답 데이터:", data);
    return new Response(typeof data === "string" ? text : JSON.stringify(data), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
      status: response.status,
    });
  } catch (error) {
    console.error("🚨 GAS API 호출 오류:", error.message);
    return new Response(JSON.stringify({ error: "GAS 요청 실패", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    console.log("📄 응답 원문:", text);

    const data = JSON.parse(text);
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("🚨 [POST] GAS API 호출 오류:", error.message);
    return new Response(JSON.stringify({ error: "GAS 요청 실패", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
