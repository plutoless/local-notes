// Saved drafts are private edits, never decision intents or repository records.
export function readCandidateDraft(serialized, revision) {
  try {
    const draft = JSON.parse(serialized);
    return draft?.revision === revision && typeof draft.description === 'string' ? draft.description : null;
  } catch { return null; }
}
export function candidateEditable(record) {
  return !record.syncState && (!record.review || (record.review.decision === 'later' && !record.review.target && record.review.state === 'done'));
}
