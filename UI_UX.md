# Engineering 6: UI and UX

## Design Goal

Murk must look and behave like a premium consumer finance wallet, not a crypto dashboard.

The approved visual direction comes from the reference shared during planning, excluding the physical bank-card component.

## Visual Tokens

Starting palette:

```css
--background: #F4F4F2;
--surface: #FFFFFF;
--text-primary: #111111;
--text-secondary: #8A8A8A;
--border: #E8E8E5;
--accent: #2F9CF4;
--accent-soft: #EAF5FE;
--success: #228B5A;
--success-soft: #EDF8F2;
--danger: #D64545;
--danger-soft: #FCEEEE;
--nav: #171717;
```

These values may be tuned slightly for contrast and cohesion, but the visual direction must not change.

## Prohibited Visual Patterns

- physical debit/credit card;
- gradients;
- glow;
- purple/pink palette;
- neon crypto style;
- heavy glassmorphism;
- 3D coins;
- robot imagery;
- generic admin tables as primary UX;
- conventional desktop sidebar.

## Hierarchy

```text
Human accounting value
Agent mandate
Remaining authority
Activity
Agent stablecoin funds
Blockchain details
```

The primary number is the human accounting-currency mandate, not a token balance.

## Navigation

Exactly four primary destinations:

```text
Home
Agents
Activity
Settings
```

Use a dark floating navigation capsule on mobile, tablet, and desktop.

Desktop should remain a centered wallet workspace rather than becoming a SaaS sidebar layout.

## Authentication

Email-first OTP.

Do not show a Web3 connect screen as primary onboarding.

The user should never need to install an extension to begin.

## Home

Above the fold:

- user context;
- Daily Spending Authority hero surface;
- spent today;
- remaining authority;
- mandate progress;
- primary agent status.

Then:

- agent available funds;
- recent activity.

## Hero Mandate Surface

Example:

```text
Daily Spending Authority

NGN 5,000

Spent            Remaining
NGN 1,420        NGN 3,580

[progress]

Resets in 11h 42m
```

Large white rounded surface on warm-gray canvas.

No heavy shadow.

## Activity

Group by time:

```text
Today
Yesterday
Earlier
```

Accounting value is visually primary.
Settlement asset is secondary.

Display approved, blocked, and failed attempts.

## Purchase Detail

Show human meaning first:

```text
Payment Complete
NGN 1,420
Paid 1 USDT
```

Then expandable details:

- merchant;
- agent;
- Celo;
- rate source/time;
- policy checks;
- transaction hash;
- why this asset was selected.

## Blocked Detail

Must clearly show:

```text
Purchase Blocked
Requested: NGN 6,200
Remaining: NGN 3,580
Funds moved: 0
```

No fake transaction section.

## Responsive Targets

Support at minimum:

```text
320px phone
360px Android
375/390px iPhone
412px Android
768px tablet
1024px laptop/tablet landscape
1280px desktop
1440px desktop
```

No horizontal scrolling.

## iOS Safari

- use `100dvh`;
- respect safe-area insets;
- support OTP autofill;
- ensure floating nav does not collide with home indicator/browser chrome;
- keyboard must not hide primary actions.

## Android Chrome

- do not fake iOS chrome;
- respect gesture/navigation area;
- test keyboard resize and browser back behavior;
- preserve same Murk visual identity.

## Typography

One modern sans family.

Use `font-variant-numeric: tabular-nums` for changing financial values.

Avoid decorative fonts.

## Copy

Use simple terms:

- Daily mandate
- Per-purchase limit
- Accounting currency
- Available funds
- Paid with
- Approved
- Blocked
- Remaining
- Receipt

Avoid protocol jargon in primary screens.
