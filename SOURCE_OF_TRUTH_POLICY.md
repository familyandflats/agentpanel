# Family&Flats Source-of-Truth Policy

## Rule
Permanent production changes must originate from the local canonical repository, be committed, pushed, deployed, and then verified live.

## Public website
Source of truth: `C:\CPANEL_LOCAL_RUN\appdata\public_html` on branch `main`.
Production is a deployment target, not an editing environment.

## Application / localhost:3000
Source of truth: `FamilyFlats_Canonical` on branch `canonical/fcv2-unified-tree-v1`.
Production builds must come from a clean detached worktree of the exact pushed canonical commit.

## Emergency hotfix
A live-first hotfix is allowed only for an urgent outage. Before closure, the exact change must be backported to the local canonical repository, committed, pushed, and parity-checked.

## Closure gate
Do not declare work complete if any production-only permanent change remains, if the source worktree is dirty, or if local HEAD differs from the pushed canonical branch.
