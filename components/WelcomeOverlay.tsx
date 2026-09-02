"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BATCH_LABEL } from "@/lib/config";

export default function WelcomeOverlay({
  name,
  company,
  cityName,
}: {
  name: string;
  company: string;
  cityName: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = "tpl_welcomed";
    if (!sessionStorage.getItem(key)) {
      setShow(true);
      sessionStorage.setItem(key, "1");
    }
  }, []);

  const dots = Array.from({ length: 14 });

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm"
          onClick={() => setShow(false)}
        >
          {dots.map((_, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 0, x: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-10, -140 - Math.random() * 80],
                x: (Math.random() - 0.5) * 260,
              }}
              transition={{
                duration: 2.2 + Math.random(),
                delay: 0.2 + i * 0.06,
                ease: "easeOut",
              }}
              className="pointer-events-none absolute h-2 w-2 rounded-full"
              style={{
                background: i % 2 === 0 ? "rgb(var(--color-amber))" : "rgb(var(--color-signal))",
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card mx-5 max-w-sm p-8 text-center"
          >
            <p className="font-mono text-xs uppercase tracking-widest2 text-amber">
              {BATCH_LABEL}
            </p>
            <h2 className="mt-3 font-mono text-2xl font-bold text-paper">
              Congratulations, {name.split(" ")[0] || "batchmate"}! 🎉
            </h2>
            <p className="mt-3 text-sm text-slate">
              On landing {company ? `your role at ${company}` : "your offer"} — welcome
              to the {cityName} gate. Your batch is right here with you.
            </p>
            <button
              onClick={() => setShow(false)}
              className="mt-6 w-full rounded bg-amber px-5 py-2.5 text-sm font-semibold text-ink hover:bg-amber/90"
            >
              Let's go
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
