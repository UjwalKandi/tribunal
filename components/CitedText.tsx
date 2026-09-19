"use client";

/**
 * Renders body text with TRIB-#### citations set in brass.
 *
 * Safe against partial text from the typewriter: an incomplete token simply does not
 * match yet and is rendered plain until the remaining characters arrive.
 */

/** Capturing + global so String.split keeps the delimiters. */
const SPLIT_ON_CITATION = /(TRIB-\d{4})/g;
/** Separate, non-global: a /g regex carries lastIndex between .test() calls. */
const IS_CITATION = /^TRIB-\d{4}$/;

interface CitedTextProps {
  text: string;
  className?: string;
}

export function CitedText({ text, className }: CitedTextProps) {
  const parts = text.split(SPLIT_ON_CITATION);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        IS_CITATION.test(part) ? (
          <span
            key={i}
            className="font-mono text-[0.92em] font-medium tracking-tight text-tribunal-authority"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}
