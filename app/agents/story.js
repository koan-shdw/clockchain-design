/* AI & Agents section: the storyboard. One source of truth for every version.
   Wording checked against Yang's deck (slides 28, 2, 3, 7) and mcp.clockchain.network/#handshake (10-27).
   Each step has caption lines shown one after another within its duration (seconds). */
window.CC_STORY = {
  head: {
    tag: 'AI & Agents',
    title: 'Trust the agent <em>on the other side.</em>',
    sub: 'Before agents talk business, they prove who is present and what each side agreed to.'
  },
  chapters: [
    { id: 'handshake', n: '01', label: 'Agent Handshake', status: 'Live on testnet',
      blurb: 'Two agents that have never met prove who they are, then open a witnessed, bounded channel.' },
    { id: 'contract',  n: '02', label: 'Agent Contract',  status: 'In development',
      blurb: 'Two agents agree terms, an outside settlement provider holds the funds, and payment follows verified work.' }
  ],
  steps: [
    { id: 'meet', ch: 0, title: 'Two agents', dur: 4.5, lines: [
      'A buyer agent and a provider agent that have never met, with Clockchain between them.' ] },
    { id: 'invite', ch: 0, title: 'Invite', dur: 4.5, lines: [
      'The buyer agent opens an invite, and Clockchain carries it to the provider agent.' ] },
    { id: 'join', ch: 0, title: 'Join', dur: 4, lines: [
      'Both agents join a private session with scoped permissions.' ] },
    { id: 'verify', ch: 0, title: 'Verify', dur: 4.5, lines: [
      'Each identity is checked against the ledger (ERC-8004).' ] },
    { id: 'handshake', ch: 0, title: 'Handshake', dur: 11, lines: [
      'Each agent signs on its own machine. The server never sees a private key.',
      'Both agents hold the same verified certificate.',
      'The outcome is anchored where anyone can re-check it.',
      'A witnessed, bounded channel opens.' ] },
    { id: 'align', ch: 1, title: 'Initial alignment', dur: 9, lines: [
      'Discovery matches buyer needs to provider capabilities.',
      'Provider agents send proposals that can be compared side by side.',
      'The agents negotiate scope, milestones, evidence, pricing and payment gates.' ] },
    { id: 'agree', ch: 1, title: 'Agreement', dur: 6.5, lines: [
      'The terms become a contract that both people and machines can read.',
      'It is anchored to the ledger, and both sides get a signed acceptance certificate.' ] },
    { id: 'lock', ch: 1, title: 'Conditional lock', dur: 6.5, lines: [
      'The buyer authorizes the funding, and an outside settlement provider holds it.',
      'The Agent Contract runs the rules but never holds the money.' ] },
    { id: 'run', ch: 1, title: 'Bounded transaction', dur: 11, lines: [
      'The provider’s agent does the work.',
      'It is verified against the agreed criteria, with an audit trail of the evidence.',
      'Settlement then pays the provider.',
      'We enable escrow without being the escrow.' ] },
    { id: 'scale', ch: 1, title: 'Reputation and scale', dur: 6.5, lines: [
      'The cycle repeats for every milestone.',
      'Reputation updates after each one, and the record closes when the project is done.' ] },
    { id: 'end', ch: -1, title: '', dur: 3.5, lines: [ 'Time your agents can prove.' ] }
  ]
};
