# Deployment Manifest: Local to Live

Date: 2026-06-15
Source folder: `C:\CPANEL_LOCAL_RUN\appdata\public_html`
Target domain: `familyandflats.com`

## Upload These Live Website Areas

- Root public pages:
  - `index.html`
  - `sale.html`
  - `lease.html`
  - `blogs.html`
  - `news.html`
  - `post-property.html`
  - `contact-us.html`
  - `faqs.html`
  - `services.html`
  - `reviews.html`
  - `nri-services.html`
  - `privacy-policy.html`
  - other approved root HTML/PHP pages that are still required for URL compatibility
- Shared assets:
  - `assets/`
  - `images/`
- Structured content:
  - `content/`
  - `projects/`
  - `listings/`
  - `services/`
  - `team/`
- SEO/server files:
  - `.htaccess`
  - `robots.txt`
  - `sitemap.xml`
- Form endpoints only after confirming the live mail settings:
  - `send-email.php`
  - `send_email.php`
  - `send_email1.php`
  - `send_email2.php`
  - `thank-you.php`

## Do Not Upload These Working/Archive Areas

- `_archive/`
- `_reports/`
- `_source_material/`
- `_BACKUP_BEFORE_RESTRUCTURE` or any backup folders if present
- `phase-3-*.md` report files
- `project-page-qa-tracker-summary.md`
- `listing-data-entry-guide.md`
- `deployment-manifest-local-to-live.md`
- `safe-to-delete-review-after-approval.md`

## Pre-Upload Checklist

- Take a live cPanel backup before replacing files.
- Upload to a staging folder first if available.
- Verify header, footer, project pages, sale, lease, blogs, news, contact form, and WhatsApp links.
- Confirm PHP mail endpoints work in the live hosting environment.
- Submit the new `sitemap.xml` after deployment.

## Rollback Plan

- Keep the pre-upload live backup untouched.
- If any critical issue appears, restore the previous live files from that backup.
- Because old local files are archived instead of deleted, individual local files can also be recovered from `_archive/_OLD_FILES_REVIEW_AND_DELETE`.

