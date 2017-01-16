let fs = require('fs');
let colors = require("colors");
let echo = require('./../../dist');
let inquirer = require('inquirer');

const CONFIG_FILE = process.cwd() + '/laravel-echo-server.json';

/**
 * Laravel Echo Server CLI
 */
export class Cli {
    /**
     * Default config options.
     *
     * @type {any}
     */
    defaultOptions: any;

    /**
     * Create new CLI instance.
     */
    constructor() {
        this.defaultOptions = echo.defaultOptions;
    }

    /**
     * Initialize server with a configuration file.
     *
     * @param  {Object} yargs
     * @return {void}
     */
    init(yargs) {
        this.setupConfig().then((options) => {
            options = Object.assign({}, this.defaultOptions, options);
            options.appKey = this.createAppKey();

            this.saveConfig(options).then(() => {
                console.log('Configuration file saved. Run ' + colors.magenta.bold('laravel-echo-server start') + ' to run server.');

                process.exit();
            }, (error) => {
                console.error(colors.error(error));
            });
        }, error => console.error(error));
    }

    /**
     * Setup configuration with questions.
     *
     * @return {Promise}
     */
    setupConfig() {
        return inquirer.prompt([{
            name: 'host',
            message: 'Enter the host for the server.'
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
                name: 'verifyAuthServer',
                message: 'Will you be authenticating users from a different host?',
                type: 'confirm'
            }, {
                name: 'authHost',
                message: 'Enter the host of your authentication server.',
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
            }]);
    }

    /**
     * Save configuration file.
     *
     * @param  {Object} options
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
     * @param  {Object} yargs
     * @return {void}
     */
    start(yargs): void {
        fs.access(CONFIG_FILE, fs.F_OK, (error) => {
            if (error) {
                console.error(colors.error('Error: laravel-echo-server.json file not found.'));

                return false;
            }

            var options = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            options.devMode = options.devMode || yargs.argv.dev || false;

            echo.run(options);
        });
    }

    /**
     * Create an app key for server.
     *
     * @return {string}
     */
    createAppKey(): string {
        return Math.random().toString(31).substring(7).slice(0, 60);
    }

    /**
     * Generate an app key and save to config.
     *
     * @return {void}
     */
    keyGenerate(): void {
        var key = this.createAppKey();
        var options = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        options.appKey = key;

        this.saveConfig(options);
    }

    /**
     * Create an api key for the HTTP API.
     *
     * @param  {string} app_key
     * @return {string}
     */
    createApiKey(app_key: string): string {
        var hash = Math.random().toString(31).substring(7).slice(0, 60);
        let api_key = hash.concat(app_key);
        api_key = api_key.split('')
            .sort(() => 0.5 - Math.random())
            .join('').slice(0, 60);

        return api_key;
    }

    /**
     * Create an api key for the HTTP API.
     *
     * @param  {string} app_key
     * @return {string}
     */
    createAppId(app_key: string): string {
        var hash = Math.random().toString(31).substring(7).slice(0, 16);
        let api_key = hash.concat(app_key);
        api_key = api_key.split('')
            .sort(() => 0.5 - Math.random())
            .join('').slice(0, 16);

        return api_key;
    }

    /**
     * Generate the API key
     *
     * @return {void}
     */
    apiKeyGenerate(): void {
        var options = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        options.apiKey = this.createApiKey(options.appKey);

        console.log(colors.green('API Key: ' + options.apiKey))

        this.saveConfig(options);
    }

    /**
     * Add a registered referrer.
     *
     * @param  {Object} yargs
     * @return {void}
     */
    clientAdd(yargs): void {
        var options = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        var appId = yargs.argv._[1] || this.createAppId(options.appKey);
        options.clients = options.clients || [];

        if (appId && options.appKey) {
            var index = null;
            var client = options.clients.find((client, i) => {
                index = i;
                return client.appId == appId;
            });

            if (client) {
                client.key = this.createApiKey(options.appKey);
                options.clients[index] = client;
            } else {
                client = {
                    appId: appId,
                    key: this.createApiKey(options.appKey)
                };

                options.clients.push(client);
            }

            console.log(colors.green('API Client added!' ));
            console.log(colors.magenta('appId: ' + client.appId));
            console.log(colors.magenta('key: ' + client.key))

            this.saveConfig(options);
        }
    }

    /**
     * Remove a registered referrer.
     *
     * @param  {Object} yargs
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
