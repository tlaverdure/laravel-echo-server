#! /usr/bin/env node

/**
 * Laravel Echo Server
 *
 * This file starts the socket.io server and loads configuration from a
 * echo-server.json file if available.
 *
 */
var LaravelEchoServerCli = require('../dist/cli');

process.title = 'laravel-echo-server';
