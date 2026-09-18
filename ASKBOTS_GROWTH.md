# AskBots Two-Round Growth Proof

This file defines Murk's Track 3 review loop.

The scoring target is the improvement between round one and round two. Do not treat a single AskBots project as completion.

## Safety

Tracked code never runs AskBots with `--execute`.

Preparation and dry-run are non-spending:

```bash
PUBLIC_APP_ORIGIN=https://<deployed-murk-origin> \
ASKBOTS_ROUND=1 \
ASKBOTS_REVIEW_BUDGET=5 \
npm run askbots:dry-run
```

The generated file lives at:

`.generated/askbots/submission.json`

Only a human-approved command may add `--execute`.

At five paid responses, a round costs $0.55 at the current AskBots rate of $0.11 per response. Re-check the CLI cost preview immediately before any execution.

## Round One

Use the deployed production app.

Preserve:

- public AskBots project link;
- project ID;
- response count;
- every review;
- the standard overall score shown by AskBots;
- exact actionable findings;
- screenshots or URLs that reviewers cite.

Record only issues reviewers actually observed.

### Round-one findings

Not run yet.

## Fix Window

For every accepted finding, record:

| Finding | Evidence | Decision | Commit |
| --- | --- | --- | --- |
| Not run yet | - | - | - |

Do not make unrelated cosmetic changes just to manufacture a larger delta.

## Round Two

After accepted round-one fixes are deployed:

```bash
PUBLIC_APP_ORIGIN=https://<same-deployed-murk-origin> \
ASKBOTS_ROUND=2 \
ASKBOTS_REVIEW_BUDGET=5 \
npm run askbots:dry-run
```

Create and fund round two only after inspecting the dry-run preview.

Preserve the same evidence fields as round one.

### Round-two findings

Not run yet.

## Judging Evidence

The final submission should show:

1. round-one public link;
2. concrete findings;
3. commits that address those findings;
4. round-two public link;
5. measurable improvement in the repeated review questions;
6. any remaining issue that Murk deliberately did not hide.

AskBots feedback is product-testing evidence. It is not proof of Portal wallet, x402 settlement, ERC-8004, ERC-8021, or Neon persistence.
