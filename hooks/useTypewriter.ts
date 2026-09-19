"use client";

import { useEffect, useState } from "react";

export function useTypewriter(text: string, active: boolean, msPerChar = 35) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) {
      setDisplayed("");
      setDone(false);
      return;
    }

    setDisplayed("");
    setDone(false);
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, msPerChar);

    return () => clearInterval(timer);
  }, [text, active, msPerChar]);

  return { displayed, done };
}
