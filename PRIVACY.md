# Privacy (Dastak demo)

## CNIC and lookups

- **CNIC is never written to `localStorage`, `sessionStorage`, or analytics events.**
- Track and Verify forms validate CNIC on the client only for this demo flow.
- Lookup analytics may store tracking IDs, tokens, and success/failure — not CNIC.

## Local data

- Certificates and audit logs are stored in the browser (`localStorage`) on this device.
- Admin sessions use `sessionStorage` with an expiry (8 hours) and a random session id.
- Analytics events are local to the browser unless you add a backend later.

## Official portal

This project is a **demo / internal tool** and is not the official [ecitizen.kp.gov.pk](https://ecitizen.kp.gov.pk/) service.
