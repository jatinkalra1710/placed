"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("tpl_install_dismissed");
    if (dismissed) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    function onBeforeInstall(e: any) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIOS) {
      const t = setTimeout(() => setShowIOS(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setShowAndroid(false);
    setShowIOS(false);
    localStorage.setItem("tpl_install_dismissed", "1");
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowAndroid(false);
    localStorage.setItem("tpl_install_dismissed", "1");
  }

  return (
    <AnimatePresence>
      {(showAndroid || showIOS) && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="glass-card fixed inset-x-4 bottom-20 z-40 flex items-center gap-3 p-3.5 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-80"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber">
            {showIOS ? <Share size={16} /> : <Download size={16} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-paper">
              {showIOS ? "Add to your Home Screen" : "Install TIET 2027 Community"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate">
              {showIOS
                ? "Tap Share, then \"Add to Home Screen\" — opens instantly next time."
                : "One tap, opens like an app — no browser bar."}
            </p>
          </div>
          {!showIOS && (
            <button
              onClick={install}
              className="shrink-0 rounded-full bg-amber px-3 py-1.5 text-[11px] font-semibold text-ink hover:bg-amber/90"
            >
              Install
            </button>
          )}
          <button onClick={dismiss} className="shrink-0 text-slate hover:text-paper">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
