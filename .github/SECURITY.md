# Security Policy

## Supported Versions

Only the latest release on the `master` branch receives security updates.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| older   | ❌        |

## Reporting a Vulnerability

If you discover a security vulnerability in Sepet, please report it responsibly:

1. **Do not** open a public GitHub issue.
2. Email **security@trysepet.com** with the following details:
   - A description of the vulnerability
   - Steps to reproduce
   - The potential impact
   - Any suggested mitigation, if you have one

You can expect:

- An initial response within **72 hours**
- A status update within **7 days**
- A coordinated disclosure timeline once the issue is confirmed

## Scope

In scope:

- The Sepet web application and API routes
- Authentication and session handling
- Data exposure through public endpoints
- Server-side vulnerabilities (SSRF, RCE, SQLi, etc.)

Out of scope:

- Reports generated solely by automated scanners without proof of impact
- Vulnerabilities requiring physical access to a user's device
- Social engineering of Sepet staff or users
- Third-party services (Google OAuth, AI providers) — report those to the upstream vendor
- Denial of service via volumetric attacks

## Safe Harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to follow this policy
- Avoid privacy violations, data destruction, and service degradation
- Give us reasonable time to address the issue before public disclosure

Thank you for helping keep Sepet and its users safe.
