# AI grounding and marketing safety

## Invariants

1. A photo detection is a suggestion, not evidence of a property fact.
2. Every analyzed feature is stored as `PENDING` regardless of model confidence.
3. Only an authenticated owner can explicitly verify or reject a feature.
4. The server's context builder filters both status (`VERIFIED`) and allowed labels.
5. Pending and rejected detections never enter the listing provider's evidence object.
6. Provider output is reviewed by an independent validation step and a human.
7. No client flag can turn an unsupported claim into `SUPPORTED`.
8. Changing evidence invalidates content readiness; slow generations cannot save against stale evidence.

These properties are enforced in server business logic and tested with real PostgreSQL. The critical regression test spies on the real provider boundary, first with pending/rejected detections, then after explicit verification. It inspects the context rather than merely checking that a UI badge changed.

## Evidence policy

Allowed context consists of address/location fields, entered price, beds, baths, square feet, property type, year built, optional lot size (square feet), and verified feature labels. Owner identity, private notes, filenames, storage paths and raw model detections are omitted. The catalog uses cautious terms such as “hardwood-style flooring.” A photo cannot establish material authenticity, renovation date, school quality, crime rates, dimensions, accessibility compliance or neighborhood demographics.

Agent-entered facts and verification can themselves be wrong. This system tracks a trust decision; it cannot independently establish physical truth. There is no model confidence percentage because no calibration study was performed.

## Two separate systems

Generation uses the narrow evidence projection and instructions that prohibit invented facts or protected-class targeting. Claim extraction and validation run after generation. They do not reuse a model's self-reported claim that its output is accurate. The original output and evidence snapshot are retained; edited content receives new validation results against current evidence.

The current validator is deterministic, English-oriented and conservative. It splits sentences and selected conjunctions, matching normalized atomic fact templates. Unsupported atoms become `UNVERIFIED`. A small pattern list flags explicit audience, protected-class, accessibility and unsupported neighborhood language as `POTENTIALLY_MISLEADING`.

This approach favors explainability over paraphrase coverage. “3 bedrooms” matches a stored bedroom count. “Three bedrooms” currently needs editing. “Features kitchen island with renovated kitchen” supports only the first atom; it does not establish renovation. A missed discriminatory euphemism or badly segmented assertion can still slip through; `SUPPORTED` means the checker found an evidence match, not that all statements are legally appropriate.

## Resolving flagged claims

The reviewer may remove the containing sentence, edit text and rerun validation, correct property fields, verify an applicable photo feature, or regenerate with a different style/length. Unrelated prose cannot be marked supported by clicking a claim override. Evidence changes trigger review invalidation. There is no automatic publication or MLS submission.

The application does not promise legal compliance, infer protected characteristics, or advise agents to target classes of people. Descriptions should focus on the property. The UI clearly states that agents remain responsible for review and applicable housing, MLS and advertising requirements.

## Provider and privacy considerations

`MOCK_AI=true` makes no external AI requests. Its analysis returns sample suggestions without inspecting the image; the UI says so. Live vision sends the normalized photo to the configured provider; live text generation sends structured property facts, including address, and verified labels. Before live use, review the provider's data retention, regional processing, training-use and contractual terms, and obtain necessary rights to uploaded photos. Original EXIF metadata is stripped locally.

Secrets remain on the server. HTTPS and redirect refusal reduce accidental credential forwarding. Endpoint configuration is a trusted deployment setting, never browser input. A compatible provider must support image inputs and JSON response format for analysis. No live provider was evaluated in the initial build.

## Evaluation and next steps

Automated tests demonstrate code invariants, not model accuracy. Build an independently labeled adversarial dataset before claiming claim-extraction recall, legal-risk coverage or vision precision. Include compound claims, negation, units, decimals, subtle targeting, prompt injection in field values, paraphrases, conflicting observations and stale evidence. Any future semantic extractor should retain deterministic ownership/evidence boundaries and conservative fallback behavior.
