import { Geist, Geist_Mono } from "next/font/google";
import ViewportFixer from './ViewportFixer'; // 경로에 맞게 수정
import "./globals.css";

export function generateMetadata() {
  return {
    title: "69 내전기록실",
    description: "디스코드 기반 팀 생성 도우미",
    openGraph: {
      title: "69 내전기록실",
      description: "최고의 팀 생성 도우미, 디스코드와 함께!",
      url: "https://69dia.vercel.app",
      siteName: "69 내전기록실",
      images: [
        {
          url: "https://69dia.vercel.app/og_image.png",
          width: 1200,
          height: 630,
          alt: "69 내전기록실 썸네일",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "69 내전기록실",
      description: "최고의 팀 생성 도우미, 디스코드와 함께!",
      images: ["https://69dia.vercel.app/og_image.png"],
    },
  };
}


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ViewportFixer /> {/* 💥 모든 페이지에서 강제 적용 */}
        {children}
      </body>
    </html>
  );
}

