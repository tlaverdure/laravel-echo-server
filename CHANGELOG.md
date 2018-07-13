# 1.3.7

Allow variables in .env file to set options in the server configuration.

### Updates
-   Auth Host: `LARAVEL_ECHO_SERVER_AUTH_HOST` *Note*: This option will fall back to the `LARAVEL_ECHO_SERVER_HOST` option as the default if that is set in the .env file.

-   *Host*: `LARAVEL_ECHO_SERVER_HOST`

-   *Port*: `LARAVEL_ECHO_SERVER_PORT`

-   *Debug*: `LARAVEL_ECHO_SERVER_DEBUG`

# 1.3.3

Return a better error when member data is not present when joining presence channels.

# 1.3.2

Added CORS support to the HTTP API.

# 1.2.9

Updated to socket.io v2

# 1.2.0

## Upgrade Guide
* Re-install laravel-echo-server globally using the command.
```
npm install -g laravel-echo-server
```
* In your `laravel-echo-server.json` file, remove the section named `referrers`. Then follow the [instructions](https://github.com/tlaverdure/laravel-echo-server#api-clients) to generate an app id and key. The `referrers` section has been replaced with `clients`.
