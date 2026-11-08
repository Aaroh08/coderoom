# Security model

CodeRoom runs on loopback by default. Public GitHub source code is not a public application deployment.

Trust boundaries: browser capability possession, HTTP API, database, and project-specific workers. Capabilities are shared editing credentials, not user identities. A member can copy data or rotate access. Browser local storage is accessible to scripts on the same origin; XSS would compromise the invite. CSP, escaped rendering and no external scripts reduce this risk but do not prove its absence.

The web server sends code to a separate child process. QuickJS runs it in a WebAssembly interpreter with no host bindings or module loader. A one-second interrupt budget and three-second process deadline stop runaway execution; two simultaneous workers are allowed. QuickJS is configured with a 16 MB memory limit and 256 KB stack limit, but these are not a hard operating-system RSS quota. The process V8 heap limit also does not cap all native/WASM memory. Internet-facing execution requires a dedicated sandbox service with OS/container isolation and resource enforcement.

The API rejects foreign Origin headers, bounds JSON bodies and collaboration state, and rate-limits 600 API requests per minute per socket address. The limiter is in memory and resets on restart; behind a proxy, configure identity and trusted forwarding deliberately. Workspace creation has a persistent global capacity limit (50 by default, configured with MAX_ROOMS). This is not an account quota: an anonymous visitor could exhaust capacity, so public deployment still needs authenticated creation and per-user controls. Hosts and browser Origins are checked against PUBLIC_ORIGIN for configured deployments; forwarded headers are not trusted. No TLS, central audit trail, encryption at rest or automatic retention policy is provided.

Report suspected vulnerabilities through GitHub private vulnerability reporting if enabled; do not include live invite links or private documents in public issues. Treat dependencies and parser/interpreter boundaries as attack surfaces. Review package-lock changes and run npm audit before deployment.

The supplied Docker Compose configuration runs as a non-root user with a read-only application filesystem, dropped Linux capabilities, no-new-privileges, and container-wide CPU/memory/process limits. These bounds cover the whole service; they do not create a separate security boundary for each code execution or PDF parse.
