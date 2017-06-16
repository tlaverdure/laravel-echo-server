
# 1.2.9

Updated to socket.io v2

# 1.2.0

## Upgrade Guide
* Re-install laravel-echo-server globally using the command.
```
npm install -g laravel-echo-server
```
* In your `laravel-echo-server.json` file, remove the section named `referrers`. Then follow the [instructions](https://github.com/tlaverdure/laravel-echo-server#api-clients) to generate an app id and key. The `referrers` section has been replaced with `clients`.
