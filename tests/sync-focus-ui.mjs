// Run the maintained real-storage synchronization journey with issue #86 evidence.
process.env.ISSUE86 = '1';
await import('./sync-ui.mjs');
