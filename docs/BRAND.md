# SecondLook — brand

A short guide so every surface — app, icons, docs, social cards — draws itself
the same way.

## Wordmark and mark

**SecondLook** is one word, capital S and capital L. The mark is two
overlapping square outlines with a lens point: the first look, and the second
that may overturn it. It is drawn once in code (`src/components/Logo.tsx`) and
once for raster assets (`scripts/icons/generate-icons.mjs`); the generator
produces every PNG the project ships (favicons, PWA tiles, maskable icon,
social card).

```
node scripts/icons/generate-icons.mjs
```

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Sage | `#f3f5f0` | page background |
| Paper | `#fbfcf9` | cards and raised surfaces |
| Mist | `#dff3eb` | soft accent fills |
| Mint | `#35d5b4` | the signal color — CTAs, verdicts, live dots |
| Pine | `#087f71` | dark accent, links, second-tier emphasis |
| Ink / Night | `#07110e` | text; dark sections and the console rail |
| Fog | `#65706b` | muted text |
| Amber | `#f0a74b` | windows closing, pending states |
| Clay | `#c45b3e` | slashing, reverts, errors |

## Type

**Manrope**, weights 400–800. Headlines track tight (`letter-spacing: -0.045em`),
labels are uppercase micro (`0.12em` tracking, 11–12px, weight 700). Body copy
is never smaller than 12px.

## Shape and texture

- **Radius is zero, everywhere.** Rectangles only; the mark counts on it.
- Cards sit on a 44px engineering grid (`grid-paper` on light, `night-grid`
  with a radial mint glow on dark sections).
- Shadows are hard offsets (`14px 14px 0` at 14% mint) or deep soft lifts
  (`0 22px 50px` at 10% ink). Nothing blurs except the command-palette
  backdrop.
- Interactive cards translate −2px and pick up the hard offset on hover;
  buttons move −1px and tighten their shadow.
- Accent bars are inset (`inset 4px 0 0` pine or mint) for "this block is
  important", never borders on all four sides for emphasis.
- Motion: gentle `node-float` on live cards (7–11s, staggered), a 36s ticker
  on the landing strip, 500ms rise-in on content. No bouncing, no blur
  transitions.

## Voice

Plain words, short sentences, numbers over adjectives. "The panel reads the
page and rules" — never "leveraging decentralized AI consensus". Verdicts are
MATCH, MISMATCH, INCONCLUSIVE in small caps badges; states are open,
challenged, cleared, final, reverted. Icons come from Lucide, always stroked,
never filled.

## Don'ts

- No rounded corners, no gradients as fills (only as faint grid glows), no
  drop-shadow text, no emoji in UI (Lucide only), no code blocks on public
  pages — configuration lives in docs, not on the site.
