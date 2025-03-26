'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ViewportFixer() {
  const pathname = usePathname();

  useEffect(() => {
    const existing = document.querySelector('meta[name="viewport"]');

    if (existing) {
      existing.setAttribute('content', 'width=1024, user-scalable=no, maximum-scale=1');
      console.log("✅ Viewport 덮어쓰기 완료!");
    } else {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=1024, user-scalable=no, maximum-scale=1';
      document.head.appendChild(meta);
      console.log("✅ Viewport 새로 삽입!");
    }
  }, [pathname]); // ✅ 경로 변경될 때마다 다시 적용

  return null;
}
