# Engineering 7: Motion and Polish

## Principle

Motion must communicate state, not decorate.

Every animation should answer at least one:

- what changed;
- where did it go;
- what is happening now.

## Timing

```text
Fast: 120-160ms
Standard: 180-220ms
Surface: 240-300ms
Large transition: 300-360ms
```

Avoid slow 600ms+ routine transitions.

## Required Motion

### Floating Navigation

Use one active capsule that slides between Home, Agents, Activity, and Settings.

### Money Changes

Animate actual balance/mandate changes subtly with stable tabular numerals.

Do not animate fake initial values.

### Mandate Progress

Animate progress only after real state change.

Blocked purchases must not move the progress indicator.

### Purchase State

Map real backend states into visible progression:

```text
Checking service
Selecting payment asset
Checking mandate
Paying on Celo
Receiving resource
Complete
```

Completed steps become restrained checks. Current step remains strongest.

### Receipt

Transition purchase-progress surface naturally into the completed receipt rather than abruptly replacing the page.

### Bottom Sheets

Use low-bounce restrained spring behavior for currency selection, funding, pause, withdraw, and security flows.

## Prohibited Motion

- confetti;
- shaking blocked screens;
- bouncing cards;
- parallax;
- glowing pulses;
- floating decorative blobs;
- autoplay decorative animation;
- sound effects.

## Reduced Motion

Respect `prefers-reduced-motion`.

Replace movement-heavy transitions with short fades/instant updates.

## Performance

Prefer transform and opacity.

Motion must remain acceptable on low-end Android devices.

Animation callbacks must never control financial correctness.
