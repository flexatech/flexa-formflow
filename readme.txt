=== Flexa FormFlow ===
Contributors: flexatech
Tags: forms, form builder, email builder, contact form, form entries
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Build forms, collect entries, and design the emails they trigger. Every field becomes data you can drop into a visual email with one click.

== Description ==

Flexa FormFlow joins two tools that usually live in separate plugins: a form builder and a visual email builder. A field you add to a form becomes a token you can drop into the notification email, so the message people receive matches the data they sent.

**Form builder**

Drag fields from the palette onto the canvas, reorder them, and edit each one in the inspector. Field types: text, email, paragraph, dropdown, radio, checkbox, number, date, and hidden. Every field carries a per-breakpoint width, so you can lay fields out in columns on desktop and let them stack on mobile without touching CSS.

Place a form with the `[flexa_formflow id="123"]` shortcode or the Flexa FormFlow block. Submissions are protected by a honeypot and a submit-time trap, so common spam bots never reach your inbox.

**Entries**

Every submission is stored. Browse them in a list with a quick peek panel, open the full detail view, and mark entries read or unread. Nothing is locked behind an external service.

**Visual email builder**

Design the notification email with a block editor: headings, text, buttons, images, dividers, spacers, columns, and a fields table that renders the whole submission. Insert form data visually with `{field:ID}` tokens and headers like `{form_title}`, no shortcode syntax to memorize. Save designs to a template library, set global styles once, preview in desktop and mobile widths, and send yourself a test before going live.

Each form can send an admin notification and an optional confirmation to the person who filled it in. When no custom design is chosen, a clean default layout is used.

**Delivery**

FormFlow does not send mail in any special way; it hands the finished message to WordPress with `wp_mail()`. Pair it with a delivery plugin such as Flexa MailBridge (or any SMTP plugin) for routing, logs, and tracking.

**Does not require WooCommerce.** FormFlow runs on any WordPress site.

== Installation ==

1. Upload the `flexa-formflow` folder to `/wp-content/plugins/`, or install the zip from Plugins > Add New > Upload Plugin.
2. Activate the plugin through the Plugins screen.
3. Open Flexa FormFlow in the admin menu, create a form, and copy its shortcode.
4. Paste the shortcode into any post or page, or add the Flexa FormFlow block.

== Frequently Asked Questions ==

= Does it require WooCommerce? =

No. FormFlow works on any WordPress site.

= How do I add a form to a page? =

Create a form, then use its `[flexa_formflow id="123"]` shortcode, or add the Flexa FormFlow block in the editor.

= Does FormFlow send email through its own server? =

No. It builds the message and passes it to WordPress `wp_mail()`. Delivery follows whatever your site already uses. For SMTP, logs, and open tracking, add a delivery plugin such as Flexa MailBridge.

= Where are submissions stored? =

In your own database, in the plugin's tables. You can view, read, and delete entries from the Entries screen. Nothing is sent to a third party.

= What happens to my data when I uninstall? =

Nothing is removed unless you turn on "Delete data on uninstall" in Settings first. With it off, your forms, entries, and templates survive a reinstall.

== Screenshots ==

1. The form builder: field palette, canvas, and the field inspector with responsive column widths.
2. The entries list with the quick peek panel open.
3. The visual email builder with the block layer list, live preview, and inspector.
4. Inserting a form field token into an email block.
5. Plugin settings.

== Changelog ==

= 1.0.0 =
* Form builder: drag-and-drop canvas, nine field types, per-field responsive column widths, required and placeholder options.
* Frontend rendering via shortcode and block, with honeypot and submit-time spam traps.
* Entries: storage, list with peek panel, detail view, read/unread status.
* Visual email builder: block-based editor, field tokens, a fields table, template library, global styles, desktop and mobile preview, and test send.
* Notification email to the admin and optional confirmation to the submitter, sent through `wp_mail()`.
* Settings and onboarding; optional delete-data-on-uninstall.
