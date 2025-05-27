"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const router = useRouter();
  const chatContainerRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { type: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: input.trim() }),
    });
    const data = await response.json();
    const assistantMessage = {
      type: "bot",
      content: data.answer || "답변을 불러올 수 없습니다.",
    };
    setMessages((prev) => [...prev, assistantMessage]);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* 네비게이션 */}
      <nav className="flex justify-start items-center space-x-6 bg-gray-800 p-2 rounded-lg shadow-md text-lg font-bold tracking-widest pl-4">
                {/* 로고 */}
                <div className="relative w-12 h-12">
                <Image src="/icons/logo.png" alt="Logo" fill className="object-contain" />
                </div>
                
                {/* 네비게이션 버튼 */}
                {[
                  { name: "home", path: "/" },
                  { name: "rule", path: "/rule" },
                  { name: "setting", path: "/setting" },
                  { name: "user", path: "/user" },
                  { name: "history", path: "/history" },
                  { name: "ready", path: "/ready" },
                  { name: "prize", path: "/prize" },
                   { name: "gpt", path: "/chat" }
                ].map(({ name, path }) => (
                  <button
                    key={name}
                    onClick={() => {
                      router.push(path); // ✅ 실제로 이동
                    }}
                    className="w-28 h-8 flex items-center justify-center md:w-36 md:h-10"
                    style={{
                      backgroundImage: `url('/icons/nav/${name}.png')`,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundImage = `url('/icons/nav/${name}_hover.png')`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundImage = `url('/icons/nav/${name}.png')`}
                  />
                ))}
            </nav>

      {/* 초기 메시지 / 입력 대기 */}
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center flex-col mt-20">
          <h1 className="text-2xl md:text-3xl mb-6 text-center font-bold">어디서부터 시작할까요?</h1>
          <form
            onSubmit={handleSubmit}
            className="bg-gray-800 p-4 rounded-2xl flex items-center w-full max-w-2xl shadow-md"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-400"
              placeholder="무엇이든 물어보세요"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-semibold ml-2"
            >
              전송
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* 대화창 */}
          <div className="flex-1 overflow-y-auto px-6 pt-6 space-y-4" ref={chatContainerRef}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`whitespace-pre-wrap px-4 py-3 rounded-xl max-w-2xl mx-auto text-base leading-relaxed shadow-md ${
                  msg.type === "user"
                    ? "bg-blue-600 text-white self-end"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>

          {/* 입력창 */}
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 p-4 border-t border-gray-700 flex items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-gray-800 text-white p-3 rounded-md focus:outline-none"
              placeholder="질문을 입력하세요..."
            />
            <button
              type="submit"
              className="ml-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-md font-semibold"
            >
              전송
            </button>
          </form>
        </>
      )}
    </div>
  );
}