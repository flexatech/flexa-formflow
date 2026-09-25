=== Flexa FormFlow ===
Contributors: flexatech
Tags: forms, form builder, email builder, automation, workflows
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Build forms, design emails, automate workflows. Submissions become structured data you can use in visual emails and automations.

== Description ==

Flexa FormFlow connects three tools that usually live apart: a form builder, a visual email builder, and a workflow builder. Every field you add to a form becomes data you can drop into an email, branch on in a workflow, and trace in an entry timeline.

This is an early scaffold release. The admin shell, settings, and onboarding are in place; the form, email, and workflow builders arrive in upcoming releases.

FormFlow does not send email itself in any special way; it hands finished messages to WordPress. Pair it with a delivery plugin such as Flexa MailBridge for SMTP routing, logs, and open tracking.

== Frequently Asked Questions ==

= Does it require WooCommerce? =

No. FormFlow works on any WordPress site. When WooCommerce is active, its transactional emails can be designed in the same email builder.

== Changelog ==

= 0.1.0 =
* Initial scaffold: admin app shell, settings, onboarding state, REST foundation.
