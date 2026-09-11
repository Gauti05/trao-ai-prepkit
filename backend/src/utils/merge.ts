export function mergePreservedItems(existingItems: any[], generatedItems: any[], categoryToRegenerate: string) {
  const finalItems = [];

  for (const item of existingItems) {
    // If we're targeting a specific category, only replace items in that category.
    // If categoryToRegenerate is null/undefined, we replace everything (e.g. flashcards).
    const isTarget = categoryToRegenerate ? item.category === categoryToRegenerate : true;

    if (isTarget) {
      if (item.source === 'edited' || item.source === 'manual') {
        finalItems.push(item);
      } else if (item.confidence && item.confidence !== 'uncovered') {
        finalItems.push(item);
      }
    } else {
      finalItems.push(item);
    }
  }

  finalItems.push(...generatedItems);

  return finalItems;
}
