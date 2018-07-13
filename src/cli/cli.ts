let fs = require('fs');
let colors = require("colors");
let echo = require('./../../dist');
let inquirer = require('inquirer');
const crypto = require('crypto');
import ErrnoException = NodeJS.ErrnoException;

const CONFIG_FILE = process.cwd() + '/laravel-echo-server.json';

/**
 * Laravel Echo Server CLI
 */
export class Cli {
    /**
     * Default config options.
     *
     * @type {object}
     */
    defaultOptions: object;

    /**
     * Create new CLI instance.
     */
    constructor() {
        this.defaultOptions = echo.defaultOptions;
    }

    /**
     * Initialize server with a configuration file.
     *
     * @param  {object} yargs
     * @return {void}
     */
    init(yargs): void {
        this.setupConfig().then((options) => {
            options = Object.assign({}, this.defaultOptions, options);

            if (options.addClient) {
                let client = {
                    appId: this.createAppId(),
                    key: this.createApiKey()
                };
                options.clients.push(client);

                console.log('appId: ' + colors.magenta(client.appId));
                console.log('key: ' + colors.magenta(client.key));
            }

            if (options.corsAllow) {
                options.apiOriginAllow.allowCors = true;
                options.apiOriginAllow.allowOrigin = options.allowOrigin;
                options.apiOriginAllow.allowMethods = options.allowMethods;
                options.apiOriginAllow.allowHeaders = options.allowHeaders;
            }

            this.saveConfig(options).then(() => {
                console.log('Configuration file saved. Run ' + colors.magenta.bold('laravel-echo-server start') + ' to run server.');

                process.exit();
            }, (error) => {
                console.error(colors.error(error));
            });
        }, error => console.error(error));
    }

    /**
     * Inject the .env vars into options if they exist.
     *
     * @param  options
     */
    resolveEnvFileOptions(options: any): any {
        require('dotenv').config();

        if (process.env.LARAVEL_ECHO_SERVER_AUTH_HOST ||
            process.env.LARAVEL_ECHO_SERVER_HOST) {
            options.authHost = process.env.LARAVEL_ECHO_SERVER_AUTH_HOST ||
                process.env.LARAVEL_ECHO_SERVER_HOST;
        }

        if (process.env.LARAVEL_ECHO_SERVER_HOST) {
            options.host = process.env.LARAVEL_ECHO_SERVER_HOST;
        }

        if (process.env.LARAVEL_ECHO_SERVER_PORT) {
            options.port = process.env.LARAVEL_ECHO_SERVER_PORT;
        }

        if (process.env.LARAVEL_ECHO_SERVER_DEBUG) {
            options.devMode = process.env.LARAVEL_ECHO_SERVER_DEBUG;
        }

        return options;
    }

    /**
     * Setup configuration with questions.
     *
     * @return {Promise<any>}
     */
    setupConfig() {
        return inquirer.prompt([
            {
                name: 'devMode',
                default: false,
                message: 'Do you want to run this server in development mode?',
                type: 'confirm'
            }, {
                name: 'port',
                default: '6001',
                message: 'Which port would you like to serve from?'
            }, {
                name: 'database',
                message: 'Which database would you like to use to store presence channel members?',
                type: 'list',
                choices: ['redis', 'sqlite']
            }, {
                name: 'authHost',
                default: 'http://localhost',
                message: 'Enter the host of your Laravel authentication server.',
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
            }, {
                name: 'addClient',
                default: false,
                message: 'Do you want to generate a client ID/Key for HTTP API?',
                type: 'confirm'
            }, {
                name: 'corsAllow',
                default: false,
                message: 'Do you want to setup cross domain access to the API?',
                type: 'confirm'
            }, {
                name: 'allowOrigin',
                default: 'http://localhost:80',
                message: 'Specify the URI that may access the API:',
                when: function(options) {
                    return options.corsAllow == true;
                }
            }, {
                name: 'allowMethods',
                default: 'GET, POST',
                message: 'Enter the HTTP methods that are allowed for CORS:',
                when: function(options) {
                    return options.corsAllow == true;
                }
            }, {
                name: 'allowHeaders',
                default: 'Origin, Content-Type, X-Auth-Token, X-Requested-With, Accept, Authorization, X-CSRF-TOKEN, X-Socket-Id',
                message: 'Enter the HTTP headers that are allowed for CORS:',
                when: function(options) {
                    return options.corsAllow == true;
                }
            }
        ]);
    }

    /**
     * Save configuration file.
     *
     * @param  {object} options
     * @return {Promise<any>}
     */
    saveConfig(options): Promise<any> {
        let opts = {};

        Object.keys(options).filter(k => {
            return Object.keys(this.defaultOptions).indexOf(k) >= 0;
        }).forEach(option => opts[option] = options[option]);

        return new Promise((resolve, reject) => {
            if (opts) {
                fs.writeFile(
                    CONFIG_FILE,
                    JSON.stringify(opts, null, '\t'),
                    (error) => (error) ? reject(error) : resolve());
            } else {
                reject('No options provided.')
            }
        });
    }

    /**
     * Start the Laravel Echo server.
     *
     * @param  {object} yargs
     * @return {void}
     */
    start(yargs): void {
        let dir = yargs.argv.dir ? yargs.argv.dir.replace(/\/?$/, '/') : null;
        let configFile = dir ? dir + 'laravel-echo-server.json' : CONFIG_FILE;

        fs.access(configFile, fs.F_OK, (error) => {
            if (error) {
                console.error(colors.error('Error: laravel-echo-server.json file not found.'));

                return false;
            }

            let options = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            options = this.resolveEnvFileOptions(options);
            options.devMode = yargs.argv.dev || options.devMode || false;

            echo.run(options);
        });
    }

    /**
     * Create an app key for server.
     *
     * @return {string}
     */
    getRandomString(bytes: number): string {
        return crypto.randomBytes(bytes).toString('hex');
    }

    /**
     * Create an api key for the HTTP API.
     *
     * @return {string}
     */
    createApiKey(): string {
        return this.getRandomString(16);
    }

    /**
     * Create an api key for the HTTP API.
     *
     * @return {string}
     */
    createAppId(): string {
        return this.getRandomString(8);
    }

    /**
     * Add a registered referrer.
     *
     * @param  {object} yargs
     * @return {void}
     */
    clientAdd(yargs): void {
        var options = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        var appId = yargs.argv._[1] || this.createAppId();
        options.clients = options.clients || [];

        if (appId) {
            var index = null;
            var client = options.clients.find((client, i) => {
                index = i;
                return client.appId == appId;
            });

            if (client) {
                client.key = this.createApiKey();

                options.clients[index] = client;

                console.log(colors.green('API Client updated!'));
            } else {
                client = {
                    appId: appId,
                    key: this.createApiKey()
                };

                options.clients.push(client);

                console.log(colors.green('API Client added!'));
            }

            console.log(colors.magenta('appId: ' + client.appId));
            console.log(colors.magenta('key: ' + client.key))

            this.saveConfig(options);
        }
    }

    /**
     * Remove a registered referrer.
     *
     * @param  {object} yargs
     * @return {void}
     */
    clientRemove(yargs): void {
        var options = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        var appId = yargs.argv._[1] || null;
        options.clients = options.clients || [];

        var index = null;

        var client = options.clients.find((client, i) => {
            index = i;
            return client.appId == appId;
        });

        if (index >= 0) {
            options.clients.splice(index, 1);
        }

        console.log(colors.green('Client removed: ' + appId));

        this.saveConfig(options);
    }
}
