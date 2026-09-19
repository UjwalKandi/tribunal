"use client";

import type { Incident } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/**
 * EXHIBIT A — the incident as filed.
 *
 * The PRD's credibility requirement rests on this text being real and visible: "If a
 * judge reads a case and thinks 'I have had this exact bug,' the theater collapses into
 * engineering and we win." It was previously computed and never rendered.
 *
 * incident.raw_log holds the verbatim GitHub issue body, so it is Markdown rather than a
 * bare traceback. Rendering its actual structure — sections, code exhibits, enumerated
 * findings — is both truer to the source and far more document-like than a flat dump.
 * Deliberately a small hand-rolled subset: no Markdown dependency is permitted here.
 */

type Block =
  | { kind: "heading"; text: string }
  | { kind: "code"; lang: string; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "check"; text: string; done: boolean }
  | { kind: "para"; text: string };

const FENCE = /^```(\w*)/;
const HEADING = /^#{2,4}\s+(.*)$/;
const CHECK = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/;
const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBER = /^\s*\d+\.\s+(.*)$/;
/** Applied only inside code exhibits, where it actually means something. */
const FAULT = /(Traceback|^\s*raise\s|[A-Za-z_.]*(?:Error|Exception)\b|\b404\b|\bFAILED\b)/;

function parse(source: string): Block[] {
  const lines = source.replace(/\s+$/, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ kind: "para", text: para.join(" ") });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ kind: "list", ...list });
    list = null;
  };
  const flushAll = () => {
    flushPara();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(FENCE);

    if (fence) {
      flushAll();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      blocks.push({ kind: "code", lang: fence[1] || "text", lines: body });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      flushAll();
      blocks.push({ kind: "heading", text: heading[1] });
      continue;
    }

    const check = line.match(CHECK);
    if (check) {
      flushAll();
      blocks.push({ kind: "check", done: check[1].toLowerCase() === "x", text: check[2] });
      continue;
    }

    const bullet = line.match(BULLET);
    const numbered = line.match(NUMBER);
    if (bullet || numbered) {
      flushPara();
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((numbered ?? bullet)![1]);
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    flushList();
    para.push(line);
  }

  flushAll();
  return blocks;
}

/** Inline `code` and **bold**. Matched by delimiter, not by a stateful /g regex. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
        if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded-sm bg-tribunal-raised px-1 py-px font-mono text-[0.88em] text-[#C8C8D0]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-tribunal-text">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

function CodeExhibit({ lang, lines }: { lang: string; lines: string[] }) {
  return (
    <figure className="border border-tribunal-border bg-tribunal-surface">
      <figcaption className="border-b border-tribunal-rule px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#5E5E66]">
        {lang}
      </figcaption>
      <pre className="overflow-x-auto px-3 py-2 font-mono text-[11.5px] leading-[1.65]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(FAULT.test(line) ? "text-[#D9A49C]" : "text-tribunal-muted")}
          >
            {line || " "}
          </div>
        ))}
      </pre>
    </figure>
  );
}

export function ExhibitLog({ incident }: { incident: Incident }) {
  const blocks = parse(incident.raw_log);
  const repo = incident.source_url?.match(/github\.com\/([^/]+\/[^/]+)/)?.[1];

  return (
    <section>
      <div className="rule-label mb-2">
        <span>Exhibit A — Incident as Filed</span>
      </div>

      <div className="mb-3 flex items-baseline justify-between gap-4">
        <p className="truncate font-mono text-[11px] text-tribunal-muted">
          {repo ?? incident.service}
          {incident.dag_id ? ` · ${incident.dag_id}` : ""}
        </p>
        {incident.source_url && (
          <a
            href={incident.source_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-tribunal-muted underline decoration-tribunal-rule underline-offset-4 transition-colors hover:text-tribunal-authority"
          >
            Source ↗
          </a>
        )}
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto border-y border-tribunal-border py-4 pr-3">
        {blocks.map((block, i) => {
          switch (block.kind) {
            case "heading":
              return (
                <p
                  key={i}
                  className="pt-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-tribunal-authority"
                >
                  {block.text}
                </p>
              );

            case "code":
              return <CodeExhibit key={i} lang={block.lang} lines={block.lines} />;

            case "check":
              return (
                <p
                  key={i}
                  className="flex gap-2 font-mono text-[11px] leading-[1.6] text-[#5E5E66]"
                >
                  <span className={block.done ? "text-tribunal-authority" : undefined}>
                    {block.done ? "[x]" : "[ ]"}
                  </span>
                  <span>{block.text}</span>
                </p>
              );

            case "list":
              return (
                <ol key={i} className="space-y-1.5">
                  {block.items.map((item, n) => (
                    <li key={n} className="flex gap-2.5">
                      <span className="w-4 shrink-0 text-right font-mono text-[11px] tabular-nums leading-[1.75] text-[#5E5E66]">
                        {block.ordered ? `${n + 1}.` : "—"}
                      </span>
                      <span className="font-serif text-[13.5px] leading-[1.6] text-[#B6B6BD]">
                        <Inline text={item} />
                      </span>
                    </li>
                  ))}
                </ol>
              );

            default:
              return (
                <p
                  key={i}
                  className="max-w-[78ch] font-serif text-[13.5px] leading-[1.6] text-[#B6B6BD]"
                >
                  <Inline text={block.text} />
                </p>
              );
          }
        })}
      </div>
    </section>
  );
}
