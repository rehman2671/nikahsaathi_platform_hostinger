# Hostinger deployment assessment

**Date:** 25 August 2026  
**Target plan:** User-owned Hostinger Business shared hosting, four-year term  
**Project:** NikahSaathi Platform

## Confirmed project runtime

NikahSaathi is a full-stack Node.js/TypeScript application. The server uses Express and tRPC, the client uses React/Vite, the database layer uses Drizzle with MySQL/TiDB, and the project includes OAuth/session, Telegram webhook, scheduled retention callback and managed storage integrations. The production build produces a Vite frontend and a bundled Node server entry at `dist/index.js`.

## Hostinger findings

Hostinger’s official Node.js Web App documentation says Node.js applications are available on Business Web Hosting and Cloud plans. It lists Express.js as a supported backend framework and React/Vite as supported frontend technologies, with Node.js versions 18.x, 20.x, 22.x and 24.x. It describes deployment through a GitHub repository or ZIP upload and provides build/entry-file settings for applications classified as “Other” [1].

Hostinger’s official Agency Hosting documentation describes its static front-end application mode as pre-built files served without server-side processing or a database. Its supported Agency static frameworks include Vite and React via Vite [2]. Therefore, the supplied Agency `build-assets` endpoint should be treated as a static-asset build/deployment mechanism, not as proof that an Express API, database session service or webhook worker can run there.

## Compatibility conclusion

The Business plan may be capable of hosting the complete Node.js application through Hostinger’s **Node.js Web App** product, but the supplied Agency static `build-assets` endpoint alone cannot host the core backend. The safest architecture is either: (a) Hostinger Node.js Web App for the full application, if the user’s exact Business account exposes that feature and its resource/long-running-process limits are acceptable; or (b) Hostinger for the static React frontend only, with the existing managed backend/API hosted separately. A single shared database can be used only if the backend host can securely connect to Hostinger MySQL or a separate managed MySQL instance.

The major migration issue is not Node.js itself. Manus-provided OAuth, Forge API, managed storage and environment injection are currently available in the existing environment. On Hostinger, each integration needs explicit production credentials, callback URLs, storage configuration and deployment secrets. Those values must never be committed to GitHub or placed in frontend-visible variables.

## Required Hostinger verification before deployment

Confirm in the actual hPanel account that Node.js Web Apps are enabled for the Business plan, which Node version is selectable, whether the app supports a continuously running Express process, how environment variables are configured, the assigned application start command, memory/CPU/process limits, inbound webhook reachability, cron execution, MySQL connection details, SSL/subdomain routing and log access. Also confirm whether the Node.js Web App and Agency website products are separate product types under the same account.

## Recommended target topology

For the first deployment, use `nikahsaathi.com` or `app.nikahsaathi.com` for the web application, `api.nikahsaathi.com` for the Node API, and `ops.nikahsaathi.com` for the operations console. If Hostinger Node.js Web Apps can serve the full app, these may be separate websites/app mappings in the same account, but the API must remain one authoritative backend. If only static Agency deployment is available, deploy the React build to Hostinger and keep `api.nikahsaathi.com` on a Node-capable managed host or VPS. Do not split the database between independent copies.

## Sources

[1]: [Hostinger — How to add a Node.js Web App](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) — Business plan support, supported frameworks, Node versions and deployment settings.

[2]: [Hostinger — How to upload a static front-end application on Agency plan](https://www.hostinger.com/support/how-to-upload-a-static-front-end-application-on-agency-plan/) — Agency static application behavior and limitations.

[3]: [Hostinger — Node.js hosting options](https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/) — distinction between Business/Cloud Node.js Web Apps, VPS and Agency static front-end hosting.

[4]: [Hostinger Developer API reference](https://developers.hostinger.com/) — API catalogue containing hosting, Node.js and Agency website operations.
