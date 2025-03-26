'use client';
import { useEffect, useState } from 'react';

export default function LayoutWrapper({ children }) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        minWidth: "1024px",
        transform: isMobile ? "scale(0.4)" : "none",
        transformOrigin: "top left",
      }}
    >
      {children}
    </div>
  );
}
