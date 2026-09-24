"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeech() {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    utteranceRef.current = null;
    window.speechSynthesis.pause();
    window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (mutedRef.current || typeof window === "undefined" || !window.speechSynthesis) {
        return;
      }

      stop();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const neutral =
        voices.find((v) => v.lang.startsWith("en") && v.name.includes("Samantha")) ??
        voices.find((v) => v.lang.startsWith("en-US")) ??
        voices[0];
      if (neutral) utterance.voice = neutral;

      utterance.onend = () => {
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [stop],
  );

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      mutedRef.current = next;
      if (next) stop();
      return next;
    });
  }, [stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, stop, muted, setMuted, toggleMute };
}
