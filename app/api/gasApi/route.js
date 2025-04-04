const GAS_URL = "https://script.google.com/macros/s/AKfycbykbX8vsvwIJlzq-F7Yk2bv5ZB2pHBg986xASsITj5rK7tgrXnLyF7XChKGNRDZntxE/exec"; // ✅ 실제 GAS 배포 URL

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  

  const url = `${GAS_URL}?action=${action}`;
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
  const body = await req.json();
  const { action, players } = body;

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, players }),
    });

    const data = await response.json();
    console.log("✅ [POST] GAS 응답 데이터:", data);

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

