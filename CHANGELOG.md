# 1.6.2

## Added

-   Add method to stop the server (#502)[https://github.com/tlaverdure/laravel-echo-server/pull/502]
-   Document how to use Redis Sentinel (#437)[https://github.com/tlaverdure/laravel-echo-server/pull/437]
-   Add Apache proxt example tp docs (#361)[https://github.com/tlaverdure/laravel-echo-server/pull/361]
-   Expose user member user info in API. (#356)[https://github.com/tlaverdure/laravel-echo-server/pull/356]

## Fixed

-   Fix crash when invalid referer is sent (#513)[https://github.com/tlaverdure/laravel-echo-server/pull/513]

# 1.6.1

-   Update dependencies for security reasons.

# 1.6.0

Add support for Redis prefixing.

# 1.5.0

Add `stop` command

# 1.3.7

Allow variables in .env file to set options in the server configuration.

### Updates

-   Auth Host: `LARAVEL_ECHO_SERVER_AUTH_HOST` _Note_: This option will fall back to the `LARAVEL_ECHO_SERVER_HOST` option as the default if that is set in the .env file.

-   _Host_: `LARAVEL_ECHO_SERVER_HOST`

-   _Port_: `LARAVEL_ECHO_SERVER_PORT`

-   _Debug_: `LARAVEL_ECHO_SERVER_DEBUG`

# 1.3.3

Return a better error when member data is not present when joining presence channels.

# 1.3.2

Added CORS support to the HTTP API.

# 1.2.9

Updated to socket.io v2

# 1.2.0

## Upgrade Guide

-   Re-install laravel-echo-server globally using the command.

```
npm install -g laravel-echo-server
```

-   In your `laravel-echo-server.json` file, remove the section named `referrers`. Then follow the [instructions](https://github.com/tlaverdure/laravel-echo-server#api-clients) to generate an app id and key. The `referrers` section has been replaced with `clients`.
