# Antigravity Start Instruction

Read `AGENTS.md` first.

Then read, in order:

1. `LOCKED_DECISIONS.md`
2. `PRODUCT_THESIS.md`
3. `GOLDEN_DEMO.md`
4. `SYSTEM_DESIGN.md`
5. `BUILD_ORDER.md`
6. `SPIKE.md`
7. supporting specs as needed

## Your Operating Rule

Do not change Murk's product, architecture, provider choices, visual system, security boundaries, supported currency scope, build order, or golden demo based on your own suggestion.

Your suggestions must stay inside the Markdown specifications.

If you believe a locked requirement should change:

- do not change it;
- record the reason in `BLOCKERS.md` if it is a technical blocker;
- wait for an explicit instruction from the owner before making the change, except for a fallback already approved in the specs.

## First Task

Start with `SPIKE.md` only.

Do not build the polished UI yet.

Produce real evidence for each spike gate, update `IMPLEMENTATION_STATUS.md`, and only move to CORE after the spike exit gate passes.
