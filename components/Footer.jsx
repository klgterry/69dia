// components/Footer.jsx
export default function Footer() {
  return (
    <footer className="w-full bg-slate-900 border-t border-slate-800 py-4 text-center text-sm text-gray-400 leading-relaxed">
      © {new Date().getFullYear()} 디아블로2 69 내전기록실 <br />
      Developer 마인드, QA & Planner 린스, Design 블핑, 울프, Investment 민형
    </footer>
  );
}
