"# Test Credentials

## App PIN
- PIN: `1234`
- Note: PIN has been set during initial curl test. If DB is reset, first request `POST /api/auth/setup` with a fresh 4-digit PIN.

## Notes
- Auth is a single-user 4-digit PIN. Session token returned from `POST /api/auth/verify` (or `/api/auth/setup`) is stored in localStorage as `ft_session` and sent as `X-Session-Token` header on every request.
"