'use client';
import { useEffect } from 'react';

export default function ForceViewport() {
  useEffect(() => {
    const existing = document.querySelector('meta[name="viewport"]');
    if (existing) {
      existing.setAttribute('content', 'width=1024, user-scalable=no, maximum-scale=1');
      console.log("✅ viewport 내용 덮어쓰기 완료!");
    } else {
      // 없으면 새로 추가
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=1024, user-scalable=no, maximum-scale=1';
      document.head.appendChild(meta);
      console.log("✅ viewport 새로 생성!");
    }
  }, []);

  return null;
}
