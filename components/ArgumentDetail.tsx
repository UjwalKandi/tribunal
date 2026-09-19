"use client";

import type { DefenseOutput, ProsecutionOutput } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";

/**
 * The structured detail each office produces alongside its prose. All of this was
 * already validated by lib/schemas.ts and carried to the client, but never rendered —
 * it is what makes the centre column read as a filing rather than three paragraphs.
 */

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1">
      <span className="w-[86px] shrink-0 font-mono text-[9.5px] uppercase leading-[1.7] tracking-[0.14em] text-[#5E5E66]">
        {label}
      </span>
      <span className="font-serif text-[13.5px] leading-[1.55] text-tribunal-muted">
        {value}
      </span>
    </div>
  );
}

export function ProsecutionDetail({ output }: { output: ProsecutionOutput }) {
  return (
    <div className="mt-5 max-w-[72ch] border-t border-tribunal-rule pt-4">
      <FieldRow label="Respondent" value={output.respondent} />

      <ol className="mt-3 space-y-3">
        {output.claims.map((claim, i) => (
          <li key={i}>
            <div className="flex gap-3">
              <span className="w-[86px] shrink-0 font-mono text-[9.5px] uppercase leading-[1.7] tracking-[0.14em] text-[#5E5E66]">
                Claim {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[13.5px] leading-[1.55] text-tribunal-text">
                  {claim.claim}
                </p>
                {/* Literal fragment lifted from the traceback — never paraphrased. */}
                <p className="mt-1.5 border-l-2 border-tribunal-prosecution bg-[#150F0E] py-1 pl-2.5 pr-2 font-mono text-[11px] leading-[1.6] text-[#D9A49C]">
                  {claim.evidence}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-3 border-t border-tribunal-rule pt-2">
        <FieldRow label="Harm" value={output.harm} />
        <FieldRow label="Motion" value={output.motion} />
      </div>
    </div>
  );
}

const THEORY_LABEL: Record<DefenseOutput["theory"], string> = {
  UPSTREAM_CAUSE: "Upstream cause",
  PRECEDENT_HARM: "Precedent harm",
  INSUFFICIENT_EVIDENCE: "Insufficient evidence",
};

export function DefenseDetail({
  output,
  droppedCitations,
}: {
  output: DefenseOutput;
  droppedCitations: string[];
}) {
  return (
    <div className="mt-5 max-w-[72ch] border-t border-tribunal-rule pt-4">
      <div className="flex items-center gap-3 py-1">
        <span className="w-[86px] shrink-0 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#5E5E66]">
          Theory
        </span>
        <Badge variant="p2">{THEORY_LABEL[output.theory]}</Badge>
      </div>

      {output.cited_precedents.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[#5E5E66]">
            Authorities cited
          </p>
          <ul className="space-y-2">
            {output.cited_precedents.map((c) => (
              <li key={c.citation} className="flex gap-3">
                <span className="w-[86px] shrink-0 font-mono text-[11px] font-medium tabular-nums text-tribunal-authority">
                  {c.citation}
                </span>
                <span className="font-serif text-[13.5px] leading-[1.55] text-tribunal-muted">
                  {c.relevance}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 border-t border-tribunal-rule pt-2">
        <FieldRow label="Alternative" value={output.alternative} />
      </div>

      {/* The anti-fabrication guard in lib/schemas.ts already produces this. */}
      {droppedCitations.length > 0 && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6E6E77]">
          {droppedCitations.length} fabricated citation
          {droppedCitations.length === 1 ? "" : "s"} stricken from the record
        </p>
      )}
    </div>
  );
}
