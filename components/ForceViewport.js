'use client';

import { useEffect } from 'react';

export default function ForceViewport() {
  useEffect(() => {
    // 기존 viewport 메타 태그 제거
    const oldViewport = document.querySelector('meta[name="viewport"]');
    if (oldViewport) {
      oldViewport.remove();
      console.log("🧹 기존 viewport 삭제됨!");
    }

    // 새로운 viewport 메타 태그 생성 및 삽입
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=1024';
    document.head.appendChild(meta);
    console.log("✅ 새 viewport 설정됨: width=1024");
  }, []);

  return null;
}
