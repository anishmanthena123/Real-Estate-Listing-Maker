import type { ClaimStatus } from '@prisma/client';
import type { GroundedContext } from './grounding';
export type ValidatedClaim = {
  text: string;
  sentence: string;
  status: ClaimStatus;
  reason: string;
  evidence: string | null;
};
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '');
const safety =
  /\b(perfect for families|family[- ]friendly|safe neighborhood|exclusive community|no children|adults only|christian|muslim|jewish|race|religion|ethnicity|disabled|able[- ]bodied|wheelchair|young professionals|ideal for couples|walking distance|best schools|low crime)\b/i;
export function factSentences(
  context: GroundedContext,
): { text: string; evidence: string }[] {
  const p = context.property;
  return [
    {
      text: `Located at ${p.address}, ${p.city}, ${p.state} ${p.zipCode}`,
      evidence: 'property.address/city/state/zipCode',
    },
    { text: `${p.bedrooms} bedrooms`, evidence: 'property.bedrooms' },
    { text: `${p.bathrooms} bathrooms`, evidence: 'property.bathrooms' },
    { text: `${p.squareFeet} square feet`, evidence: 'property.squareFeet' },
    { text: `Listed at $${p.price}`, evidence: 'property.price' },
    { text: `Built in ${p.yearBuilt}`, evidence: 'property.yearBuilt' },
    {
      text: `Property type: ${p.propertyType}`,
      evidence: 'property.propertyType',
    },
    ...(p.lotSize
      ? [
          {
            text: `Lot size: ${p.lotSize} square feet`,
            evidence: 'property.lotSize',
          },
        ]
      : []),
    ...context.verifiedFeatures.map((label) => ({
      text: `Features ${label}`,
      evidence: `verified feature: ${label}`,
    })),
  ];
}
// Deliberately conservative: exact normalized facts support only atomic clauses, never an entire embellished sentence.
export function validateClaims(
  text: string,
  context: GroundedContext,
): ValidatedClaim[] {
  const facts = factSentences(context);
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.flatMap<ValidatedClaim>((sentence) => {
    // Preserve exact address clauses before splitting commas or conjunctions.
    const exact = facts.find((f) => normalize(f.text) === normalize(sentence));
    if (safety.test(sentence))
      return [
        {
          text: sentence,
          sentence,
          status: 'POTENTIALLY_MISLEADING' as const,
          reason:
            'Protected-class, audience-targeting, accessibility, or unsupported neighborhood language requires review.',
          evidence: null,
        },
      ];
    if (exact)
      return [
        {
          text: sentence,
          sentence,
          status: 'SUPPORTED' as const,
          reason: 'Matches an explicit structured fact or verified feature.',
          evidence: exact.evidence,
        },
      ];
    return sentence
      .split(/\s+(?:and|with)\s+|;\s*/i)
      .filter(Boolean)
      .map((atom) => {
        const found = facts.find((f) => normalize(f.text) === normalize(atom));
        return {
          text: atom.trim(),
          sentence,
          status: found ? ('SUPPORTED' as const) : ('UNVERIFIED' as const),
          reason: found
            ? 'Matches an explicit structured fact or verified feature.'
            : 'No exact evidence match. This may be unsupported or a paraphrase the conservative validator cannot resolve.',
          evidence: found?.evidence ?? null,
        };
      });
  });
}
