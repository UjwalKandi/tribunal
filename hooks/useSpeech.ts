"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeech() {
  const [muted, setMuted] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(
    (text: string) => {
      if (muted || typeof window === "undefined" || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const neutral =
        voices.find((v) => v.lang.startsWith("en") && v.name.includes("Samantha")) ??
        voices.find((v) => v.lang.startsWith("en-US")) ??
        voices[0];
      if (neutral) utterance.voice = neutral;

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [muted],
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, muted, setMuted, toggleMute: () => setMuted((m) => !m) };
}
