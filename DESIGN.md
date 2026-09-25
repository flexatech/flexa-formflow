# Flexa FormFlow

**Build Forms. Design Emails. Automate Workflows.**

A complete UI/UX concept for a premium WordPress plugin. This document defines the product's visual identity, information architecture, interaction model, and every core screen. It is a design specification, not a technical one.

---

## Part 1 · Product Vision

### 1.1 The one-sentence pitch

Every field you add to a form becomes a live piece of data you can drop into an email, branch on in a workflow, and trace in an entry timeline. Nothing in the product exists in isolation.

### 1.2 The mental model we sell

Most form plugins are three disconnected tools wearing one menu: a builder, a notification settings page, and (if you pay) an automation add-on. Flexa FormFlow is designed around a single spine:

```text
CREATE          Form
                 ↓
CAPTURE         Submission
                 ↓
DESIGN          Email
                 ↓
AUTOMATE        Workflow
                 ↓
DELIVER         Result
```

The design's job is to make this spine visible everywhere. Two signature systems carry it (detailed in Part 4):

1. **Field Tokens** – every form field renders as the same recognizable blue data chip in the form builder, the email builder, the workflow builder, and the entry view. One visual object, four contexts. When a user sees `⊙ First Name` inside an email, they instantly know it came from their form.
2. **The Flow Rail** – a persistent strip at the top of every editor showing the connected pieces of the current flow (`Form → Emails → Workflow`) with live status dots. It answers "where am I, and what is this connected to?" at all times.

### 1.3 Design principles

1. **One connected system.** Never let a screen feel like a standalone tool. Every editor shows its neighbors.
2. **Sentences over settings.** Configuration reads as language: "Show this block when **Budget** is **greater than** **$5,000**." Dropdowns live inside sentences, not beside labels.
3. **Show the data, not the syntax.** Users never type `{contact_form:field_3}`. They pick `⊙ Budget` from a visual picker and see `$5,000` in preview mode.
4. **Calm surface, deep drawers.** The default view of anything shows five things, not fifty. Depth lives behind tabs, accordions, and inspector panels that open on selection.
5. **Alive, never busy.** Micro-feedback on every interaction (hover lifts, drag ghosts, save pulses), but a resting screen is quiet: white, light gray, one blue accent.
6. **WordPress-native, SaaS-grade.** Respect the wp-admin frame (admin bar, left menu) but own the canvas completely. No WP tables, no metaboxes, no notice spam.

### 1.4 What it must never look like

No bordered WP list tables. No stacked metaboxes. No settings pages with 40 visible checkboxes. No orange "UPGRADE NOW" banners on every screen. No shortcode-first thinking.

### 1.5 Scope: two email sources, one builder

FormFlow is the successor to Flexa Mail. Its Email Builder serves two sources of email with the same tools:

```text
▦ Form emails          triggered by form submissions, via workflows
🛒 WooCommerce emails  triggered by store events (new order, processing,
                       completed, refunded, invoice, customer note,
                       new account, reset password…)
```

Same builder, same Global Styles, same token system, same conditions. The only thing that changes with the source is the data available: form emails expose FORM DATA tokens, order emails expose ORDER DATA tokens. Users who designed one kind already know how to design the other.

FormFlow does not send email itself in any special way; it hands finished messages to WordPress. Delivery is the job of a bridge plugin (Flexa MailBridge or any SMTP plugin), and the design treats that layer as a first-class, visible partner rather than an invisible assumption (Part 8).

---

## Part 2 · Information Architecture

### 2.1 Object model (the user's vocabulary)

| Object | What the user calls it | Lives under |
|---|---|---|
| Form | "my Contact Form" | Forms |
| Entry | "a submission" | Entries |
| Email | "the confirmation email" | Emails |
| WooCommerce Email | "my order emails" | Emails → WooCommerce |
| Workflow | "what happens after submit" | Workflows |
| Flow | the invisible thread connecting all four | shown on the Flow Rail, never a menu item |

A "Flow" is deliberately not a navigation destination. Users navigate by the concrete things they make (forms, emails, workflows); the product surfaces the connections contextually. This keeps the IA flat and familiar while the Flow Rail does the storytelling.

### 2.2 Navigation

Inside wp-admin, Flexa FormFlow registers one top-level menu. Clicking any item opens the FormFlow app frame: a full-width workspace that replaces the WP content area (admin bar and WP sidebar remain).

```text
◆ FormFlow            ← logo mark, collapses nav to icons

  ▤  Dashboard

  ▦  Forms
  ☰  Entries          ← badge shows unread count, e.g. "12"
  ✉  Emails
  ⚡  Workflows

  ⇄  Integrations
  ⚙  Settings

  ─────────────
  ⬆  Upgrade to Pro   ← Free version only; quiet text link, no color block
```

Seven destinations. Sub-items (All Forms / Create Form; Email Templates / WooCommerce / Saved / Global Styles) are tabs inside the destination, not nested menu entries. The WooCommerce tab appears only when WooCommerce is active; on a non-shop site the Emails section simply never mentions it. The nav is a 220px white column with a 1px `#E4E7EC` right border; active item gets a `#F0F7FF` background pill and `#007BEA` icon.

### 2.3 App frame anatomy

```text
┌ WP admin bar ────────────────────────────────────────────────────────┐
├──────────┬───────────────────────────────────────────────────────────┤
│ WP menu  │  ┌─ FormFlow top bar ─────────────────────────────────┐  │
│ (native) │  │ Forms / Contact Form        ● Saved   [Preview] [⋯]│  │
│          │  ├─ Flow Rail (editors only) ─────────────────────────┤  │
│          │  │  ▦ Contact Form ─── ✉ 2 Emails ─── ⚡ 1 Workflow    │  │
│          │  ├────────────────────────────────────────────────────┤  │
│          │  │                                                    │  │
│  FormFlow│  │                   Workspace                        │  │
│  nav     │  │                                                    │  │
│          │  └────────────────────────────────────────────────────┘  │
└──────────┴───────────────────────────────────────────────────────────┘
```

Top bar: breadcrumb (clickable), autosave state ("● Saving…" pulsing / "● Saved" green dot / "● Offline" amber), context actions on the right. List screens skip the Flow Rail; editors always show it.

### 2.4 Primary user journey (first session)

1. Onboarding chooses a starting point (template or blank or AI).
2. Form Builder: adjust fields. Each field added silently grows the data layer.
3. One click on the Flow Rail: Email. The confirmation email is already scaffolded with the form's tokens in place.
4. One more click: Workflow. A default `Submitted → Save → Email customer → Notify admin` flow already exists, drawn as nodes.
5. Publish. Copy the embed. Done in under ten minutes, and the user has *seen* the spine three times.

---

## Part 3 · Design System ("Flexa UI")

### 3.1 Color

| Token | Value | Use |
|---|---|---|
| Blue 500 (brand) | `#007BEA` | Primary buttons, active states, links, field tokens |
| Blue 600 | `#0067C6` | Primary hover |
| Blue 100 | `#DCEDFF` | Selected outlines, token borders |
| Blue 50 | `#F0F7FF` | Active nav pill, token background, selected rows |
| Ink 900 | `#101828` | Headings, primary text |
| Ink 600 | `#475467` | Body, secondary text |
| Ink 400 | `#98A2B3` | Placeholders, disabled, meta text |
| Gray 200 | `#E4E7EC` | Borders |
| Gray 100 | `#F2F4F7` | Dividers, subtle fills |
| Canvas | `#F8FAFC` | Page and canvas backgrounds |
| White | `#FFFFFF` | Cards, panels, nav |
| Green 500 | `#12B76A` | Success, active toggles, "Sent" |
| Amber 500 | `#F79009` | Warnings, "Pending" |
| Red 500 | `#F04438` | Errors, destructive actions |
| Violet 500 | `#7A5AF8` | Logic: conditions, branches, delays (in both email and workflow) |

Rule of thumb per screen: 90% white and canvas gray, 8% ink, 2% blue. Violet appears only where logic exists, which makes conditional anything instantly scannable.

### 3.2 Typography

Inter, with the system stack as fallback. Everything on a 4px baseline.

| Style | Size / weight | Use |
|---|---|---|
| Display | 24 / 600 | Page titles ("Forms") |
| Title | 18 / 600 | Card and panel titles |
| Subtitle | 15 / 600 | Section headers in panels |
| Body | 14 / 400 | Default text, table cells |
| Body strong | 14 / 500 | Field labels, row titles |
| Small | 13 / 400 | Helper text, meta |
| Micro | 12 / 500, +0.4 tracking, uppercase | Group labels ("FORM DATA"), badges |

### 3.3 Shape, depth, spacing

- Radius: 6px controls, 10px cards, 12px modals and canvas nodes, full-round chips and toggles.
- Borders over shadows at rest: cards are `1px #E4E7EC` with `0 1px 2px rgba(16,24,40,0.04)`.
- Elevation appears with intent: hover lift `0 4px 12px rgba(16,24,40,0.06)`, drag `0 12px 24px -6px rgba(16,24,40,0.14)` plus 2° tilt.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48. Cards pad 24. Panels pad 20. Table rows are 52px tall.

### 3.4 Iconography

1.5px stroke, rounded caps, 20px grid (16px in dense rows). One family everywhere, including the field-type icons:

```text
Text ▭   Email ✉   Phone ☎   Number #   Textarea ≡   Dropdown ▾
Radio ◉  Checkbox ☑  Date 📅  Time ◷  Upload ⇪  Address ⌂
Rating ★  Hidden ø  Repeater ⧉  Signature ✎
```

Each field type keeps its icon for life: in the field library, on the canvas, in the token chip, in the entries table header, in the workflow condition picker. Icon recognition is what makes the "one system" feeling work at a glance.

### 3.5 Core components

- **Buttons.** Primary: blue fill, white text, 36px, radius 6. Secondary: white, gray border. Tertiary: text-only blue. Destructive: red text, red fill only inside confirm dialogs. Icon buttons: 32px square, gray icon, `#F2F4F7` hover circle.
- **Inputs.** 36px, white, gray border, radius 6. Focus: blue border + 3px `rgba(0,123,234,0.12)` ring. Error: red border + 13px red helper below.
- **Toggles.** 36×20 pill, green when on (state, not brand), animated knob.
- **Selects.** Same body as inputs; menus are white cards with 10px radius, hover rows `#F8FAFC`, checkmark on selected.
- **Cards.** White, 1px border, radius 10. Clickable cards lift on hover and show their actions (fade in top-right).
- **Tables.** No vertical rules. Header row: Micro style, `#F8FAFC` fill. Row hover: `#F8FAFC` + row actions fade in. Selected: `#F0F7FF` + blue left rail (2px).
- **Badges.** Radius-full, Micro type. Status: green/amber/red/gray tints. `PRO`: violet outline, violet text, transparent fill.
- **Toasts.** Bottom-left, white card, colored leading icon, auto-dismiss 4s, action link when reversible ("Form deleted · Undo").
- **Modals.** 12px radius, max 560px for decisions; full-screen takeover only for onboarding and template galleries.
- **Inspector panel.** The right-side settings column used by all three builders: 320px, white, left border, sticky header with the selected object's icon + name, content in accordions.

### 3.6 The Field Token (the atom of the whole product)

```text
╭──────────────╮
│ ✉ Email      │     Blue 50 fill · Blue 100 border · Blue 600 text
╰──────────────╯     radius-full · type icon · 13px/500
```

States: hover shows a floating sample card ("Example: john@acme.com"); in email text it sits inline with copy; in preview mode it dissolves into real sample data; if its source field was deleted it turns amber with a warning icon and a "Reconnect" action. The token is drag-and-droppable everywhere it appears.

---

## Part 4 · Signature Systems

### 4.1 The Flow Rail

Sits under the top bar in every editor. Three segments, connected by a thin line:

```text
  ▦ Contact Form          ✉ Emails (2)           ⚡ Workflow
  ● Published          ● Customer + Admin        ● Active
  ────────────────────────────────────────────────────────
        └── current segment has a blue underline and bold label
```

- Click a segment to switch editors without losing context (same flow, same unsaved-state handling).
- Empty segments render as ghost pills: `＋ Add an email` with a dashed border. The rail literally shows the user what to build next.
- Status dots: green (active/published), gray (draft), amber (needs attention, e.g. email references a deleted field).
- On hover, each segment expands a small popover listing its contents (the two emails, the workflow name) with direct links.

### 4.2 The Data Layer

Conceptually: the moment a field exists on a form, it exists as a token in every picker in the product. There is no "mapping" step, no shortcode reference table. The Dynamic Data Picker (Part 5, screen 11) is the single interaction through which tokens enter emails, workflow conditions, webhook payloads, and integration field maps. Same picker, same grouping, same sample previews, everywhere.

---

## Part 5 · The Screens

### Screen 1 · Dashboard

Purpose: a morning-coffee screen. What happened, what needs me, what do I build next.

```text
Dashboard                                            [＋ Create ▾]

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Forms    │ │ Entries  │ │ Emails   │ │ Workflows│
│ 6        │ │ 214      │ │ 428 sent │ │ 4 active │
│ ▁▂▄▃▆▅█  │ │ +18% ↑   │ │ 99.1% ✓  │ │ 0 errors │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

┌ Recent activity ───────────────┐  ┌ Getting started  3 of 4 ─┐
│ ◉ John Doe submitted           │  │ ✓ Create your first form │
│   Contact Form · 2 min ago     │  │ ✓ Customize your email   │
│ ✉ Confirmation sent to         │  │ ✓ Create an automation   │
│   john@acme.com · 2 min ago    │  │ ○ Connect an integration │
│ ◉ Quote Request received       │  │        [Connect now]     │
│   from Sarah K. · 8 min ago    │  └──────────────────────────┘
│ ⚡ "High-value lead" workflow   │  ┌ Quick actions ───────────┐
│   completed · 8 min ago        │  │ ▦ Create Form            │
│                 [View all →]   │  │ ✉ Design Email           │
└────────────────────────────────┘  │ ⚡ Build Workflow         │
                                    └──────────────────────────┘
```

Details that make it premium:

- Stat cards show a 7-day sparkline and delta, and each card deep-links to its filtered list.
- Activity rows use the object icons (◉ entry, ✉ email, ⚡ workflow) so the feed itself teaches the vocabulary. Clicking a row opens the entry detail with that event highlighted in the timeline.
- The Getting Started card animates a checkmark draw when a step completes, then collapses itself with a small "Nice work 🎉" toast once all four are done. It never returns.
- The `＋ Create` split button in the header is the universal creator: Form / Email / Workflow, each with its icon.

### Screen 2 · Forms list

```text
Forms                                    [Search…]      [＋ Create Form]

  All (6)   Published (4)   Drafts (2)

┌─────────────────────────────────────────────────────────────────────┐
│  NAME               STATUS      ENTRIES      LAST ENTRY      ⋯      │
│  ▦ Contact Form     ● Published  128 ▂▄▆█    2 min ago              │
│  ▦ Quote Request    ● Published   64 ▁▂▄▃    1 hr ago               │
│  ▦ Catering Inquiry ○ Draft        –         –                      │
└─────────────────────────────────────────────────────────────────────┘
```

- Each row carries a mini flow indicator under the name: `✉ 2 · ⚡ 1` (emails and workflows attached), reinforcing the connected model even in a list.
- Row hover reveals: Edit, Entries, Preview, `</>` Embed (copies the shortcode/block with a "Copied ✓" morph), Duplicate, and an overflow with Delete.
- The status toggle is inline: clicking Published/Draft flips it with an optimistic pulse.
- Sortable columns; entries column shows a 14-day sparkline.

### Screen 3 · Create Form

Clicking `＋ Create Form` opens a full-screen takeover with three doors:

```text
                     How do you want to start?

┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│   ✨ Build      │  │  ▤ Start from  │  │  ▦ Start       │
│   with AI      │  │    a template  │  │    blank       │
│                │  │                │  │                │
│ Describe it,   │  │ 30+ ready-made │  │ An empty       │
│ we draft the   │  │ forms with     │  │ canvas and a   │
│ form, email    │  │ emails and     │  │ field library  │
│ and workflow   │  │ workflows      │  │                │
└────────────────┘  └────────────────┘  └────────────────┘
```

The template door leads to a gallery grid (searchable, categories on the left: Contact, Quote, Booking, Event, Jobs, Support, WooCommerce, Feedback). Every template card shows a live-looking form preview and, crucially, a footer strip: `▦ Form · ✉ 2 emails · ⚡ 1 workflow`. Templates ship whole flows, not just fields. Hover flips the card to a summary; "Use template" drops the user straight into the Form Builder with the Flow Rail already fully populated.

### Screen 4 · Form Builder

The workhorse screen. Three-column layout on a `#F8FAFC` canvas.

```text
┌ Top bar: Forms / Contact Form          ● Saved   [Preview] [Publish] ┐
├ Flow Rail: ▦ Contact Form ── ✉ 2 Emails ── ⚡ 1 Workflow             ┤
├──────────────┬───────────────────────────────────┬──────────────────┤
│ FIELDS       │                                   │ ✉ Email Address  │
│ [search]     │   Contact us                      │ ───────────────  │
│              │   We reply within one day.        │ Label            │
│ BASIC        │                                   │ [Email Address ] │
│ ▭ Text       │   ┌─────────────┬─────────────┐   │ Placeholder      │
│ ✉ Email      │   │ First Name  │ Last Name   │   │ [you@example…  ] │
│ ☎ Phone      │   └─────────────┴─────────────┘   │ Required    (●)  │
│ # Number     │   ┌───────────────────────────┐   │                  │
│ ≡ Textarea   │   │ ✉ Email Address  ◀selected│   │ ▸ Validation     │
│ ▾ Dropdown   │   └───────────────────────────┘   │ ▸ Conditional    │
│ ◉ Radio      │   ┌───────────────────────────┐   │   logic          │
│ ☑ Checkbox   │   │ ▾ Service                 │   │ ▸ Advanced       │
│              │   └───────────────────────────┘   │                  │
│ ADVANCED     │   ┌───────────────────────────┐   │                  │
│ 📅 Date      │   │ ≡ Message                 │   │                  │
│ ⇪ Upload     │   └───────────────────────────┘   │                  │
│ ★ Rating     │                                   │                  │
│ ⧉ Repeater   │   [      Send message       ]     │                  │
│ ✎ Signature  │                                   │                  │
│ …            │        ＋ Add field                │                  │
├──────────────┴───────────────────────────────────┴──────────────────┤
```

**Canvas.** The form renders as it will on the front end (real inputs, real button), sitting on a white sheet with radius 12 centered on the gray canvas. This is not a wireframe of a form; it is the form.

**Drag and drop.** Dragging from the library shows a ghost chip under the cursor; the canvas opens a 3px blue insertion line between fields with a subtle spring animation. Dropping lands the field with a 200ms settle. Fields drag to reorder with the same insertion line; dragging a field onto the side of another creates a two-column row (max 3 columns), shown by a vertical insertion line.

**Selection.** Click a field: blue 2px outline, radius 8, and the right inspector swaps to its settings with a slide-fade. A floating mini-toolbar appears above the selected field: duplicate, delete, drag handle.

**The connected moment.** When a field is added, a token chip briefly glows in the inspector footer: "`⊙ Budget` is now available in your emails and workflows." This one line, shown the first three times only, teaches the entire product model.

### Screen 5 · Form Builder inspector (field settings)

Progressive disclosure, never a wall of options:

```text
✉ Email Address                          [Duplicate] [🗑]
──────────────────────────────────────────
Label            [Email Address        ]
Placeholder      [you@example.com      ]
Required         (● on)
Width            [Full ▾]
──────────────────────────────────────────
▸ Validation
    · Must be a valid email       (always on, shown as ✓)
    · Restrict to domain          [＋ add]
    · Custom error message        [                    ]
▸ Conditional logic                              PRO
    Show this field when  [Field ▾] [is ▾] [value]
▸ Advanced
    · Field key (auto)     email_address
    · Default value        [＋ Insert data ▾]   ← tokens work here too
    · Admin label          [                    ]
```

Accordions remember their open state per session. The conditional logic row uses the sentence pattern and the violet accent on its left edge, matching logic everywhere else.

### Screen 6 · Form Preview

The `[Preview]` button flips the workspace into preview mode (same URL context, instant):

```text
        [ 🖥 Desktop ]  [ ▯ Tablet ]  [ ▫ Mobile ]        [✕ Close]

   ┌──────────────── real frontend rendering ────────────────┐
   │  Contact us                                             │
   │  We reply within one day.                               │
   │  First Name*        Last Name                           │
   │  [John          ]   [Doe            ]                   │
   │  Email Address*                                         │
   │  [not-an-email  ]  ⚠ Please enter a valid email         │
   │  [        Send message        ]                         │
   └─────────────────────────────────────────────────────────┘

   Simulate:  [ Error state ] [ Success state ] [ Empty ]
```

- Device toggle animates the frame width; mobile shows a 375px frame with a device chrome outline.
- The Simulate bar is a designer's favorite: it fills the form with sample data, triggers inline validation errors, or shows the success state ("✓ Thanks, John! We received your message.") so users can design and check every state without submitting.
- Preview uses the site's actual theme styles inside the frame, with a toggle: "Theme styles / FormFlow styles".

### Screen 7 · Entries list

```text
Entries                                              [Export ▾]

[Search submissions…]  [Form: All ▾] [Status: All ▾] [Date: 30 days ▾]

┌─────────────────────────────────────────────────────────────────────┐
│ ☐   NAME            FORM             STATUS    SERVICE     DATE     │
│ ☐ ● John Doe        Contact Form     ✓ Done    Web Design  2m ago   │
│ ☐   Sarah Kim       Quote Request    ● New     Branding    1h ago   │
│ ☐   Mike Ross       Contact Form     ⚠ Email   SEO         3h ago   │
│                                        failed                       │
└─────────────────────────────────────────────────────────────────────┘
```

- Columns adapt to the selected form: filter to "Quote Request" and its own fields (Service, Budget) become columns, using their field-type icons in the header. A `[⚙ Columns]` control lets users pick which fields show.
- Unread entries carry a blue dot and Body-strong name; reading clears it (source of the nav badge).
- Bulk bar slides up from the bottom when rows are checked: `3 selected · Mark read · Export · Delete`.
- Status is workflow-aware: ✓ Done (workflow completed), ● New, ◐ Running, ⚠ Failed (something in the flow errored, amber). This column quietly ties entries to workflows.
- Clicking a row opens the Entry Peek: a 480px right-side panel sliding over the table (list stays visible, ↑↓ keys move between entries). "Open full view ↗" leads to Screen 8.

### Screen 8 · Entry Detail + Activity Timeline

Two columns: the data and its story.

```text
← Entries                                     [Resend email ▾] [⋯]

Entry #1024 · Contact Form                         ● Completed

┌ FORM DATA ────────────────────────┐  ┌ ACTIVITY ────────────────────┐
│                                   │  │                              │
│  JD  John Doe                     │  │ ✓ Form submitted             │
│      john@acme.com                │  │   Sep 25, 2026 · 9:41 AM     │
│      Submitted Sep 25, 9:41 AM    │  │ │                            │
│ ───────────────────────────────── │  │ ✓ Entry saved      #1024     │
│  ▭ First Name      John           │  │ │                            │
│  ▭ Last Name       Doe            │  │ ✓ Customer email sent        │
│  ✉ Email           john@acme.com  │  │ │  "Thanks for reaching out" │
│  ▭ Company         Acme           │  │ │  Opened 9:44 AM ✓          │
│  ▾ Service         Web Design     │  │ │  [View email ↗]            │
│  # Budget          $5,000         │  │ ✓ Admin notification sent    │
│  ≡ Message         "We need a     │  │ │                            │
│                    new site…"     │  │ ✓ Webhook → CRM     200 OK   │
│                                   │  │    142ms · [View payload]    │
│  [Copy all] [Export PDF]          │  │                              │
└───────────────────────────────────┘  │  ⚡ Ran "Contact workflow"    │
                                       │     [Open workflow ↗]        │
                                       └──────────────────────────────┘
```

- Form data rows reuse the field icons and order from the builder; uploads show thumbnails, signatures render, ratings show stars. Long text expands inline.
- The timeline is the trust screen. Each step is expandable: the email step shows a thumbnail of the actual sent email and open/click status; the webhook step shows response code and duration. Failed steps go amber with the error message and a `[Retry step]` button.
- Open and click data on email steps is read from the active delivery bridge (Flexa MailBridge tracking) when one is installed; without it, the step simply shows "Sent ✓" and omits engagement rows rather than showing empty dashes. Each email step also offers "View in delivery log ↗" when a bridge with logging is present.
- The timeline footer links to the workflow that produced it, closing the loop: data ↔ automation.
- `[Resend email ▾]` lists the flow's emails; `[⋯]` holds Mark unread, Export, Delete (confirm dialog), Copy entry link.

### Screen 9 · Email Template Library

Tab structure under Emails: **Templates · WooCommerce · Saved · Global Styles**.

```text
Email Templates                                  [＋ Blank Email]

  All  Contact  Quote  Booking  Event  Support  WooCommerce  General

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓ │
│ realistic│ │  email   │ │ preview  │ │ renders  │
│ ▓▓▓ ▓▓▓▓ │ │ ▓▓▓▓ ▓▓ │ │ ▓▓ ▓▓▓▓▓ │ │ ▓▓▓▓▓ ▓▓ │
│──────────│ │──────────│ │──────────│ │──────────│
│ Warm     │ │ Quote    │ │ Booking  │ │ Minimal  │
│ welcome  │ │ summary  │ │ confirmed│ │ receipt  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

- Cards show real rendered email previews (with sample data, in the user's global brand styles once set, which is a quiet wow: the gallery is already in your colors).
- Hover: preview pans slowly downward inside the card to show the full email, plus `[Preview] [Use]` buttons.
- Preview opens a centered modal with device toggle and a "with your form's data" switch that swaps sample tokens for the connected form's fields.

### Screen 9b · WooCommerce Emails (absorbed from Flexa Mail)

The WooCommerce tab lists every transactional email the store sends, in the order a customer meets them. This screen replaces Flexa Mail's home.

```text
Emails · WooCommerce                          ⇄ Delivery: Flexa MailBridge ✓

┌─────────────────────────────────────────────────────────────────────┐
│  EMAIL                    RECIPIENT   DESIGN            SENT (30d)  │
│  🛒 New order              Admin      ● FormFlow  [▓]      128      │
│  🛒 Processing order       Customer   ● FormFlow  [▓]      124      │
│  🛒 Completed order        Customer   ● FormFlow  [▓]      117      │
│  🛒 Refunded order         Customer   ○ WooCommerce default  3      │
│  🛒 Customer invoice       Customer   ○ WooCommerce default  –      │
│  🛒 Customer note          Customer   ○ WooCommerce default  8      │
│  👤 New account            Customer   ● FormFlow  [▓]       41      │
│  👤 Reset password         Customer   ○ WooCommerce default 12      │
└─────────────────────────────────────────────────────────────────────┘
```

- **The takeover model.** Each row has a Design switch: "WooCommerce default" or "FormFlow". Only emails the user has customized are taken over; everything else keeps shipping untouched. Flipping to FormFlow the first time opens the builder pre-filled with a faithful recreation of the default WooCommerce layout in the user's Global Styles, so the starting point is already on-brand rather than blank.
- Rows with a FormFlow design show a live thumbnail chip `[▓]`; hover expands it to a full preview card. Row actions: Customize, Preview, Send test, Export JSON, Reset to default (confirm dialog, keeps a restorable copy).
- The header shows the delivery partner detected on the site (Part 8). Clicking it deep-links to that plugin's dashboard.
- A quiet footer row: "Import / Export templates (JSON)", carrying over Flexa Mail's portability.

**The Flow Rail for order emails.** Order emails have no form and no workflow, so the rail tells their own three-part story with the same component:

```text
🛒 Processing order ─── ✉ Your email ─── ⇄ Delivered via MailBridge
   ● Store event          ● FormFlow        ● 99.1% delivered
```

Same rail, same dots, same hover popovers. The left segment lists what triggers this email; the right segment shows delivery health when a bridge is present, or "WordPress default sending" in gray when not.

### Screen 10 · Email Builder

Same three-column grammar as the Form Builder, so the user already knows how to use it.

```text
┌ Top bar: Emails / Thanks for reaching out   ● Saved  [Send test] [Save] ┐
├ Flow Rail: ▦ Contact Form ── ✉ Thanks for reaching out ── ⚡ Workflow    ┤
├──────────────┬───────────────────────────────────┬──────────────────────┤
│ ELEMENTS     │      to: ⊙ Email                  │  Button              │
│              │  subject: Thanks, ⊙ First Name!   │  ──────────────      │
│ CONTENT      │ ┌───────────────────────────────┐ │  Label               │
│ H Heading    │ │           [LOGO]              │ │  [View request  ]    │
│ ¶ Text       │ ├───────────────────────────────┤ │  Link                │
│ ▣ Image      │ │ Hello ⊙ First Name,           │ │  [Entry link ▾]      │
│ ▢ Button     │ │                               │ │  Style               │
│ ─ Divider    │ │ Thanks for contacting Acme.   │ │  ◉ Filled ○ Outline  │
│ ␣ Spacer     │ │ Here's what you sent us:      │ │  Color   [■ Brand]   │
│ ▥ Columns    │ │ ┌───────────────────────────┐ │ │  Align   ◉ ○ ○       │
│ ⚭ Social     │ │ │ Service   ⊙ Service       │ │ │                      │
│              │ │ │ Budget    ⊙ Budget        │ │ │  ▸ Spacing           │
│ DYNAMIC      │ │ └───────────────────────────┘ │ │  ▸ Mobile            │
│ ⊙ Form data  │ │                               │ │                      │
│ ◉ Entry data │ │ ┌ [ View Request ] ◀ selected │ │                      │
│ ⌂ Site data  │ │                               │ │                      │
│ 👤 User data │ ├───────────────────────────────┤ │                      │
│              │ │ Acme Inc · Unsubscribe        │ │                      │
│ [Preview     │ └───────────────────────────────┘ │                      │
│  with data ⟳]│         600px · centered          │                      │
├──────────────┴───────────────────────────────────┴──────────────────────┤
```

- The canvas is a real email: 600px sheet, soft shadow, on the gray canvas. Above it sit the `to:` and `subject:` lines as first-class editable rows, both token-capable. Seeing `to: ⊙ Email` teaches routing without a settings page.
- Blocks drag in with the same insertion-line physics as the Form Builder. Selecting a block opens its inspector; block-level toolbar (duplicate, delete, move, save-as-snippet) floats on the left edge of the selected block.
- Inline text editing is direct (click and type) with a minimal floating toolbar: B, I, link, color, size, and `⊙ Insert data`.
- The left panel's DYNAMIC group is the drag source for tokens: drag `⊙ Budget` into a text block and it lands inline as a chip.
- `[Preview with data ⟳]` toggles the whole canvas between token view and sample-data view (chips morph into "John", "$5,000" with a soft crossfade). If the form has real entries, a small selector appears: "Preview as: Latest entry ▾".
- `[Send test]` sends to the admin email with sample data and confirms via toast: "Test sent to you@site.com ✓".

**Order mode.** Opening a WooCommerce email puts the same builder in order mode; only the data changes:

- The DYNAMIC group in the left panel becomes `🛒 Order data · 👤 Customer data · ⌂ Site data`, and three commerce blocks join the CONTENT list:

```text
COMMERCE
▤ Order items      product rows with image, name, qty, price
Σ Order totals     subtotal, shipping, tax, discounts, total
⌂ Addresses        billing / shipping, side by side or stacked
```

  These are structured blocks with their own inspectors (show images on/off, column visibility, tax display), not token soup. They inherit Global Styles like everything else.
- The subject line is token-capable in order mode too: `Order ⊙ Order number is on its way, ⊙ First name!`
- `[Preview with data ⟳]` offers "Preview as: Sample order ▾ / Order #1187 ▾", pulling any recent real order, in desktop and mobile frames. Same interaction as previewing form emails with a real entry.
- **AI writing assistant** (carried over from Flexa Mail, now available in both email modes): selecting text raises the floating toolbar with a ✨ menu: Rewrite, Shorten, Change tone, Translate, Suggest subject lines. Suggestions stream into a small card with `[Replace] [Insert below] [Discard]`; nothing is ever applied without a click. Disabled with a one-line hint until an API key is added in Settings.

### Screen 11 · Dynamic Data Picker (signature interaction)

Three entry points, one component: typing `{{` or `/` in any text, the `⊙ Insert data` toolbar button, or dragging from the left panel.

```text
╭─ Insert data ────────────────────────────╮
│ [Search fields…                    ]     │
│                                          │
│ FORM DATA · Contact Form                 │
│  ▭ First Name              John          │
│  ▭ Last Name               Doe           │
│  ✉ Email          john@acme.com          │
│  ▾ Service           Web Design          │
│  # Budget                $5,000    ◀ hov │
│                                     ╭────┴─────────╮
│ ENTRY                               │ # Budget     │
│  ◉ Entry ID · Date · Link           │ Number field │
│                                     │ Example:     │
│ SITE                                │ $5,000       │
│  ⌂ Site name · URL · Logo           │ ─────────    │
│                                     │ If empty:    │
│ USER                                │ [fallback…]  │
│  👤 Name · Email · Role             ╰──────────────╯
╰──────────────────────────────────────────╯
```

- Opens anchored to the cursor, 320px, search focused, arrow-key navigable, Enter inserts. Fast like a command palette.
- Every row: type icon, field name, sample value right-aligned in Ink 400.
- Hover card shows the field type, a larger example, and the fallback input ("If empty, show: ___"), which quietly solves the empty-data problem at insertion time instead of in settings.
- Recently used tokens float to the top. The picker is identical in emails, workflow nodes, webhook payload editors, and integration field maps.
- In order mode the groups become `ORDER DATA` (order number, date, status, payment method, shipping method, item count, totals), `CUSTOMER` (names, email, phone, addresses), and `SITE`. Sample values come from the most recent real order when one exists. Same component, same keyboard behavior; only the catalog changes.

### Screen 12 · Conditional Email Block

Any block or group can become conditional via the block toolbar's `◇ Condition` action (violet diamond, PRO).

```text
┏━ ◇ Shown when  Budget  is greater than  $5,000 ━━━━━━━━━━━┓
┃                                                  [Edit] ✕ ┃
┃   🎉 You qualify for a free strategy call                 ┃
┃   Our senior team will prepare a custom proposal…         ┃
┃   [ Book your call ]                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

- The wrapper: 1.5px dashed violet border, violet 4% tint fill, and a header sentence in Micro violet type. Instantly distinguishable from normal content, consistent with workflow logic styling.
- `[Edit]` opens the condition editor popover, pure sentence UI:

```text
Show this content when…
[ ⊙ Budget ▾ ]  [ is greater than ▾ ]  [ 5000        ]
＋ Add condition        Match [ all ▾ ] conditions
```

- In "Preview with data" mode the canvas honors the conditions: blocks that would be hidden collapse to a thin violet strip labeled "◇ Hidden for this entry (Budget is $3,000)", so users can verify logic against real sample entries without sending anything.
- Order emails use the identical component with order fields, covering Flexa Mail's conditional logic: "Shown when **Order total** is **greater than** **$200**", "Shown when **Payment method** is **Cash on delivery**", "Shown when **Billing country** is **Vietnam**". One logic language for form data and order data alike.

### Screen 13 · Global Styles

The brand system for every email, designed as a live split view:

```text
Global Styles                                        [Save styles]

┌ CONTROLS ──────────────┐  ┌ LIVE PREVIEW ─────────────────────┐
│ Brand logo   [⇪ Upload]│  │  Any template, re-rendered live   │
│ Primary    [■ #007BEA] │  │  as each control changes.         │
│ Secondary  [■ #101828] │  │                                   │
│ Font        [Inter ▾]  │  │  [Template: Warm welcome ▾]       │
│ Headings    [Semibold▾]│  │                                   │
│ Buttons   ◉ Rounded    │  └───────────────────────────────────┘
│           ○ Pill ○ Sq  │
│ Footer text [Acme Inc…]│   ⓘ Global Styles apply to all your
│ Social     [＋ Add]     │     email templates automatically.
└────────────────────────┘     Individual emails can override.
```

Every control change animates in the preview within 100ms. A template switcher inside the preview proves the styles are global. Emails that override a global value show a small "custom" pill next to that control when opened, with "Reset to global".

### Screen 14 · Workflows list

Same table grammar as Forms: name, trigger (form icon + name), status toggle (Active/Paused), runs sparkline, last run, error badge if any. Each row's subline shows a micro-map of the flow: `◉ → ✉ → ✉ → ⇄` (tiny node icons in sequence), so users can tell workflows apart at a glance.

### Screen 15 · Workflow Builder

A vertical node canvas. Vertical (not free-form 2D) is a deliberate choice: post-submission flows are stories with a beginning, and a top-to-bottom spine with clean branches reads faster than a spaghetti graph, especially for WordPress users meeting automation for the first time.

```text
┌ Top bar: Workflows / Contact workflow    ● Active (●)  [Test run] [Save] ┐
├ Flow Rail: ▦ Contact Form ── ✉ 2 Emails ── ⚡ Contact workflow            ┤
├──────────────────────────────────────────────────┬───────────────────────┤
│                                                  │ ✉ Send Customer Email │
│        ┌───────────────────────┐                 │ ───────────────────── │
│        │ ◉ TRIGGER             │                 │ Email                 │
│        │ Form submitted        │                 │ [Thanks for reach… ▾] │
│        │ ▦ Contact Form        │                 │   [Edit email ↗]      │
│        └──────────┬────────────┘                 │ To                    │
│                   │                              │ [⊙ Email          ]   │
│        ┌──────────┴────────────┐                 │ Reply-to              │
│        │ ⊙ Save Entry          │                 │ [admin@acme.com   ]   │
│        └──────────┬────────────┘                 │                       │
│                  (＋)                             │ ▸ Sending options     │
│        ┌──────────┴────────────┐                 │                       │
│        │ ✉ Send Customer Email │ ◀ selected      │                       │
│        │ "Thanks for reachi…"  │                 │                       │
│        └──────────┬────────────┘                 │                       │
│        ┌──────────┴────────────┐                 │                       │
│        │ ✉ Notify Sales Team   │                 │                       │
│        │ 2 recipients          │                 │                       │
│        └──────────┬────────────┘                 │                       │
│                  (＋)                             │                       │
│                  END                             │                       │
│                                                  │                       │
│  [ − 100% ＋ ]  [⊡ Fit]                           │                       │
├──────────────────────────────────────────────────┴───────────────────────┤
```

- **Nodes** are 260px cards, radius 12: leading icon in a tinted square (blue for trigger, gray for actions, violet for logic, brand logos for integrations), a title, and a one-line summary of their configuration. An unconfigured node shows an amber "Needs setup" badge.
- The trigger picker is designed as a list of event sources, with "Form submitted" as the first. The layout accommodates future sources (a WooCommerce "Order status changed" trigger is the obvious next candidate) without any structural change: new source, same card, same token catalog swap that the Email Builder's order mode already uses.
- **Connectors** are 2px `#CBD5E1` lines. Hovering any connector reveals a `(＋)` button; clicking opens the node picker (a categorized popover: Actions / Logic / Integrations, searchable, same visual grammar as the field library).
- Selecting a node opens the inspector. The Send Email node links directly into the Email Builder (`Edit email ↗`) and back, via the Flow Rail. Data flows through tokens: the To field above holds `⊙ Email` from the picker.
- **Test run**: choose a sample entry (or auto-generated data), then watch the flow execute top-down: each node gets a spinner, then a green check and duration ("142ms"), connectors fill with blue as execution passes. Failures stop with amber and an inline error. This turns automation from faith into something you can watch.

### Screen 16 · Workflow Condition node

```text
                ┌────────────────────────────┐
                │ ◇ IF                       │
                │ ⊙ Service  is  Web Design  │
                └──────┬──────────────┬──────┘
                  YES ✓│              │NO ✕
             ┌─────────┴─────┐  ┌─────┴─────────┐
             │ ✉ Send Web    │  │ ⊙ Continue    │
             │   Design email│  │   main flow   │
             └───────────────┘  └───────────────┘
```

- The IF node is violet-tinted with the diamond icon; its summary line is the condition sentence itself.
- Branch connectors are labeled with pill badges: `YES ✓` (green tint) and `NO ✕` (gray). Branches indent into parallel lanes and can merge back; the merge point renders a small ⌄ joint.
- The inspector uses the exact same sentence-condition editor as email conditions (Screen 12): one logic language across the product. Multi-condition with all/any matching; Branch node (multi-way) is the same pattern with named lanes.

### Screen 17 · Workflow Templates

Entry point when creating a workflow: gallery of flow cards, each showing its actual node map in miniature (real layout, tiny nodes), with name and description.

```text
┌ Quote Request ────────────┐
│      ◉                    │
│      │                    │
│      ◇  High value?       │
│    ✓/ \✕                  │
│   ✉    ✉                  │
│ Premium  Standard         │
│ email    email            │
│                           │
│ Route big budgets to      │
│ your senior team.  [Use]  │
└───────────────────────────┘
```

Ships with: Contact Form (submit → save → confirm → notify), Quote Request (budget branch), Booking Request (confirm + admin + delayed follow-up), Event Registration, Job Application, Support Ticket. Choosing one drops it on the canvas with amber "Needs setup" badges on anything requiring a choice, so the user's remaining work is visibly finite.

### Screen 18 · Integrations

```text
Integrations                                   [Search…]

  All  CRM  Email marketing  Messaging  Automation  Files

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ [logo]   │ │ [logo]   │ │ [logo]   │ │ [logo]   │
│ Mailchimp│ │ HubSpot  │ │ Slack    │ │ Webhooks │
│ ● Connect│ │ ✓ Connec-│ │ ● Connect│ │ ✓ 2 activ│
│    ed    │ │   ted    │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

- Cards: logo, name, one-line description, status. Connected cards show a green dot and "Manage"; others show "Connect".
- Connect opens a right drawer: auth step, then a **field mapping** table that is pure token UX: each destination field (e.g. HubSpot "Email") gets a token picker on the left. Mapping a CRM is the same gesture as writing an email.
- Once connected, the integration appears as a node type in the workflow picker with its logo. The two screens cross-link.

### Screen 19 · Settings

A calm two-pane page, no tabs-of-tabs:

```text
Settings

  General          ┌──────────────────────────────────────────┐
▸ Email sending    │ EMAIL SENDING                            │
  Data & privacy   │ From name        [Acme Inc          ]    │
  Permissions      │ From address     [hello@acme.com    ]    │
  License          │                                          │
  Advanced         │ Delivery                                 │
                   │ ┌──────────────────────────────────────┐ │
                   │ │ ⇄ Flexa MailBridge          ✓ Active │ │
                   │ │ Your emails are delivered through    │ │
                   │ │ MailBridge (SendGrid, with fallback).│ │
                   │ │ 99.1% delivered · 42% opened (30d)   │ │
                   │ │ [Open MailBridge ↗] [Send test email]│ │
                   │ └──────────────────────────────────────┘ │
                   └──────────────────────────────────────────┘
```

FormFlow never builds its own SMTP screen. The Delivery card adapts to what it finds on the site:

- **A Flexa MailBridge (or compatible bridge) is active:** the card above. Stats and the deliverability state are read from the bridge; all delivery configuration lives in the bridge's own UI, one click away. FormFlow shows health, never duplicate settings.
- **Another SMTP plugin is active:** the card names it ("Delivery is handled by WP Mail SMTP ✓") with a test button. Respectful coexistence, no competition.
- **Nothing is handling delivery:** an amber card: "Emails are using the default PHP mailer, which often lands in spam. We recommend a delivery plugin." with `[Install Flexa MailBridge]` and "or choose another SMTP plugin" as a text link. This is the one place in the product that recommends a sibling plugin, and it does so as advice, not a lock-in.

Left anchor list (not reloads: instant pane swap). Settings use sentence-style rows and toggles; anything risky (delete data on uninstall) sits in Advanced behind a confirm. Data & privacy holds entry retention ("Keep entries: Forever / 90 days / 30 days") with plain-language explanations. Save is per-pane with the same ● Saved indicator as the builders.

### Screen 20 · AI Form Generator

AI accelerates creation; it never replaces the builders. Entry: the "Build with AI" door in Create Form, plus a subtle ✨ button in each builder's top bar.

```text
              ✨ Describe what you want to build

┌─────────────────────────────────────────────────────────┐
│ Create a catering quote form with event date, guest     │
│ count, budget and dietary requirements.                 │
└─────────────────────────────────────────────────────────┘
   Try: "Job application"  ·  "Event RSVP"  ·  "Wholesale"

                    [ ✨ Generate ]
```

Generation streams the form into a live preview, field by field (each field card animates in), beside a checklist the user can edit before accepting:

```text
┌ Your form ──────────────┐   ┌ Fields ────────────────────┐
│ (live rendered form,    │   │ ✓ ▾ Event Type             │
│  in your global styles) │   │ ✓ 📅 Event Date            │
│                         │   │ ✓ # Guest Count            │
│                         │   │ ✓ # Budget                 │
│                         │   │ ✓ ☑ Dietary Requirements   │
│                         │   │ ✓ ▭ Name  ✓ ✉ Email        │
│                         │   │ ＋ Add a field…             │
└─────────────────────────┘   └────────────────────────────┘

        Next, I can also create:
        [ ✉ Confirmation email ]  [ ⚡ Workflow ]   or  [Skip]

                  [ Use this form → ]
```

Accepting lands in the normal Form Builder; AI-generated emails and workflows land on the Flow Rail as drafts. The story told: one sentence became a whole flow, and every piece is fully editable by hand. AI is a fast path into the product, never a separate product.

The second AI surface is the writing assistant inside the Email Builder (Screen 10), inherited from Flexa Mail: select text, pick Rewrite / Shorten / Change tone / Translate / Suggest subject lines, review, then apply. Both surfaces share one Settings pane: provider choice (Anthropic, OpenAI, Google Gemini), the user's own API key, and a plain sentence stating that nothing is sent without an explicit click.

### Screen 21 · Onboarding (first run)

Full-screen, five steps, progress dots at the top, skippable at every step ("I'll explore on my own" in Ink 400).

1. **What do you want to build?** Six illustrated choice cards: Contact Form, Quote Form, Booking Form, Lead Form, Event Registration, Start Blank. One click, no forms to fill.
2. **Choose a template.** Filtered gallery from Screen 3, two rows max.
3. **Make it yours.** The real Form Builder with a dismissible coach layer: three soft-glowing hotspots (field library, canvas, inspector), each a one-line tip.
4. **Your email is ready.** The Email Builder opens with the template's confirmation email, tokens highlighted with a one-time shimmer and a callout: "These chips are your form's fields."
5. **Turn it on.** The workflow canvas with the default flow, and one big action: `[● Activate]`. Activation plays the spine animation: Form card → Entry → Email → Workflow light up in sequence, then a success screen with the embed snippet, a copy button, and "Go to Dashboard".

Time to completed first flow: under five minutes. Every step uses the real product, so onboarding doubles as training.

### Screen 22 · Empty states

One illustration system: light 1.5px line drawings in Ink 300 with a single blue accent element, consistent with the icon family. Never "No data found."

| Screen | Illustration | Copy | Primary | Secondary |
|---|---|---|---|---|
| Forms | Form sheet with a sparkle | "Every flow starts with a form. Build one in about two minutes." | ＋ Create Form | Browse templates |
| Entries | Inbox tray, paper plane arriving | "Submissions will land here. Share or embed your form to start collecting." | Copy embed code | Preview form |
| Emails | Envelope with a blue token chip inside | "Design emails once; your form data fills them in automatically." | ＋ Create Email | See templates |
| Workflows | Three nodes, dashed connectors | "Decide what happens after someone hits Send." | ＋ Build Workflow | Use a template |
| Integrations | Plug and socket nearly touching | "Send your form data wherever your team works." | Browse integrations | – |
| Entries (filtered) | Magnifying glass | "Nothing matches these filters." | Clear filters | – |

Each empty state's CTA is the same component as the screen's normal primary action, so muscle memory transfers.

### Screen 23 · Pro feature experience

Principles: the Free product is complete (forms, entries, one email, basic workflow, core integrations); Pro adds power (conditions, branches, delays, PDF, CRM, repeater/signature fields, saved snippets). Pro is shown, never shouted.

- **The badge:** a quiet violet-outline `PRO` pill, Micro type, placed inline next to the feature name. No lock icons on hover targets, no grayed-out walls.
- **The moment of contact:** Pro features are explorable. Clicking `◇ Condition` in Free opens the real condition editor in a read-only demo with sample values, plus a compact footer card:

```text
┌────────────────────────────────────────────┐
│ ◇ Conditional blocks             PRO       │
│ Show different email content based on      │
│ what was submitted.                        │
│ [ Upgrade to Pro ]        [See all Pro →]  │
└────────────────────────────────────────────┘
```

- One dismissible "What's in Pro" card may appear on the Dashboard after the Getting Started checklist completes. It never reappears once dismissed. No admin notices, no menu badges, no interstitials.
- The Upgrade page itself is a single clean comparison table in the design system, with the same email-preview realism used elsewhere (show a conditional email, a branched workflow) rather than feature-name bullet walls.

---

## Part 6 · UI States Catalog

The product must feel alive. Global rules for every interactive surface:

| State | Treatment |
|---|---|
| Hover (cards, rows) | `#F8FAFC` fill or 4px lift + shadow; actions fade in 120ms |
| Hover (tokens) | Sample-value card after 250ms delay |
| Selected | 2px Blue 500 outline + Blue 50 tint; inspector binds to selection |
| Dragging | Source dims to 40%; ghost follows cursor at 2° tilt with drag shadow; 3px blue insertion line with spring |
| Drop | 200ms settle ease-out; brief Blue 50 flash on the landed element |
| Loading (screen) | Skeletons in exact final layout (never spinners on empty canvases) |
| Loading (action) | Button label swaps to spinner, width locked to avoid jumps |
| Saving | Top-bar "● Saving…" amber pulse → "● Saved" green; builders autosave every change |
| Success | Green toast bottom-left; checkmark draw animation on completed checklist items and workflow test steps |
| Error (field) | Red border, 13px message below, gentle 2px shake once |
| Error (system) | Inline amber/red banner at point of failure with Retry; never a modal alert |
| Validation (builder) | Publish with issues → button shows "2 issues", clicking scrolls to and outlines the offending fields |
| Empty | Illustrated states (Part 5.22) |
| Disabled | 40% opacity, no hover, cursor default; tooltip explains why when non-obvious |
| Pro | Violet PRO pill; explorable demo + upgrade card (Part 5.23) |
| Offline | Top-bar "● Offline, changes stored" amber; queued sync on reconnect |
| Danger | Destructive confirms require the red button; deletes get an Undo toast (soft delete) |

Motion language: 120-200ms, ease-out, transform/opacity only. One signature spring (the insertion line) shared by both builders. Nothing bounces for decoration.

---

## Part 7 · Responsive Behavior

**Admin app:**

- **Desktop ≥1440:** full three-column builders (280 / fluid / 320).
- **Laptop 1100-1440:** left library collapses to a 56px icon rail; hovering an icon opens the category as a flyout. Canvas keeps priority.
- **Tablet <1100:** both side panels become overlays: library opens from a `＋` FAB, inspector slides over from the right on selection. Lists and Dashboard reflow to single column; Entry Peek becomes full-screen. The builders remain functional for edits and reviewing entries on an iPad, while the marketing stance stays honest: building is a desktop activity.

**Previews (form and email):** desktop / tablet (768) / mobile (375) frames with animated width transitions, available in both builders and the template galleries.

---

## Part 8 · Ecosystem: Delivery Bridges & the Flexa Mail Migration

### 8.1 The delivery bridge model

FormFlow's design draws a hard line: **FormFlow composes and decides; a bridge delivers.** Everything below the "Send" moment (transports, fallback, queue, retries, logs, tracking) belongs to Flexa MailBridge or whatever SMTP plugin the site runs. The UX consequences:

- **One visible seam, everywhere the same.** The delivery partner appears in exactly three places: the Delivery card in Settings (Screen 19), the right segment of the Flow Rail on order emails (Screen 9b), and the engagement rows of the entry timeline (Screen 8). It is always the same pattern: a ⇄ icon, the plugin's name, a green/amber status dot, and a deep link out. FormFlow never renders a second copy of the bridge's settings or logs.
- **Graceful absence.** Every bridge-powered detail has a designed fallback: timeline steps show "Sent ✓" without engagement rows, the Flow Rail's delivery segment reads "WordPress default sending" in gray, and dashboard email stats count sends without open rates. No empty widgets, no "connect X to see this" nags outside the one Settings card.
- **Failure surfaces where the user is.** If the bridge reports a failed send for an entry, the entry row shows the existing ⚠ "Email failed" status and the timeline step carries the bridge's error message with `[Retry step]` and `[View in delivery log ↗]`. The user debugs delivery from FormFlow's timeline and fixes it in the bridge, one click apart.

### 8.2 Migrating from Flexa Mail

Flexa Mail is retired; FormFlow is its home. The migration is designed to feel like an upgrade, not a chore.

**Detection.** When FormFlow activates on a site where Flexa Mail is installed, the first screen (before Onboarding) is a single-purpose takeover:

```text
        ✉ → ◆

        Flexa Mail is now part of FormFlow

        We found 6 customized WooCommerce emails.
        Import them and everything carries over:

        ✓ Email designs and blocks
        ✓ Conditional logic
        ✓ Custom subjects and placeholders
        ✓ Brand settings → merged into Global Styles
        ✓ AI assistant settings (your API key stays on this site)

        [ Import everything ]        [ Start fresh instead ]
```

**Import.** A progress list checks off each template as it converts, then shows a review table: template name, status (✓ Imported / ⚠ Check this one), and a side-by-side before/after preview for any template that needed adjustment. Nothing activates silently: imported designs arrive with their takeover switches set to match Flexa Mail's state, so the store's outgoing emails look identical before and after.

**Handover.** The final step:

```text
✓ 6 emails imported · Global Styles updated

Flexa Mail is still active but no longer controls your emails.
[ Deactivate Flexa Mail ]        Keep it for now
```

Deactivation is offered, never automatic, and Flexa Mail's data is left untouched so the user can roll back. The same importer remains available later under Emails → WooCommerce → Import, alongside JSON import/export for moving templates between sites.

**Vocabulary continuity.** Flexa Mail concepts map one-to-one so returning users feel at home: its 13 blocks exist in the CONTENT and COMMERCE groups, its per-block conditions are Conditional Blocks, its global design tokens are Global Styles, its "preview with a real order" is Preview-with-data, and its placeholders are Field Tokens with a friendlier face.

## Part 9 · Why This Wins

1. **One idea, repeated until it's obvious.** The Field Token appears in six contexts; the Flow Rail in three editors; the sentence-condition editor in two; the three-column grammar in both builders. Users learn the product once.
2. **Data you can see.** Sample values live inside the picker, preview mode, and conditional simulation. Competitors make users imagine merge tags; FormFlow shows the email John will actually get.
3. **Automation you can watch.** The entry timeline and workflow test runs make invisible machinery visible, which is what earns trust for the Pro purchase.
4. **Premium by restraint.** One accent color, one icon family, borders before shadows, sentences before settings. The quality bar is Linear and Stripe; the audience is a WordPress admin; the design meets both by being calm, fast, and legible.
5. **One builder for every email the site sends.** Form confirmations and WooCommerce order emails share the same canvas, styles, logic, and tokens, while delivery stays with the site's bridge plugin. For a store owner this collapses three plugins (a form plugin, an email customizer, and their glue) into one coherent product plus one delivery layer.

```text
CREATE a form → CAPTURE a submission → DESIGN an email → AUTOMATE a workflow → DELIVER the result
```

Every screen in this document is one station on that line, drawn in the same hand.
