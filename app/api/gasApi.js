export async function getUserInfo(username) {
    const NEXT_API_URL = "/api/gasApi"; // 🚀 Next.js 내부 API 경로 사용
  
    try {
      const response = await fetch(`${NEXT_API_URL}?action=getUserInfo&username=${username}`);
      if (!response.ok) {
        throw new Error("서버 응답 오류");
      }
      return await response.json();
    } catch (error) {
      console.error("🚨 getUserInfo 오류:", error);
      return { error: "데이터를 불러오지 못했습니다." };
    }
  }