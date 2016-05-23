# Laravel Echo Server

Socket.io NodeJs server for Laravel Echo

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
  host: 'http://example.dev',
  port: 6001
  authPath: '/broadcasting/auth'
  socketPath: '/broadcasting/socket'
  headers: ['Authorization', 'Cookie']
};

echo.run(options);
```

| Title | Default | Description |
| :------------- | :------------- | :------------- |
| `host` | `http://localhost` | The host of the socket.io server |
| `port` | `6001` | The port that the socket.io server should run on |
| `authPath` | `/broadcasting/auth` | The route that authenticates private channels  |
| `socketPath` | `/broadcasting/socket` | The route that stores socket identifiers |
| `headers` | `[Authorization, Cookie]` | The headers added to app server requests |
