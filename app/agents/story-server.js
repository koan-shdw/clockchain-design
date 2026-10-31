/* MCP Overview, Fig 1.1: the demo film (mcp.clockchain.network/assets/mcp-demo.mp4, 27 s) told as cards.
   Same player and card engine as the Agents animation; scene in agents/scene-server.js.
   Every value on screen comes from the film: agent vega, execute_payment to Northwind Logistics $180,000,
   attest_action, eventHash c155cd72...b2d2d98e, ledgerId a8b40093-4213-4165..., block 3,746,557,
   did:clockchain:meridian:vega, single-validator-testnet. Tool count from the live site: 50.
   Each step has caption lines shown one after another within its duration (seconds). */
window.CC_STORY_SERVER = {
  chapters: [
    { id: 'attest', n: '01', label: 'Attest an action', status: 'Live on testnet', live: true,
      blurb: 'An agent acts, the action is anchored on a testnet block, and the receipt verifies.' },
    { id: 'tamper', n: '02', label: 'Change one byte', status: 'Live on testnet', live: true,
      blurb: 'The same receipt is checked again after one byte changes, and it is rejected.' }
  ],
  steps: [
    { id: 'act', ch: 0, title: 'An autonomous agent acts', dur: 7, lines: [
      'Agent vega runs a payment: execute_payment, $180,000 to Northwind Logistics.',
      'It calls attest_action. The action is fingerprinted (SHA-256) and sent to Clockchain, with no key in the agent.' ] },
    { id: 'anchor', ch: 0, title: 'Anchored on the ledger', dur: 7, lines: [
      'The fingerprint is anchored on the ledger: block 3,746,557, confirmed.',
      'It is written to an append-only, independently verifiable record.' ] },
    { id: 'receipt', ch: 0, title: 'Agent attested receipt', dur: 7, lines: [
      'The agent gets a receipt: the action, its identity, the anchor and the status.',
      'The receipt is verified against the on-chain block.' ] },
    { id: 'tamper', ch: 1, title: 'Change one byte', dur: 7.5, lines: [
      'Change one byte: $180,000 becomes $1,800,000.',
      'Re-verified against the same ledger entry, the fingerprint no longer matches.',
      'Rejected: tamper detected.' ] },
    { id: 'end', ch: -1, title: '', dur: 4, lines: [ 'Time your agents can prove.' ] }
  ]
};
