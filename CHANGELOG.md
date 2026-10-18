# Changelog

## 1.0.2

### Added

- Require the host username in the certificate, an admin setting that is on by default. Turn it off for a CA that puts other principals in the certificate and lets the server map them

### Changed

- The plugin name and description show in your language

## 1.0.1

### Changed

- Translated into every supported language

## 1.0.0

### Added

- First release
- Adds the Step CA auth type to hosts
- Sign in with your identity provider in the browser
- Certificates are kept until they expire
- No `step` binary needed
- Several Termix servers can share sign in state through Redis
