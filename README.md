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


### With Configurable Options

Edit the default configuration of the server.

```js
var echo = require('laravel-echo-server');

var options = {
  host: 'http://example.dev',
  port: 6001
  authPath: '/broadcasting/auth'
  socketPath: '/broadcasting/socket'
};

echo.run(options);
```

| Title | Default | Description |
| :------------- | :------------- | :------------- |
| host       | http://localhost | {} |
