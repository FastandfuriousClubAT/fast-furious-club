FAST & FURIOUS CLUB — REGISTRATION & MEMBER PRICING PREPARATION
Status: preparation only; not deployed and not connected to a live customer database.
Base: main at 84858948c882ada09e99d11a8c3d3c92e361915b

CONFIRMED PRODUCT RULES
1. Registration is strictly voluntary. Never force registration, block public offers, show intrusive pop-ups, or require login to browse or send an ordinary inquiry.
2. Public prices and member prices must not be exposed together in public pages or page source.
3. Christmas tree offers are the sole confirmed exception: their different prices may be shown publicly.
4. Member-only prices apply only to selected offers. Other offers keep one public price.
5. The administrator needs a secure client list showing at least name, email, and telephone number. Passwords must never be visible to the administrator.

PROPOSED CUSTOMER EXPERIENCE
- Add discreet “Registrace” and “Přihlášení” entry points; no forced prompt.
- Registration fields: first name, surname, email, telephone, password, password confirmation, and acceptance of the privacy notice/terms.
- Email is the login identifier. Account verification by email is recommended before enabling member pricing.
- After login, the customer sees the member price only on offers explicitly marked as member-priced.
- Logged-out visitors see only the public price. Do not send member prices in public HTML, JavaScript bundles, metadata, or unauthenticated API responses.
- Registration does not automatically subscribe the customer to marketing.

ADMINISTRATION
- Protected administrator-only view: customer name, email, telephone, registration date, account status, and (if later agreed) inquiry/order history.
- No password or password hash display. Authentication provider handles credentials and password resets.
- Restrict admin access by role; never rely on hiding an admin link in the browser.

TECHNICAL APPROACH TO VALIDATE
- The current site is static GitHub Pages and uses FormSubmit for inquiries; it has no customer database or account system.
- Candidate backend: Supabase Auth + PostgreSQL with Row Level Security (RLS). This is a proposal, not yet a connected or provisioned service.
- Keep privileged service-role secrets out of browser code and GitHub Pages. Browser may use only a public/anon key with strict RLS policies.
- Store member prices in protected database records and return them only to authenticated users entitled to see them.
- Keep the existing public website and inquiry forms working independently if the account service is unavailable.

DATA / PRIVACY CHECKLIST BEFORE LAUNCH
- Prepare a clear privacy notice naming the data controller, purposes, legal bases, retention periods, recipients/processors, and data-subject rights.
- Collect only data needed for accounts and customer contact. Keep marketing consent separate and optional.
- Define administrator access, account deletion/deactivation, export, retention, and backup procedures.
- Configure HTTPS, email verification, rate limits, secure password reset, and RLS tests.
- Confirm the controller details and privacy text before collecting real customer data.

NOT YET DECIDED — DO NOT ASSUME
- Whether phone number must be verified.
- Whether account deletion is self-service or admin-managed.
- Which offers will have member prices and the actual price values.
- Whether inquiry/order history belongs in the first release.
- Final backend provider and project credentials.
- Final privacy notice and controller details.

IMPLEMENTATION RULE
Do not change the live site or publish registration UI until the customer experience, provider, privacy text, and administrator access have been agreed. This branch is a planning artifact only.
