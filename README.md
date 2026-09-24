# MIA — Memory. Identity. Authenticity.

Standalone MIA public website plus the first working **MIA Memories** application MVP for ORVIA Oversight Ltd.

## Current build

The public website remains at the repository root.

The working memory application is available under:

`/app/`

It currently supports:

- browser-local Memory Spaces;
- create, edit and delete Memory Objects;
- photograph, video, audio and document upload;
- preservation of original uploaded binary files in IndexedDB;
- SHA-256 hashing of originals;
- explicit provenance fields and date-confidence labels;
- people and places views;
- timeline;
- For Later / legacy release instructions;
- audit records for create, update and delete actions;
- archive export containing:
  - `mia-manifest.json`;
  - audit history;
  - original uploaded binary files.

## Safety and honesty

This is a **local MVP**, not the finished production service.

The current build does **not** yet claim to provide:

- cloud accounts or multi-device synchronisation;
- server-side encrypted storage;
- EXIF/GPS extraction;
- Google Photos or Facebook import;
- automatic legacy release;
- face recognition;
- AI-authored memories.

Synthetic demonstration memories are explicitly marked. Inferred information must remain labelled and must not silently become verified.

## Storage

The MVP stores memories and originals in the browser's IndexedDB on the device being used.

Clearing browser/site storage can remove this local data, so this build must not yet be treated as the only copy of irreplaceable family material.

## Product principle

> Preserve the memory. Preserve the original. Preserve the person's right to their own story.

## Deployment

Static site suitable for Vercel. The configured public alias is:

`mia.orvia.org.uk`

The application route is:

`https://mia.orvia.org.uk/app/`

A Vercel project still needs to be connected to this GitHub repository if the domain is not already deploying from it.
