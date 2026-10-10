# Changelog

## 1.0.1

### Fixed

- Certificates from a real step-ca now work: the bare base64 certificate is read and the throwaway key is in a format ssh2 accepts

## 1.0.0

### Added

- First release
- Adds the Step CA auth type to hosts
- Sign in with your identity provider in the browser
- Certificates are kept until they expire
- No `step` binary needed
- Several Termix servers can share sign in state through Redis
