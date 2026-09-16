---
name: VouchIt
description: A calm community noticeboard for exchanging unused digital vouchers.
colors:
  claim-green: "hsl(158 64% 52%)"
  claim-on-green: "hsl(0 0% 100%)"
  expiry-amber: "hsl(38 92% 50%)"
  destructive-red: "hsl(0 84% 60%)"
  paper: "hsl(0 0% 100%)"
  ink: "hsl(0 0% 9%)"
  card-paper: "hsl(0 0% 98%)"
  muted-paper: "hsl(0 0% 96%)"
  muted-ink: "hsl(0 0% 45%)"
  hairline: "hsl(0 0% 90%)"
  night: "hsl(0 0% 0%)"
  night-card: "hsl(0 0% 5%)"
  night-muted: "hsl(0 0% 10%)"
  night-muted-ink: "hsl(0 0% 55%)"
  night-hairline: "hsl(0 0% 15%)"
typography:
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.claim-green}"
    textColor: "{colors.claim-on-green}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  input-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
  card-voucher:
    backgroundColor: "{colors.card-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  badge-status:
    backgroundColor: "{colors.claim-green}"
    textColor: "{colors.claim-on-green}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: VouchIt

## Overview

**Creative North Star: "The Community Noticeboard"**

VouchIt behaves like a well-kept neighborhood noticeboard translated into a compact web application: useful offers are posted plainly, their status is immediately visible, and participation never competes with decoration. The system is calm, practical, and candid. It favors scanability, compact controls, and matter-of-fact copy over promotional spectacle.

The visual world is deliberately minimal but not anonymous. Claim Green marks positive action and availability; Expiry Amber introduces time pressure without turning every voucher into an advertisement. Thin borders, modest tonal shifts, and small rounded corners make the interface direct and quietly tactile. Avoid the visual language of a coupon marketplace: no sale bursts, merchant-ad density, loud gradients, or manufactured urgency.

**Key Characteristics:**
- Neutral surfaces with one consistent green action voice.
- Compact information density and short, lowercase interface copy.
- Hairline borders and tonal separation before shadow.
- Status communicated through restrained semantic color.
- Fixed utility navigation on desktop and a focused drawer on mobile.

## Colors

The palette is nearly achromatic so voucher content and status remain legible; green signals successful exchange, amber signals expiry pressure, and red is reserved for destructive or invalid states.

### Primary
- **Claim Green:** The sole positive action color, used for primary controls, available states, active navigation, focus rings, and loading indicators.

### Secondary
- **Expiry Amber:** A narrow urgency signal for vouchers approaching expiry and other time-sensitive highlights. It is not a decorative companion color.

### Tertiary
- **Destructive Red:** Used only for reporting, invalid, failed, or destructive states.

### Neutral
- **Paper and Ink:** The high-contrast light foundation for page backgrounds and primary text.
- **Card Paper and Muted Paper:** Subtle surface steps for cards, controls, inactive navigation, and supporting regions.
- **Muted Ink and Hairline:** Secondary text and structural borders.
- **Night, Night Card, Night Muted, and Night Hairline:** The dark theme uses pure black at the page level, near-black surfaces, white text, and restrained gray separation while preserving the same semantic accents.

### Named Rules

**The One Green Voice Rule.** Claim Green owns positive action, availability, focus, and active navigation; do not introduce competing success hues.

**The Amber Means Time Rule.** Expiry Amber appears only when timing or urgency is meaningful.

**The Quiet Canvas Rule.** Neutral surfaces carry most of every screen. Accent color should identify action and status, not flood the layout.

## Typography

**Display Font:** System UI with platform-native fallbacks
**Body Font:** System UI with platform-native fallbacks
**Label/Mono Font:** The platform monospace stack is reserved for voucher codes

**Character:** The single sans-serif family keeps the product immediate and familiar across devices. Hierarchy comes from modest size changes, medium weight, tight heading tracking, and context rather than from ornamental type pairing.

### Hierarchy
- **Headline** (500, 1.5rem, 1.25): Page titles and primary section introductions; usually lowercase in the incumbent interface.
- **Title** (500, 1.125rem, 1.4): Section and dialog headings.
- **Body** (400, 0.875rem, 1.5): Descriptions, instructions, form content, and general interface text.
- **Label** (500, 0.75rem, 1.4): Voucher metadata, statuses, compact filters, and supporting labels.
- **Voucher Code** (monospace, 0.75rem-0.875rem): Codes and code-like values only.

### Named Rules

**The Sentence-Case Exception Rule.** Lowercase is the incumbent interface voice, but preserve platform names, voucher codes, user-provided content, and accessibility labels in their meaningful case.

**The Modest Hierarchy Rule.** Use weight and spacing before introducing oversized type; this is an operating interface, not a promotional landing page.

## Layout

The desktop application uses a fixed left rail (224px) and a centered content column capped at 896px with 16px horizontal padding. Main content receives 32px vertical padding. Voucher collections use a responsive one-, two-, then three-column grid with 16px gaps at the base, 640px, and 1024px breakpoints.

Spacing follows a compact 4px-derived rhythm, with 8px and 12px for control internals, 16px between related regions, and 24px or 32px for section separation. Forms generally remain narrow (576px or less), while reading content stays around 672px. On screens below 1024px, the rail becomes an off-canvas drawer and the content gains top clearance for a fixed menu control.

**The Compact Exchange Rule.** Keep actionable voucher information within a short scan: platform and status first, title and description second, expiry and value last.

## Elevation & Depth

The system is flat and structural. Background steps and one-pixel borders establish hierarchy; cards rest close to the page rather than floating above it. A small card shadow may reinforce a generic container, but pronounced elevation belongs to dialogs and overlays. Modal depth combines an 80% black scrim, a strong dialog shadow, and brief scale/fade movement.

### Shadow Vocabulary
- **Card Whisper** (`0 1px 2px 0 rgb(0 0 0 / 0.05)`): Optional low shadow on generic cards; voucher cards primarily use borders instead.
- **Dialog Lift** (`0 25px 50px -12px rgb(0 0 0 / 0.25)`): Reserved for modal content above the dark scrim.

### Named Rules

**The Flat-by-Default Rule.** If a border or tonal step can explain the hierarchy, do not add a shadow.

**The Overlay Owns Elevation Rule.** Strong depth is reserved for transient content that must sit above the operating surface.

## Shapes

The form language uses gently curved rectangles rather than soft bubbles. The base corner is 8px, reduced to 6px or 4px for smaller controls; fully round geometry is limited to badges, avatars, loading dots, and compact status treatments. One-pixel borders are structural and appear on cards, fields, navigation boundaries, segmented controls, and dialogs. Voucher imagery is clipped to the same 8px family.

**The Small-Corner Rule.** Use 8px for surfaces, 6px for controls, and 4px for the smallest details; do not inflate every component into a pill.

## Components

Components are direct and quietly tactile: compact at rest, clear in state, and responsive without theatrical motion.

### Buttons
- **Shape:** Gently rounded controls (6px) with 40px default height, 16px horizontal padding, medium-weight 14px text, and a 16px icon when present.
- **Primary:** Claim Green with white text; reserved for the main action in a local region.
- **Hover / Focus:** Hover darkens the current fill slightly. Keyboard focus uses a two-pixel Claim Green ring with a two-pixel surface offset.
- **Secondary / Ghost:** Outlined controls use the page surface and hairline border; ghost controls reveal a tonal hover surface. Link buttons use green text and underline only on hover.
- **Disabled:** Preserve shape while reducing opacity to 50% and removing pointer interaction.

### Chips
- **Style:** Compact 12px labels use a full pill only where category or status semantics benefit from a capsule.
- **State:** Selected filter segments use Claim Green with white text. Unselected segments remain neutral and muted.

### Cards / Containers
- **Corner Style:** Gently curved (8px).
- **Background:** Card Paper in light mode and Night Card in dark mode.
- **Shadow Strategy:** Flat by default; see Elevation & Depth.
- **Border:** One-pixel Hairline or Night Hairline. Interactive voucher cards shift the border toward Claim Green on hover.
- **Internal Padding:** Voucher cards use 16px; generic content cards may use 24px.

### Inputs / Fields
- **Style:** 40px controls with a one-pixel border, page-colored fill, 6px corners, and 12px horizontal padding. Placeholder text uses Muted Ink.
- **Focus:** The same two-pixel Claim Green ring and two-pixel offset used by buttons.
- **Error / Disabled:** Errors use destructive messaging rather than permanent red decoration. Disabled fields reduce opacity and retain readable structure.

### Navigation
- The desktop rail is 224px wide with Card Paper or Night as its surface and one structural border on its trailing edge.
- Navigation items use a 12px horizontal inset, 8px vertical padding, 8px corners, 14px lowercase labels, and 20px line icons.
- Active items use a low-opacity green surface and Claim Green text. Inactive items use muted text and gain a neutral surface on hover.
- Below 1024px, navigation translates off-canvas and opens over a 50% black scrim from a fixed top-left menu button.

### Voucher Card

The signature card is a compact notice rather than a promotional tile. Its top row pairs platform with semantic status, its center carries a one-line title and two-line description, and its footer pairs expiry with value. It avoids decorative imagery in the browsing grid; details and protected voucher content appear in a dialog after intent is established.

## Do's and Don'ts

### Do:
- **Do** keep most surfaces neutral and reserve Claim Green for positive action, availability, active navigation, and focus.
- **Do** use Expiry Amber only for genuine time pressure.
- **Do** preserve compact metadata hierarchy on voucher cards and lists.
- **Do** use hairline borders and tonal steps before adding elevation.
- **Do** keep motion brief and functional: color transitions around 150ms-200ms and overlay transitions around 200ms.
- **Do** maintain equivalent light and pure-black dark themes.

### Don't:
- **Don't** turn VouchIt into a coupon marketplace with sale bursts, loud gradients, promotional ribbons, or merchant-ad density.
- **Don't** use large shadows or floating cards as the default depth language.
- **Don't** introduce extra accent colors when Claim Green, Expiry Amber, or Destructive Red already express the state.
- **Don't** make every control pill-shaped; reserve full rounding for badges, avatars, and compact status objects.
- **Don't** uppercase ordinary interface copy or voucher titles as a decorative device.
- **Don't** expose voucher imagery or codes as browse-card decoration; protected details belong behind authenticated intent.
