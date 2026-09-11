import { mergePreservedItems } from '../src/utils/merge';

describe('mergePreservedItems', () => {
  it('preserves edited and manual items while dropping ai items in the same category', () => {
    const existing = [
      { id: '1', text: 'Q1', category: 'technical', source: 'ai' },
      { id: '2', text: 'Q2', category: 'technical', source: 'edited' },
      { id: '3', text: 'Q3', category: 'technical', source: 'manual' },
      { id: '4', text: 'Q4', category: 'behavioural', source: 'ai' },
    ];

    const generated = [
      { id: '5', text: 'Q5', category: 'technical', source: 'ai' },
      { id: '6', text: 'Q6', category: 'technical', source: 'ai' }
    ];

    const merged = mergePreservedItems(existing, generated, 'technical');

    expect(merged).toHaveLength(5);
    
    // Kept from technical
    expect(merged.find(i => i.id === '2')).toBeDefined();
    expect(merged.find(i => i.id === '3')).toBeDefined();
    
    // Dropped from technical
    expect(merged.find(i => i.id === '1')).toBeUndefined();
    
    // Kept from other category
    expect(merged.find(i => i.id === '4')).toBeDefined();
    
    // Appended new technical
    expect(merged.find(i => i.id === '5')).toBeDefined();
    expect(merged.find(i => i.id === '6')).toBeDefined();
  });

  it('preserves items with confidence !== uncovered when regenerating flashcards', () => {
    const existing = [
      { id: 'f1', confidence: 'uncovered', front: 'A' }, // should be replaced
      { id: 'f2', confidence: 'low', front: 'B' },       // should be preserved
      { id: 'f3', confidence: 'high', front: 'C' }       // should be preserved
    ];
    const generated = [
      { id: 'f4', confidence: 'uncovered', front: 'D' }
    ];

    const result = mergePreservedItems(existing, generated, undefined as any);

    expect(result.length).toBe(3);
    expect(result).toContainEqual(existing[1]);
    expect(result).toContainEqual(existing[2]);
    expect(result).toContainEqual(generated[0]);
  });
});
