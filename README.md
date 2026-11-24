# Countercult Network

This repository contains the Countercult web application, API server, and shared software packages. Countercult builds digital infrastructure for local culture and real-world participation.

The software is licensed under **GNU Affero General Public License v3.0 or later**. See [`LICENSE`](LICENSE).

## What is included

- Countercult web application
- API server and database schema
- Shared API, profile, and storage packages
- Tests and build configuration for these packages

## What is not included

This is a software source release, not a copy of Countercult's production environment. It does not include member or applicant records, private Exchange content, production databases, contact research, private partner material, or the workspace's previous Git history.

Published photographs, artwork, logos, publication archives, and other media are not licensed by the software license. Media imports in this source release point to a neutral placeholder. Replace them only with assets you have permission to use. A small amount of public page copy is included to keep the web app's content structure intact; that copy remains separately copyrighted. See [`ASSET-NOTICES.md`](ASSET-NOTICES.md).

## Development

Use a current Node.js LTS release and pnpm.

```sh
pnpm install
pnpm --filter @workspace/countercult dev
```

The Countercult Vite app defaults to port `5173` and base path `/`; set `PORT` and `BASE_PATH` if needed.

To check the source:

```sh
pnpm run typecheck
pnpm run test
pnpm run build
```

The API server requires a PostgreSQL database and service integrations. Configure these through environment variables or a secrets manager; never commit credentials or production data. The optional `DEFAULT_CURATOR_CODE` setting is intentionally unset by default. No redeemable invite code is shipped in source.

The API uses Replit's managed connector integration for some services. Operators running it elsewhere must configure an equivalent integration before using those features.

## License boundary

AGPL-3.0-or-later covers the software code in this repository. It does not grant rights to Countercult names, marks, artwork, photography, editorial work, member data, or third-party materials. Those remain subject to their own rights and applicable privacy rules.

If you modify and provide this software over a network, the AGPL's source-offer requirements apply. Read the license before redistributing or operating a modified version.
