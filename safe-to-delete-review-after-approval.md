# Safe-To-Delete Review List

Date: 2026-06-15
Rule: Nothing here should be permanently deleted until you manually review and approve it.

## Central Review Folder

All removed/replaced material is being centralized under:

`C:\CPANEL_LOCAL_RUN\appdata\public_html\_archive\_OLD_FILES_REVIEW_AND_DELETE`

## Delete Candidates After Review

- `unused-assets-batch5-20260615`
  - Archived unused CSS files from the cleanup pass.
  - Note: `anand.css` has been restored to `assets/css/anand.css` because `team/anand.html` still references it.
  - Review the remaining files in this archive folder before deletion.
- `listing-system-legacy-20260615`
  - Old listing/property files replaced by the new Sale/Lease listing system.
- `project-images-originals-20260615`
  - Original unoptimized project images retained after image compression.
- `emaar-mgf-the-palm-drive-original-images-20260615`
  - Original images retained after Palm Drive image optimization.
- `article-originals-before-h1-migration-20260615`
  - Article originals from before the H1/SEO cleanup.
- `empty-content-files-20260615`
  - Contains the zero-byte `blog-93.html` file removed from live content navigation and sitemap.

## Manual Review Before Delete

- `_archive/_OLD_FILES_REVIEW_AND_DELETE/projects`
  - Contains older project files/pages from previous project restructuring. Review carefully because project names and redirects matter for SEO.

## Keep For Now

- `_source_material/`
  - This is source/reference material from the old landing pages and should remain available until all useful content/images have been fully harvested.
- `_archive/`
  - Keep until you are satisfied the rebuilt site has no missing content, broken URLs, or missing images.
