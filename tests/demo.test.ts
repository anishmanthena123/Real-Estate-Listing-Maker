import { describe, expect, it } from 'vitest';
import {
  freshProperties,
  demoContext,
  generateDemo,
  reviewDemo,
  canMarkReady,
} from '../src/demo/model';
describe('static demo shares full-app grounding and claim rules', () => {
  it('never passes pending or rejected suggestions into generated text', () => {
    const property = freshProperties()[0];
    property.features[1].status = 'REJECTED';
    expect(demoContext(property).verifiedFeatures).toEqual([]);
    expect(generateDemo(property, 'Long', 'MLS description')).not.toMatch(
      /kitchen island|large windows|pool/,
    );
  });
  it('allows an explicitly verified feature and validates it', () => {
    const property = freshProperties()[0];
    property.features[0].status = 'VERIFIED';
    const text = generateDemo(property, 'Medium', 'MLS description');
    expect(text).toContain('kitchen island');
    expect(
      reviewDemo(property, text).every((c) => c.status === 'SUPPORTED'),
    ).toBe(true);
  });
  it('flags deliberately unsupported and misleading additions', () => {
    const property = freshProperties()[0];
    expect(
      reviewDemo(property, 'Renovated in 2025. Safe neighborhood.').map(
        (c) => c.status,
      ),
    ).toEqual(['UNVERIFIED', 'POTENTIALLY_MISLEADING']);
    expect(canMarkReady(property, 'Safe neighborhood.', true)).toBe(false);
  });
  it('requires human acknowledgement for ready content', () => {
    const property = freshProperties()[0];
    const text = generateDemo(property, 'Short', 'MLS description');
    expect(canMarkReady(property, text, false)).toBe(false);
    expect(canMarkReady(property, text, true)).toBe(true);
  });
  it('revoking evidence makes the old generated claim unsupported', () => {
    const property = freshProperties()[0];
    property.features[0].status = 'VERIFIED';
    const text = generateDemo(property, 'Short', 'MLS description');
    property.features[0].status = 'REJECTED';
    expect(canMarkReady(property, text, true)).toBe(false);
  });
});
