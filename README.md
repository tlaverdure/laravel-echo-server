# Laravel Echo Server

NodeJs server for Laravel Echo broadcasting with Socket.io.

## System Requirements

The following are required to function properly.

* Laravel 5.3
* Node v6.3.1+
* Redis 3+

Additional information on broadcasting with Laravel can be found on the official docs:
https://laravel.com/docs/master/broadcasting

## Getting Started

Install npm package

```
npm install laravel-echo-server --save
```

Create a server.js file and include the following.

```js

var echo = require('laravel-echo-server');

echo.run();

```

Start server from the command line

```
$ node server.js
```


### With Configurable Options

Edit the default configuration of the server.

```js
var echo = require('laravel-echo-server');

var options = {
  authHost: 'http://app.dev',
  authPath: '/broadcasting/auth',
  host: 'http://app.dev',
  port: 6001,
  socketPath: '/broadcasting/socket'
};

echo.run(options);
```

| Title | Default | Description |
| :------------- | :------------- | :------------- |
| `authHost` | `http://localhost` | The host of the server that authenticates private and presence channels  |
| `authPath` | `/broadcasting/auth` | The route that authenticates private channels  |
| `host` | `http://localhost` | The host of the socket.io server |
| `port` | `6001` | The port that the socket.io server should run on |
| `socketPath` | `/broadcasting/socket` | The route that stores socket identifiers |


## Client Side configuration

Details coming soon...
