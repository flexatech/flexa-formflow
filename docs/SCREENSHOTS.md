# Directory art and screenshots (WP.org)

Shot list for the 1.0.0 launch. Captions here match the `== Screenshots ==`
order in `readme.txt`; keep the two in sync if you reorder.

## Where the files go

WP.org art does NOT ship inside the plugin zip. It lives in the SVN
`/assets/` folder at the repo root (a sibling of `/trunk`, `/tags`), so it is
never part of a version tag. File names are fixed by convention:

- `icon-256x256.png` (also `icon-128x128.png` for older cores; an `icon.svg`
  is allowed and preferred if you have vector art)
- `banner-772x250.png` and `banner-1544x500.png` (the retina banner)
- `screenshot-1.png` ... `screenshot-5.png`

PNG or JPG both work. Screenshots have no hard size rule; use a consistent
width (1280 wide reads well on the directory, downscaled to the listing) and
the same browser chrome (or none) across all five so the set looks uniform.

## Icon (256x256)

The FormFlow mark on a solid or subtle-gradient brand background. Use the
same brand blue as the admin app (`--color-brand-500`, roughly a mid blue).
No text: at 32px in the plugin list only the shape survives. Keep clear
padding so nothing touches the edge.

## Banner (1544x500 retina, 772x250 base)

Left third: "Flexa FormFlow" wordmark plus a one-line tagline, e.g. "Forms
that build their own emails." Right two-thirds: a clean composite of the form
builder canvas fading into an email preview, to show the form-to-email link at
a glance. Brand blue accents, light background, generous whitespace. Text must
sit in the left third so it stays legible when the banner is cropped narrow.

## Screenshot 1: Form builder

The three-pane builder in the admin. Left palette with the field types, a
canvas holding a short realistic form (Name, Email, a dropdown, a Message
paragraph), and the right inspector open on a field showing the three width
controls (desktop / tablet / mobile). Pick a field whose desktop width is Half
so the responsive story is visible. Select the field so the inspector is
populated, not empty.

## Screenshot 2: Entries list with the peek panel

The Entries screen: the list of submissions on the left, the quick peek panel
open on the right for one entry showing its field values. Have a few entries
present, with at least one unread (bold / dot) so the read/unread state shows.
Use believable sample data, not "test test".

## Screenshot 3: Visual email builder

The three-pane email editor: the block layer list on the left, the live
preview in the middle rendering a notification email (heading, intro text, the
fields table, a button), and the inspector on the right editing the selected
block. Keep the preview in desktop width for this shot.

## Screenshot 4: Inserting a form field token

The email builder mid-action: the field-data picker open and a `{field:ID}`
token being inserted into a text or heading block, with the preview beside it
showing the resolved sample value. This is the shot that sells the "form data
into email, no shortcodes" idea, so make the picker and the resulting token
both clearly visible.

## Screenshot 5: Settings

The plugin Settings screen. Make sure the "Delete data on uninstall" toggle is
in frame (reviewers and users look for it), alongside the other settings rows.
Clean state, nothing mid-edit.

## Capture tips

- Hard-refresh wp-admin after a build so the latest bundle loads.
- Use a light admin color scheme for consistency with the banner.
- Seed one demo form and a handful of entries first so every screen looks
  lived-in rather than empty.
- Export at the same zoom / device-pixel ratio across all five.
