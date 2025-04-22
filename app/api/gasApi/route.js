const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;

console.log("🌐 GAS_URL:", process.env.NEXT_PUBLIC_GAS_URL);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const username = searchParams.get("username"); // 👈 추가
  const season = searchParams.get("season");     // 👈 필요한 다른 파라미터도 여기에 추가 가능

  // 모든 쿼리 파라미터를 조립
  const query = new URLSearchParams({
    action,
    ...(username ? { username } : {}),
    ...(season ? { season } : {})
  });

  const url = `${GAS_URL}?${query.toString()}`;
  console.log("🚀 GAS 요청 URL:", url);

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("✅ GAS 응답 데이터:", data);

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
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

    const text = await response.text(); // ← 먼저 문자열로
    console.log("📄 응답 원문:", text);

    const data = JSON.parse(text); // ← 직접 파싱

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



