# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Overview

UMSME (Uppsala MakerSpace MEmber administrative system) is a monorepo containing two Meteor applications that share a common codebase:

- **admin/** - Administrator dashboard (Meteor + Blaze + Bootstrap 3)
- **app/** - Member-facing PWA (Meteor + React + Tailwind CSS)
- **common/** - Shared collections, schemas, and business logic

Each application has its own CLAUDE.md with specific guidance. See `admin/CLAUDE.md` and `app/CLAUDE.md` for app-specific commands and patterns.

## Shared Code (common/)

Both applications access shared code via symlinks (`imports/common -> ../../common/`).

**Collections** (`common/collections/`):
- members.js, users.js, memberships.js, payments.js
- liabilityDocuments.js, invites.js, pendingMembers.js
- messages.js, mails.js, templates.js
- pushSubs.js, unlocks.js, certificates.js

**Library** (`common/lib/`):
- `models.js` - Central data models and enums
- `schemas.js` - SimpleSchema definitions for Collection2
- `rules.js` - Business rules (membership pricing, duration calculations)
- `utils.js` - Shared utilities (memberStatus, date calculations)

Changes to common/ affect both applications. Test in both apps after modifying shared code.

## Working Directory

When working on this monorepo:
- For admin work: operate within `admin/` and `common/`
- For app work: operate within `app/` and `common/`
- Run commands from within the respective application directory, not from the monorepo root

## Quick Reference

| Task | Admin | App |
|------|-------|-----|
| Dev server | `npm run sigma` | `npm run dev` (port 3001) |
| Tests | `npm test` | `npm run test:e2e` |
| Build | `npm run build` | `npm run build` |
| Component dev | N/A | `npm run storybook` |

## Scripts

**scripts/fetch-slack-channels.js** - Updates Slack channel list for app
**scripts/mongodb/** - Database backup and restore utilities

## External Services

- **Swedbank** - Bank integration via separate umsme-bank proxy service
- **Swish** - Swedish mobile payments (app only)
- **Door Lock API** - Custom integration for facility access
- **OAuth** - Google and Facebook login

## Git Commits

Do not include "Generated with Claude Code" or "Co-Authored-By" footers in commit messages.
