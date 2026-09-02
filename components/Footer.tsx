import { COMMUNITY_LABEL } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="border-t border-inkline px-5 py-8 text-center">
      <p className="font-mono text-xs text-slate">
        Made with <span className="text-rust">♥</span> by {COMMUNITY_LABEL}
      </p>
    </footer>
  );
}
