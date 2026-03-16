# Vibe Coding Project Security & Readiness Master Checklist

Use this file for any AI-assisted project, vibe-coded app, internal tool, SaaS, automation, agent workflow, or low-code application.

It is designed to help you:
- plan securely before building
- verify security during development
- stress test before release
- audit AI agents, workflows, and integrations
- confirm nothing critical is missing

This document combines:
- a practical project to-do list
- a security hardening checklist
- an AI-agent verification workflow
- a deep audit prompt you can give to Claude Code, Antigravity, or any other LLM/tooling setup

---

## 1. Core Principles

These rules apply to every project by default.

1. **Assume AI-generated code is untrusted until reviewed.**
2. **Assume every public endpoint will be abused.**
3. **Assume every integration has more permission than needed unless proven otherwise.**
4. **Assume secrets will leak if they ever touch the client, logs, prompts, screenshots, or public repos.**
5. **Assume model output can be wrong, manipulated, or malicious.**
6. **Assume production defaults are unsafe until explicitly hardened.**
7. **Assume cost abuse is a security issue, not just a billing issue.**
8. **Assume sensitive data exposure can happen through prompts, logs, retrieval, analytics, and third-party tools.**
9. **Assume any destructive or external-facing action needs approval gates.**
10. **Assume deployment is incomplete until monitoring, rollback, and incident handling exist.**

---

## 2. Universal Project To-Do List

Use this on every project.

### A. Scope and Risk Definition
- [ ] Define what the app does in one sentence.
- [ ] Define who the users are.
- [ ] Define whether the app is internal, private, limited beta, or public internet-facing.
- [ ] List all sensitive actions the app can perform.
- [ ] List all sensitive data the app stores, reads, generates, or transmits.
- [ ] List all external integrations, APIs, databases, webhooks, and file stores.
- [ ] Identify whether any AI agent can:
  - [ ] send emails
  - [ ] delete data
  - [ ] trigger payments
  - [ ] call external APIs
  - [ ] access internal knowledge bases
  - [ ] create or modify records
  - [ ] run code or commands
- [ ] Classify the project risk level: low, medium, high, critical.
- [ ] Define what would cause business, privacy, legal, operational, or financial damage.

### B. Architecture and Trust Boundaries
- [ ] Draw the system flow from user input to final action.
- [ ] Mark trust boundaries between:
  - [ ] browser/client
  - [ ] backend/server
  - [ ] database/storage
  - [ ] LLM provider
  - [ ] third-party integrations
  - [ ] internal tools
  - [ ] admin-only functions
- [ ] Mark where untrusted input enters the system.
- [ ] Mark where model output is used downstream.
- [ ] Mark where secrets are loaded.
- [ ] Mark where personal or confidential data flows.
- [ ] Confirm which components are internet-facing.

### C. Authentication
- [ ] Require authentication for any non-public functionality.
- [ ] Use a trusted identity provider.
- [ ] Enable MFA for admin or privileged users.
- [ ] Confirm session handling is secure.
- [ ] Confirm password reset and account recovery flows are secure.
- [ ] Confirm no hidden URL is being treated as access control.
- [ ] Confirm there are no shared admin accounts.

### D. Authorization
- [ ] Define clear roles such as user, operator, support, admin, super admin.
- [ ] Check authorization on the backend, not only in the UI.
- [ ] Confirm each sensitive action verifies role/ownership explicitly.
- [ ] Confirm one user cannot access another user’s data without authorization.
- [ ] Confirm admin functions are isolated and logged.
- [ ] Confirm service accounts only have minimum required access.

### E. Secrets and Credentials
- [ ] Confirm no API key or credential is hardcoded in the frontend.
- [ ] Confirm no secret is stored in source code, screenshots, docs, or prompts.
- [ ] Store secrets in environment variables or a secret manager.
- [ ] Rotate secrets regularly.
- [ ] Revoke old, leaked, or test credentials.
- [ ] Separate dev, staging, and prod credentials.
- [ ] Confirm logs do not expose secrets.

### F. AI and LLM Safety
- [ ] Treat model output as untrusted.
- [ ] Separate system instructions, developer rules, and user input.
- [ ] Validate all model outputs before using them.
- [ ] Enforce structured output where possible.
- [ ] Reject malformed outputs.
- [ ] Prevent arbitrary command execution, arbitrary URLs, and arbitrary tool calls.
- [ ] Use allow-lists for actions, tools, domains, and operations.
- [ ] Add human approval for destructive, expensive, legal, financial, or customer-facing actions.
- [ ] Confirm prompt injection defenses exist for direct and indirect inputs.
- [ ] Confirm retrieved documents cannot silently override system rules.
- [ ] Confirm hidden instructions in files, URLs, markdown, HTML, PDFs, or images are treated as hostile.

### G. Input, Output, and Data Validation
- [ ] Validate all user input server-side.
- [ ] Sanitize or encode output before rendering in the browser.
- [ ] Prevent XSS, injection, and unsafe HTML rendering.
- [ ] Prevent SQL/NoSQL injection.
- [ ] Prevent shell/command injection.
- [ ] Enforce file type and file size validation for uploads.
- [ ] Scan uploaded files if needed.
- [ ] Limit request size and payload complexity.
- [ ] Reject unexpected fields and malformed requests.

### H. Cost and Abuse Controls
- [ ] Add per-user rate limits.
- [ ] Add per-IP rate limits.
- [ ] Add global rate limits.
- [ ] Add concurrency limits for expensive operations.
- [ ] Add timeouts for model/API requests.
- [ ] Add retry limits with backoff.
- [ ] Add circuit breakers to stop failure loops.
- [ ] Add quotas or usage caps.
- [ ] Add billing alerts and hard spend caps.
- [ ] Cache repeated requests where safe.
- [ ] Deduplicate repeated work.
- [ ] Confirm public endpoints cannot be spammed into a denial-of-wallet event.

### I. Integrations and Third-Party Services
- [ ] List every connector and permission scope.
- [ ] Remove unnecessary scopes.
- [ ] Confirm least privilege for every integration.
- [ ] Validate webhook signatures.
- [ ] Verify inbound webhook origin.
- [ ] Confirm outbound requests only reach approved destinations.
- [ ] Confirm integrations cannot be used to pivot into other systems.
- [ ] Confirm third-party failure does not break security assumptions.

### J. Data Privacy and Retention
- [ ] Minimize personal data in prompts.
- [ ] Minimize confidential data sent to third parties.
- [ ] Mask, tokenize, or redact sensitive fields where possible.
- [ ] Confirm retrieval only returns data the current user is allowed to access.
- [ ] Confirm logs do not retain raw sensitive content unnecessarily.
- [ ] Define retention periods for logs, prompts, outputs, uploads, and backups.
- [ ] Define deletion workflow for user data.
- [ ] Confirm provider data usage and retention policies are acceptable.

### K. Storage, Database, and File Security
- [ ] Confirm storage buckets are not public unless intentionally public.
- [ ] Encrypt data in transit.
- [ ] Encrypt sensitive data at rest where appropriate.
- [ ] Restrict database access to required services only.
- [ ] Separate internal/admin data from user data where possible.
- [ ] Confirm backups are protected.
- [ ] Confirm test data does not contain live secrets or real personal data.

### L. Environment and Deployment Hardening
- [ ] Separate local, dev, staging, and production environments.
- [ ] Disable debug mode in production.
- [ ] Disable test endpoints and admin backdoors in production.
- [ ] Lock down CORS.
- [ ] Lock down network access and firewall/security groups.
- [ ] Confirm only necessary ports and services are exposed.
- [ ] Confirm security headers are enabled where relevant.
- [ ] Confirm dependency versions are pinned or controlled.
- [ ] Confirm build and deployment pipeline does not expose secrets.

### M. Dependency and Supply Chain Review
- [ ] Review core libraries and SDKs.
- [ ] Remove abandoned or untrusted packages.
- [ ] Check for known vulnerabilities.
- [ ] Prefer reputable providers and maintained dependencies.
- [ ] Review plugins, templates, code snippets, and generated code before use.
- [ ] Confirm AI-generated code did not silently introduce risky packages.
- [ ] Check model, dataset, connector, and retrieval-source trustworthiness.

### N. Logging, Monitoring, and Alerts
- [ ] Log authentication events.
- [ ] Log authorization failures.
- [ ] Log admin actions.
- [ ] Log rate-limit events.
- [ ] Log model/tool failures.
- [ ] Log unusual usage spikes.
- [ ] Alert on billing anomalies.
- [ ] Alert on repeated errors or retries.
- [ ] Alert on unknown IPs or suspicious behavior where relevant.
- [ ] Confirm logs are protected from tampering.
- [ ] Confirm sensitive content is redacted from logs.

### O. Reliability, Recovery, and Incident Readiness
- [ ] Define a rollback plan.
- [ ] Define service degradation behavior when LLM/API providers fail.
- [ ] Confirm critical actions are idempotent where possible.
- [ ] Confirm duplicate requests do not create duplicate destructive outcomes.
- [ ] Create incident response steps for:
  - [ ] secret leak
  - [ ] prompt injection incident
  - [ ] data exposure
  - [ ] cost spike
  - [ ] abused public endpoint
  - [ ] compromised integration
- [ ] Confirm the team knows who owns production incidents.

### P. Release Readiness
- [ ] Confirm all critical and high-risk findings are fixed or formally accepted.
- [ ] Confirm staging testing matches production-like conditions.
- [ ] Confirm monitoring and alerts are live before launch.
- [ ] Confirm usage caps and budget thresholds are active before launch.
- [ ] Confirm backup and recovery paths are tested.
- [ ] Confirm documentation exists for operators.
- [ ] Confirm post-launch review date is scheduled.

---

## 3. AI Agent Verification Checklist

Use this when asking any AI agent to audit your project.

### Minimum verification goals
The AI must verify all of the following:
- [ ] Authentication exists where required.
- [ ] Authorization is enforced server-side.
- [ ] Secrets are never exposed to the client.
- [ ] LLM outputs are validated before downstream use.
- [ ] Prompt injection paths are identified.
- [ ] External actions have approval gates where needed.
- [ ] Rate limits, timeouts, retries, quotas, and spend caps exist.
- [ ] Logging and alerts cover abuse, auth failures, and cost spikes.
- [ ] Sensitive data access is scoped correctly.
- [ ] Integrations are least privilege.
- [ ] Dangerous defaults are disabled in production.
- [ ] Supply chain and dependencies are reviewed.
- [ ] No critical risk remains undocumented.

### Required audit outputs from the AI
Ask the AI to return:
1. **Architecture summary**
2. **Threat model**
3. **Risk register** with severity
4. **Missing controls list**
5. **Exploit scenarios**
6. **Code/config review findings**
7. **Stress test results**
8. **Prompt injection test results**
9. **Cost abuse simulation results**
10. **Go / no-go release decision**
11. **Prioritized remediation plan**
12. **What the AI could not verify**

---

## 4. Stress Tests Every Project Should Pass

Have your AI agent or reviewer actively test these.

### Access Control Tests
- [ ] Unauthenticated user cannot access private pages or APIs.
- [ ] Low-privilege user cannot access admin features.
- [ ] User A cannot read or modify User B data.
- [ ] Hidden endpoints are not accessible without authorization.

### Secret Exposure Tests
- [ ] No secrets appear in frontend bundles.
- [ ] No secrets appear in logs.
- [ ] No secrets appear in client error messages.
- [ ] No secrets appear in repo history or sample config files.

### Prompt Injection Tests
- [ ] User prompt tries to override system instructions.
- [ ] Uploaded file contains malicious instructions.
- [ ] Retrieved page includes hidden hostile content.
- [ ] Model is asked to reveal system prompts or secrets.
- [ ] Model is asked to call unauthorized tools or URLs.
- [ ] Model is asked to perform destructive actions without approval.

### Output Handling Tests
- [ ] Malformed JSON output is rejected.
- [ ] Unexpected tool calls are rejected.
- [ ] Arbitrary URLs are rejected.
- [ ] Dangerous shell/SQL/code payloads are rejected.
- [ ] Browser output is safely encoded.

### Cost Abuse and DoS Tests
- [ ] Burst traffic triggers rate limits.
- [ ] Large prompts are capped or rejected.
- [ ] Infinite retry loops do not occur.
- [ ] Slow or failed providers do not trigger uncontrolled retries.
- [ ] Usage caps and spend alerts activate correctly.

### Integration Tests
- [ ] Webhooks fail closed when signatures are invalid.
- [ ] Third-party outages do not bypass security checks.
- [ ] External APIs cannot be called outside approved destinations.
- [ ] Connected tools only expose approved data/actions.

### Privacy Tests
- [ ] Sensitive data is minimized in prompts.
- [ ] Unauthorized users cannot retrieve restricted documents.
- [ ] Logs redact sensitive fields.
- [ ] Deletion and retention controls work as intended.

### Deployment Tests
- [ ] Debug mode is off in production.
- [ ] Public storage buckets are not unintentionally exposed.
- [ ] CORS is restricted.
- [ ] Production environment variables are correct and isolated.
- [ ] Monitoring and alerting are active.

---

## 5. Red Flags That Must Block Release

Do not ship if any of these are true unless formally accepted by an owner who understands the risk.

- [ ] App has no real authentication but handles non-public data.
- [ ] Sensitive actions are protected only in the UI and not on the backend.
- [ ] Secrets are present in frontend code, prompt text, screenshots, docs, or repos.
- [ ] AI output is directly executed or trusted without validation.
- [ ] Agent can send emails, delete data, or trigger transactions without approval gates.
- [ ] Public LLM endpoint has no meaningful rate limit or quota.
- [ ] No spend cap or billing alert exists for paid APIs.
- [ ] Debug/admin/test interfaces are enabled in production.
- [ ] Retrieval or document access ignores per-user permissions.
- [ ] Webhooks are unauthenticated.
- [ ] Logs expose tokens, passwords, personal data, or confidential business data.
- [ ] No monitoring exists for abuse, errors, or budget spikes.
- [ ] Critical dependencies are unreviewed or known vulnerable.
- [ ] Team cannot explain rollback or incident steps.

---

## 6. Prioritization Framework

When the AI finds issues, prioritize them in this order.

### Critical
Fix before any testing with real users.
- authentication missing
- backend authorization missing
- secret exposure
- direct prompt-to-action execution
- prompt injection leading to destructive actions
- public endpoint with no limits and paid API behind it
- unrestricted admin or database access
- sensitive data exposure

### High
Fix before release.
- weak rate limits
- overly broad integration scopes
- missing webhook validation
- weak logging or no alerts
- poor data retention controls
- dangerous defaults in production
- malformed output not rejected

### Medium
Fix soon after or before scale.
- missing dashboards
- incomplete audit trails
- stale dependencies without known exploit
- incomplete operator documentation
- inconsistent retry/backoff behavior

### Low
Track and improve.
- cleanup of old configs
- documentation polish
- nicer alert grouping
- improved test coverage where no direct risk exists

---

## 7. Universal Prompt for Any AI Agent or Tool

Copy and give this prompt to Claude Code, Antigravity, Cursor, Gemini CLI, Copilot, or any other AI system.

```markdown
You are acting as a senior application security engineer, product security reviewer, threat modeler, platform architect, and adversarial QA auditor.

Your task is to perform a deep security, architecture, abuse-resistance, privacy, and production-readiness audit of this project.

Treat all AI-generated code, low-code logic, automations, agent workflows, prompts, retrieval systems, third-party integrations, and configuration defaults as untrusted until verified.

Your job is not to praise the project. Your job is to find what is missing, what is weak, what can be abused, what can leak, what can overspend, what can break, and what should block release.

Audit Objectives:
1. Verify whether the project is safe to deploy.
2. Identify all critical, high, medium, and low risks.
3. Confirm whether security controls are actually implemented, not just described.
4. Stress test the design for internet-facing abuse, malicious users, prompt injection, cost abuse, and privilege misuse.
5. Identify anything that could lead to data leakage, denial of wallet, account compromise, or destructive automation.
6. Produce a remediation plan in priority order.
7. Clearly state what you could not verify.

You must review, test, and report on the following areas:

A. Scope and Architecture
- Summarize what the system does.
- Identify all components, trust boundaries, data flows, and external integrations.
- Identify where untrusted input enters.
- Identify where model output is used downstream.

B. Authentication and Authorization
- Verify login requirements.
- Verify role enforcement on the backend.
- Check for broken access control, IDOR, hidden admin paths, or shared credentials.

C. Secret Management
- Check whether secrets, tokens, API keys, cookies, or credentials are exposed in client code, logs, configs, prompts, screenshots, or repositories.
- Verify separation of dev, staging, and prod credentials.

D. AI / LLM Security
- Test for prompt injection.
- Test whether uploaded files, retrieved content, URLs, markdown, HTML, or hidden instructions can override the system.
- Verify structured output enforcement.
- Verify output validation before any action is taken.
- Verify whether the agent has excessive permissions.
- Verify human approval gates for destructive, financial, legal, or external-facing actions.

E. Input and Output Security
- Check for XSS, SQL/NoSQL injection, command injection, unsafe rendering, and unsafe file upload handling.
- Verify server-side validation and output encoding.

F. Abuse, Cost, and Reliability
- Check rate limits, quotas, spend caps, timeouts, retry logic, backoff, circuit breakers, concurrency control, and caching.
- Simulate denial-of-wallet scenarios.
- Test whether burst traffic or malformed input causes runaway API usage.

G. Integrations and Webhooks
- Verify least privilege for all integrations.
- Verify webhook signing and validation.
- Verify outbound requests are restricted to approved destinations.

H. Privacy and Data Governance
- Check whether personal or confidential data is unnecessarily sent to models or third parties.
- Check document retrieval permissions.
- Check logging, retention, deletion, and redaction controls.

I. Deployment and Configuration
- Check debug mode, admin/test endpoints, CORS, storage exposure, firewall/network rules, environment isolation, and security headers.

J. Dependency and Supply Chain
- Review key dependencies, plugins, connectors, templates, and generated code for risk.
- Identify vulnerable, abandoned, or untrusted components.

K. Monitoring and Incident Readiness
- Verify logs, alerts, audit trails, cost alerts, anomaly detection, and rollback readiness.
- Verify the system can detect abuse and recover safely.

Required Deliverables:
1. Executive summary
2. Architecture and trust-boundary summary
3. Threat model
4. Risk register table with severity, impact, likelihood, evidence, and remediation
5. Missing controls checklist
6. Exploit scenarios with step-by-step abuse paths
7. Prompt injection findings
8. Cost abuse / denial-of-wallet findings
9. Access control findings
10. Secret exposure findings
11. Integration and webhook findings
12. Privacy findings
13. Deployment/configuration findings
14. Supply-chain findings
15. Monitoring and incident-readiness findings
16. Go / no-go deployment recommendation
17. Prioritized remediation plan
18. Explicit section called “What I could not verify”

Rules for your review:
- Be adversarial and skeptical.
- Do not assume a control exists unless you see evidence.
- If something is unclear, mark it as unverified and explain the risk.
- Prefer concrete findings over generic advice.
- Call out release blockers explicitly.
- Where possible, propose exact fixes.
- If a control is partially implemented, explain why partial implementation is still risky.
- If the project includes AI agents or tools, assume prompt injection and excessive agency must be tested aggressively.
- If the project uses paid APIs, treat cost abuse as a security issue.

Final instruction:
Return your findings in a way that a builder can immediately act on. Be exhaustive. Do not skip edge cases just because the app is small or vibe-coded.
```

---

## 8. Shorter Fast-Check Prompt

Use this when you want a faster pass before the full audit.

```markdown
Audit this project like a hostile senior security reviewer.

Check for:
- missing auth
- broken authorization
- exposed secrets
- prompt injection risk
- unsafe AI output handling
- excessive agent permissions
- missing approval gates
- lack of rate limits, quotas, timeouts, spend caps
- insecure webhooks/integrations
- privacy leaks
- dangerous production defaults
- missing monitoring and alerts
- vulnerable dependencies

Return:
1. top release blockers
2. critical/high findings
3. missing controls
4. denial-of-wallet risks
5. prompt injection risks
6. exact fixes
7. what you could not verify
8. go / no-go recommendation
```

---

## 9. How to Use This File in Practice

### Before building
- define scope
- define sensitive actions
- define trust boundaries
- define approval gates

### During building
- keep checking the checklist section by section
- use the fast-check prompt regularly
- fix critical findings immediately

### Before launch
- run the full audit prompt
- run stress tests
- block release on critical issues
- confirm logging, alerts, rollback, and spend caps are live

### After launch
- review logs and cost metrics
- audit new integrations and features
- rotate secrets
- re-run the audit after major changes

---

## 10. Final Rule

A project is **not** production-ready just because it works.

It is only ready when:
- access is controlled
- outputs are validated
- secrets are protected
- spend is capped
- integrations are scoped
- logs and alerts exist
- abuse is tested
- recovery is possible
- release blockers are closed or explicitly accepted

