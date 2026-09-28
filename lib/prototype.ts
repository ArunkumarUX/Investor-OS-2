import { companies } from './mock-data';
import { AGENTS, type AgentId, type AgentResult, type Evidence, type IntelligenceState } from './intelligence-types';

export function sampleReview(id: AgentId, companyId: string, evidence: Evidence[]): AgentResult {
  const c = companies.find(c => c.id === companyId)!;
  const findings: Record<AgentId, [string, string]> = {
    market: [`${c.sector} opportunity: ${c.market.tam} total market in the fictional case, with ${c.market.sam} addressable.`, 'Test demand with five buyer interviews and compare three alternatives.'],
    technical: [`The sample thesis highlights: ${c.bulls[1] ?? c.bulls[0]}`, 'Review architecture, deployment effort and defensibility with a technical reference.'],
    financial: [`The fictional case reports ${c.revenue}, ${c.growth} growth and a ${c.valuation} valuation. Growth alone does not establish attractive returns.`, 'Reconcile revenue with contracts, examine gross margin and stress-test dilution.'],
    legal: [`${c.name} is a ${c.stage} case in ${c.geography}. IP ownership, customer terms and cap-table rights remain diligence conditions.`, 'Obtain signed IP assignments, material contracts and a fully diluted cap table.'],
    founder: [`The fictional team includes ${c.founders.map(f => `${f.name}, ${f.role}`).join('; ')}.`, 'Complete founder references and test hiring plans against the next milestone.'],
    skeptic: [`The clearest risk in this sample case is: ${c.risks[0]}`, 'Define a measurable rejection condition before committing more diligence time.'],
    portfolio: [`A ${c.stage} investment in ${c.sector} would add exposure in ${c.geography}. Reserve capacity and sector concentration need review.`, 'Set quarterly revenue, retention and runway triggers; assign an accountable owner.'],
    partner: [`Prototype verdict: Watch ${c.name}. The upside is ${c.bulls[0].toLowerCase()}; the main concern is ${c.risks[0].toLowerCase()}. Advance only after the team resolves the open questions.`, 'Record your own Invest, Watch or Pass decision with rationale, then review the updated memo.'],
  };
  const [finding, question] = findings[id];
  const source = evidence.find(e => e.id === `prototype-source-${companyId}`);
  return { id, status: 'complete', summary: `Illustrative review · ${finding}`, claims: [{ kind: source ? 'observation' : 'unknown', text: `Fictional scenario: ${finding}`, sourceIds: source ? [source.id] : [] }], questions: [question] };
}

export function prototypeState(): Pick<IntelligenceState, 'evidence' | 'runs' | 'forecasts' | 'events' | 'versions'> {
  const createdAt = new Date().toISOString();
  const evidence: Evidence[] = companies.map(c => ({ id: `prototype-source-${c.id}`, companyId: c.id, title: `Fictional company brief — ${c.name}`, body: `DUMMY DATA — created for this prototype, not independent research.\n${c.tagline}\nRevenue: ${c.revenue}; growth: ${c.growth}; valuation: ${c.valuation}.\nMarket: ${c.market.tam} total, ${c.market.sam} addressable.\nThesis: ${c.bulls.join('; ')}\nRisks: ${c.risks.join('; ')}\nTeam: ${c.founders.map(f => `${f.name}, ${f.role}: ${f.bg}`).join('; ')}`, url: `http://localhost:3333/company/${c.id}`, createdAt, provenance: 'sample' }));
  const runs = companies.map(c => ({ id: `prototype-review-${c.id}`, companyId: c.id, createdAt, completedAt: createdAt, mode: 'sample' as const, status: 'complete' as const, evidence: evidence.filter(e => e.companyId === c.id), agents: AGENTS.map(a => sampleReview(a.id, c.id, evidence)) }));
  return { evidence, runs, forecasts: companies.slice(0, 3).map((c, i) => ({ id: `prototype-forecast-${c.id}`, companyId: c.id, statement: `Sample forecast: ${c.name} will sign its next enterprise customer within 90 days.`, probability: 60 + i * 10, due: new Date(Date.now() + 90 * 86400000).toISOString().slice(0,10), createdAt })), events: companies.slice(0, 3).map((c, i) => ({ id: `prototype-event-${c.id}`, companyId: c.id, title: i === 1 ? 'Sample update: launch timeline under review' : 'Sample update: customer pilot completed', detail: i === 1 ? 'Fictional scenario: a milestone moves by one quarter. Review runway and update the investment thesis.' : 'Fictional scenario: a pilot customer requests a commercial proposal. Review conversion assumptions before changing the forecast.', sourceUrl: `http://localhost:3333/company/${c.id}`, impact: i === 1 ? 'risk' as const : 'opportunity' as const, createdAt, acknowledged: false })), versions: runs.map(r => ({ id: `prototype-memo-${r.companyId}`, companyId: r.companyId, createdAt, trigger: 'Illustrative eight-role review', body: r.agents.map(a => `${AGENTS.find(role => role.id === a.id)!.label}\n${a.summary}\nNext: ${a.questions?.[0]}`).join('\n\n'), sourceIds: r.evidence.map(e => e.id) })) };
}
