01 · Project Thesis and Scope

| **Purpose**               | Define the project thesis, scope boundaries, and MVP success criteria before implementation expands. |
|---------------------------|------------------------------------------------------------------------------------------------------|
| **Owner / Status / Date** | Nick · Draft · 2026-04-01                                                                            |

# 1. Working Project Name

AtlasGuard — Grounded Relocation Decisions with Deterministic Scoring
and Verified AI Explanations.

# 2. Project Thesis

AtlasGuard is a relocation decision-support application that compares a
user’s current city and target city using deterministic scoring and a
guided workflow.

It does not let AI decide whether a move is good. Its core purpose is to
ensure that AI explanations remain faithful to deterministic scoring
outputs, user assumptions, and stored benchmark data.

The project solves a trust problem: relocation advice can sound
confident and persuasive even when it is not grounded in actual
financial or lifestyle trade-offs. AtlasGuard addresses that gap by
separating scoring from explanation and placing a verifier between the
explanation layer and the user-facing result.

# 3. What the Product Is

- A relocation validator.

- A deterministic scoring system.

- A guided decision-support workflow.

- A grounded explanation and verification harness around deterministic
  truth.

- A portfolio project that demonstrates disciplined AI system design
  rather than unconstrained AI advice generation.

# 4. What the Product Is Not

- A general-purpose AI harness platform.

- A live autonomous agent system.

- A nationwide relocation intelligence platform.

- A housing search engine.

- A tax optimization engine.

- Financial, legal, or life-advice certainty software.

# 5. Problem Statement

People making relocation decisions must balance affordability, housing
burden, lifestyle fit, safety, amenities, family fit, mobility, and
opportunity.

Generic guidance is often too vague, while purely AI-generated guidance
is easy to mistrust. A deterministic engine improves consistency, but
users still need plain-language interpretation.

The real problem AtlasGuard solves is not just producing a score. It is
producing an explanation that accurately reflects the score, names the
main trade-offs, highlights sensitive assumptions, and adds caveats when
data is stale or simplified.

# 6. Core Product Principle

AI may explain, but AI may not decide.

All numeric scoring remains deterministic. The model is not permitted to
generate, alter, or override the Lifestyle Fit Score, Financial Fit
Score, or Move Score.

The explanation layer must only describe what the deterministic layer
actually computed and must not invent new facts, scores, or claims.

# 7. Deterministic Evidence Constraint

The deterministic scoring engine must emit both final scores and a
structured evidence object for each evaluated scenario. Final scores
alone are insufficient.

The verifier depends on component-level truth to evaluate claims such as
whether affordability improved or worsened, whether housing burden
materially increased, which factors were strongest positive drivers,
which factors were strongest trade-offs, and whether any caveat
conditions were triggered.

Without this evidence contract, explanation verification becomes
subjective and unreliable.

# 8. MVP Product Shape

AtlasGuard will remain a single deployable app with a modular monolith
architecture optimized for fast prototyping.

It preserves the original 4-step relocation workflow and deterministic
outputs while tightening the AI layer through structure and
verification.

# 9. MVP In Scope

| **Area**         | **Included in MVP**                                                                     |
|------------------|-----------------------------------------------------------------------------------------|
| **Workflow**     | 4-step comparison flow using current city, target city, finances, and priorities.       |
| **Scoring**      | Deterministic Lifestyle Fit, Financial Fit, and Move Score.                             |
| **Explanation**  | Structured explanation output plus verifier pass before final display.                  |
| **User utility** | Lightweight scenario persistence and editable what-if assumptions.                      |
| **Trust layer**  | Benchmark freshness metadata, raw trace logging, and a small internal regression suite. |
| **Packaging**    | Portfolio-ready documentation and a clean case-study path.                              |

# 10. MVP Out of Scope

| **Area**              | **Explicitly Excluded**                                                                      |
|-----------------------|----------------------------------------------------------------------------------------------|
| **Coverage**          | Nationwide metro coverage or city expansion beyond a small curated dataset.                  |
| **Data ingestion**    | Live cost-of-living or housing APIs during user requests; real-time scraping.                |
| **Financial realism** | Full tax realism, equity modeling, or deep wealth simulation.                                |
| **Accounts**          | OAuth or production-grade authentication.                                                    |
| **AI autonomy**       | Autonomous background agents, multi-agent runtime orchestration, or model-generated scoring. |
| **Optimization**      | Production self-improvement loops that change behavior without explicit review.              |

# 11. Why This Project Is Worth Building

AtlasGuard demonstrates a stronger AI product pattern than “LLM plus
user inputs equals advice.”

It shows deterministic reasoning where consistency matters, explicit
separation of truth generation and language generation, verification
before display, trace-based evaluation, and disciplined caveat handling
for stale or simplified data.

That is a stronger portfolio story than a broader but less controlled AI
app.

# 12. Critical Risks

| **Risk**                    | **Why it matters**                                                                             |
|-----------------------------|------------------------------------------------------------------------------------------------|
| **Platform drift**          | The project expands into a general harness platform and loses focus on the relocation product. |
| **Faithfulness inversion**  | Narrative quality gets optimized before verifier rules exist.                                  |
| **Under-specified outputs** | The scoring engine emits only top-line scores, making verification weak or subjective.         |
| **Financial sinkhole**      | Tax, equity, and simulation requests expand the model beyond MVP feasibility.                  |
| **Freshness liability**     | The system sounds more certain than the underlying benchmark data warrants.                    |

# 13. Risk Mitigations

- Keep the product framed as a relocation validator, not a platform.

- Freeze the deterministic boundary early.

- Define the scoring evidence contract before prompt work begins.

- Define the explanation schema before prompt work begins.

- Define the verifier rules before any prompt optimization or
  explanation-polish work begins.

- Treat tax realism, large city expansion, and advanced authentication
  as later-phase options only.

- Add freshness metadata and caveat triggers to the deterministic output
  itself.

# 14. Scope Control Rules

1.  Any feature that does not directly improve deterministic trust,
    explanation faithfulness, or user decision clarity is a candidate
    for delay.

2.  Any AI feature that increases ambiguity before the verifier exists
    must be delayed.

3.  Any data feature requiring live ingestion, scraping, or recurring
    operational upkeep should be delayed unless absolutely necessary.

4.  Existing features are not automatically safe from removal just
    because they were already built.

5.  No prompt optimization or narrative-polish work will begin until the
    explanation schema and verifier rules are written and approved.

# 15. MVP Success Criteria

| **Criterion**         | **Definition**                                                                                                                     |
|-----------------------|------------------------------------------------------------------------------------------------------------------------------------|
| **Determinism**       | Identical inputs always produce identical numeric outputs.                                                                         |
| **Flow**              | A user can complete an evaluation in a short, understandable workflow.                                                             |
| **Grounding**         | The explanation accurately reflects deterministic outputs and assumptions.                                                         |
| **Evidence contract** | The scorer emits component-level evidence required for verification.                                                               |
| **Verifier target**   | The verifier flags at least 85% of seeded grounding-failure scenarios in the internal regression suite before user-facing display. |
| **Schema target**     | The explanation pipeline returns 100% schema-valid output on the seeded regression suite.                                          |
| **Communication**     | Results include trade-offs, sensitivity notes, and caveats when warranted.                                                         |
| **Portfolio value**   | The final project yields a credible case study supported by architecture, scoring, verification, and evaluation documentation.     |

# 16. Portfolio Positioning

AtlasGuard is a relocation decision engine that keeps numeric scoring
deterministic and uses AI only inside a controlled, structured, and
verified explanation layer.

The project demonstrates system design discipline, verification-aware AI
integration, selective documentation, and thoughtful scope management.

# 17. Immediate Next Documents

- 02_Deterministic_Scoring_Spec

- 03_Explanation_Contract_and_Verifier_Rules

- 04_System_Architecture_and_Data_Model

- 05_Requirements_and_NFRs

- 06_Eval_QA_Risk_Change_Log

# 18. Kill List for Now

- Free-text preference parsing.

- Full tax realism.

- Nationwide expansion.

- OAuth.

- Maps or geosearch features.

- Multi-agent runtime.

- Autonomous self-improvement behavior.

- Real-time external scraping during evaluation.
