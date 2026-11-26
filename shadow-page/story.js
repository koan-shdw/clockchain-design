/* Clockchain Shadow: the storyboard (BRIEF.md, "Storyboard").
   Every value on screen comes from the Shadow film (mcp.clockchain.network/shadow/kit/assets/shadow-promo.mp4,
   frames captured 2026-11-24, not kept in the repo) or the kit page, read 2026-11-24. Nothing invented.
   Each step has caption lines shown one after another within its duration (seconds). */
window.CC_STORY_SHADOW = {
  chapters: [
    { id: 'record', n: '01', label: 'Record and share', status: 'Live on testnet', live: true,
      blurb: 'Your agent records each step, Clockchain anchors the fingerprints, and you share one link.' },
    { id: 'change', n: '02', label: 'Change one character', status: 'Live on testnet', live: true,
      blurb: 'The same record with one character changed is checked again, and it fails.' }
  ],
  steps: [
    { id: 'connect', ch: 0, title: 'Connect', dur: 5, lines: [
      'Add one connector to the agent you already use. Logging runs beside its work and never slows it.' ] },
    { id: 'record', ch: 0, title: 'Record', dur: 10.5, lines: [
      'Codex gets a synthetic task: turn three release notes into a two-line changelog.',
      'Each step is recorded as it happens: the task, the tool call, its result, the message.',
      'Steps are numbered and chained, so a missing or reordered step shows up.' ] },
    { id: 'anchor', ch: 0, title: 'Anchor', dur: 8, lines: [
      'Only fingerprints go to Clockchain. Steps 1–7 are checkpointed in block 313,492.',
      'The content stays on the Shadow server. The ledger holds no step content.' ] },
    { id: 'share', ch: 0, title: 'Share', dur: 7, lines: [
      'Close the session: 10 steps, one link, and a pin.',
      'Send the pin separately. It lets the other person check who signed.' ] },
    { id: 'check', ch: 0, title: 'Check', dur: 8, lines: [
      'A second person opens the link in their own browser. No account.',
      'Result: pass. Each step shows its time window between ledger receipts.' ] },
    { id: 'change', ch: 1, title: 'Change', dur: 6, lines: [
      'Someone changes one character in step 7: Faster becomes Fastor.' ] },
    { id: 'recheck', ch: 1, title: 'Re-check', dur: 9, lines: [
      'Shadow’s verifier checks the copy again, offline.',
      'Content: fail. One or more steps changed after they were recorded.' ] },
    { id: 'means', ch: 1, title: 'What a pass means', dur: 6, lines: [
      'A pass means the record is intact. It doesn’t mean the agent was right.' ] },
    { id: 'end', ch: -1, title: '', dur: 4, lines: [ 'Something to check, instead of a screenshot.' ] }
  ]
};
