# The city heists east of the prison: handoff

Owner, 2026-10-26/27: three heists in the jailbreak world east of the prison (x >= 481): the Jewelry Store (difficulty 2, a safe), the Bank (3, a vault and safes), the Museum (4, the advanced finale), with themes from GTA and Payday 2.

## Done (2026-10-27)
- Research: design/research-gta.md, research-payday.md, research-jailbreak.md.
- Three concepts (design/concept-faithful.md, concept-gta.md, concept-payday.md) and the judge's design (design/decision.md).
- PLAN.md, the build plan: sections 0-12 (the site, the three buildings, the regions/loot/traps/cops setup lines, COMMON, the module split for parallel builders, later mechanics M1-M3, the offline checks, the owner's calls). plan-layout.js renders the site layout.
- Not done: the critique of PLAN.md, its fixes, and the build.

## Resume
Run the workflow from the first step whose file is missing:
- PLAN.md without its section 12: `from: 'plan'` (the planner continues the file).
- PLAN.md complete, no design/critique.md: `from: 'critique'` .
- design/critique.md, no design/fixes.md: `from: 'fix'`.
- design/fixes.md exists: the plan is final, build it (this is where it stands now, 2026-10-28: the Museum became the Casino, 23 critique findings fixed).

```
Workflow({ scriptPath: 'C:/Users/matti/OneDrive/Desktop/Donating Test Server/tools/build/city/design/plan-workflow.js', args: { from: 'critique' } })
```

Each step writes its file before it returns, so a session cut off mid-way loses at most the step it was on. Check the usage first and stop near 90%.

## After the plan
PLAN.md section 9: the modules (tools/build/city/<module>.js) and tools/build/city.js (a mirror of town.js); section 11: the offline checks; then the paste (server running), the setup lines (section 7), the server tests in section 12 (a-d), the bots, the client check, and CLAUDE.md and PLAYTEST.md.
