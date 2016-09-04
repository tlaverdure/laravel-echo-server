#! /usr/bin/env node

/**
 * Laravel Echo Server
 *
 * This file starts the socket.io server and loads configuration from a
 * echo-server.json file if available.
 *
 */

var fs = require('fs');
var yargs = require("yargs");
var colors = require("colors");
var echo = require('./../dist');
var inquirer = require('inquirer');

const CONFIG_FILE = process.cwd() + '/laravel-echo-server.json';
const OPTION_KEYS = [
    'appKey',
    'authHost',
    'authPath',
    'hostname',
    'port',
    'sslCertPath',
    'sslKeyPath'
];

/**
 * Command line arguments.
 */
var argv = yargs.usage("$0 command")
    .command("init", "Initialize server with a config file.", init)
    .command("start", "Start up the server.", start)
    .demand(1, "Please provide a valid command.")
    .help("h")
    .alias("h", "help")
    .argv;

/**
 * Initialize server with a configuration file.
 *
 * @param  {Object} yargs
 * @return {void}
 */
function init(yargs) {
    setupConfig().then(function(options) {
        options.appKey = createAppKey();

        saveConfig(options).then(function() {
            console.log('Configuration saved. Run ' + colors.magenta.bold('laravel-echo-server start') + ' to run server.')

            process.exit();
        }, function(error) {
            console.error(error);
        });
    });
}

/**
 * Setup configuration with questions.
 *
 * @return {Promise}
 */
function setupConfig() {
    return inquirer.prompt([{
        name: 'hostname',
        message: 'Enter a hostname for server.'
    }, {
        name: 'port',
        default: '6001',
        message: 'Which port would you like to serve from?'
    }, {
        name: 'verifyAuthServer',
        message: 'Will you be authenticating users from a different host?',
        type: 'confirm'
    }, {
        name: 'authHost',
        message: 'Enter the hostname of your authentication server.',
        when: function(options) {
            return options.verifyAuthServer;
        }
    }, {
        name: 'verifyAuthPath',
        message: 'Is this the right endpoint for authentication /broadcasting/auth?',
        type: 'confirm'
    }, {
        name: 'authPath',
        message: 'Enter the path to send authentication requests to.',
        when: function(options) {
            return !options.verifyAuthPath;
        }
    }, {
        name: 'protocol',
        message: 'Will you be serving on http or https?',
        type: 'list',
        choices: ['http', 'https']
    }, {
        name: 'sslCertPath',
        message: 'Enter the path to your SSL cert file.',
        when: function(options) {
            return options.protocol == 'https';
        }
    }, {
        name: 'sslKeyPath',
        message: 'Enter the path to your SSL key file.',
        when: function(options) {
            return options.protocol == 'https';
        }
    }])
}

/**
 * Save configuration file.
 */
function saveConfig(options) {
    return new Promise(function(resolve, reject) {
        Object.keys(options).filter(function(k) {
            return OPTION_KEYS.indexOf(k) < 0;
        }).forEach(function(option) {
            delete options[option];
        });

        fs.writeFile(
            CONFIG_FILE,
            JSON.stringify(options, null, '\t'),
            function(error) {
                (error) ? reject(error): resolve();
            });
    });
}

/**
 * Start the Laravel Echo server.
 *
 * @param  {Object} yargs
 * @return {void}
 */
function start(yargs) {
    var options = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));

    echo.run(options);
}

/**
 * Create an app key for server.
 *
 * @return {string}
 */
function createAppKey() {
    return Math.random().toString(31).substring(7).slice(0, 60);
}
