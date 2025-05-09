"use client";

export default function TooltipWrapper({ children, content }) {
  return (
    <div className="relative group inline-block cursor-default">
      {children}
      <div className="absolute z-50 hidden group-hover:flex flex-col gap-1 bg-gray-800 text-white text-sm px-3 py-2 rounded shadow-xl border border-gray-700 w-max max-w-xs top-[-10px] left-1/2 -translate-x-1/2">
        {content}
      </div>
    </div>
  );
}
