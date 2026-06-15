# Phase 3 - Project Old Files Centralized

Date: 2026-06-15

## Purpose

Moved old project-folder files into one central review/delete archive so the active project folders stay clean and old material can be reviewed in one place.

## Central Archive Folder

`_archive/_OLD_FILES_REVIEW_AND_DELETE/`

Full local path:

`C:\CPANEL_LOCAL_RUN\appdata\public_html\_archive\_OLD_FILES_REVIEW_AND_DELETE`

## Move Log

CSV log:

`C:\CPANEL_LOCAL_RUN\appdata\public_html\_archive\_OLD_FILES_REVIEW_AND_DELETE\moved-files-log.csv`

## Files/Folders Moved

Moved 103 old files/folders from project folders, including:

- Legacy per-project `css/` folders
- Legacy per-project `js/` folders
- Legacy per-project `font/` folders
- Old project-folder helper files such as:
  - `form.html`
  - `new-img.html`
  - `popup-form.html`
  - `slider.html`
  - `privacy-policy.html`
- Old project-folder blog files such as:
  - `blog-*.html`
  - `blogs.html`
- Unused old local stylesheets from smaller rebuilt pages:
  - `projects/emaar-digi-homes-2bhk-for-sale-gurgaon/style.css`
  - `projects/emaar-india-developer/style.css`

## Verification After Move

The following URLs were verified after moving old files:

- `/projects/`
- `/projects/ireo-skyon/`
- `/projects/ireovictoryvalley/`
- `/projects/ireo-victory-valley/`
- `/projects/ireograndarch/`
- `/projects/conscienthineselevate/`
- `/projects/emaardigihomes/`
- `/projects/emaar-digi-homes-2bhk-for-sale-gurgaon/`
- `/projects/emaar-india-developer/`

Result:

- All return `200 OK`
- No missing local references found on main project pages
- Old files no longer remain scattered in active project folders

## Important Note

`_source_material/All-landing-pages/` was not moved in this cleanup because it is still needed as source material for building additional project pages. After useful content/assets are extracted, that source folder can also be moved into this same central archive.

## Future Rule

For all following rebuild work:

- Do not leave replaced legacy files in their original active folders
- Move replaced/old files into `_archive/_OLD_FILES_REVIEW_AND_DELETE/`
- Preserve original relative paths inside the archive
- Keep a log so the archive can be reviewed and deleted later as one unit
