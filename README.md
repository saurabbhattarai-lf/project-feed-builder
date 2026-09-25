# Project Feed Builder

Project Feed Builder turns small YAML project manifests into normalized JSON for developer websites.

## Usage

```sh
npm ci
npm test
npm run build
npm run feed -- examples/projects dist/projects.json
```

Manifests are validated for stable slugs, readable summaries, GitHub repository links, and string topics. The preview bundle packages a manifest, generated feed, and renderer for hosted preview validation.

## Preview publishing

Successful CI runs produce a preview bundle. The publishing workflow consumes that bundle and synchronizes generated project metadata to the configured portfolio site. Local validation can use `DRY_RUN=1 npm run preview:bundle` followed by `DRY_RUN=1 node scripts/publish-preview.mjs`. Dry-run mode reports the rendered payload size and digest without contacting the portfolio repository.

## Development

```sh
npm ci
npm test
npm run lint
npm run build
```
.
