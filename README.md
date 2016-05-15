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
  host: 'example.dev',
  authPath: '/broadcasting/auth'
};

echo.run(options);
```
