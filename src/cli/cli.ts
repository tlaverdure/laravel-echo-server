let fs = require('fs');
let colors = require("colors");
let echo = require('./../../dist');
let inquirer = require('inquirer');
const crypto = require('crypto');
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
            
            if (options.addClient) {
                let client = {
                    appId: this.createAppId(),
                    key: this.createApiKey()
                };
                options.clients.push(client);

                console.log('appId: ' + colors.magenta(client.appId));
                console.log('key: ' + colors.magenta(client.key));
            }

            if(options.corsAllow){
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
     * Setup configuration with questions.
     *
     * @return {Promise}
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
                message: 'Do you want to setup cross domain access to API? Useful for AJAX request to API on same domain different port.',
                type: 'confirm'
            },{
                name: 'allowOrigin',
                default: 'http://localhost:80',
                message: 'Enter the domain you want CORS access to:',
                when: function(options){
                    return options.corsAllow == true;
                }
            },{
                name: 'allowMethods',
                default: 'GET, POST',
                message: 'Enter the CORS HTTP methods you want to allow:',
                when: function(options){
                    return options.corsAllow == true;
                }
            },{
                name: 'allowHeaders',
                default: 'Origin, Content-Type, X-Auth-Token, X-Requested-With, Accept, Authorization, X-CSRF-TOKEN, X-Socket-Id',
                message: 'Enter the CORS headers you want to allow:',
                when: function(options){
                    return options.corsAllow == true;
                }
            }
        ]);
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
        let dir = yargs.argv.dir ? yargs.argv.dir.replace(/\/?$/, '/') : null;
        let configFile = dir ? dir + 'laravel-echo-server.json' : CONFIG_FILE;

        fs.access(configFile, fs.F_OK, (error) => {
            if (error) {
                console.error(colors.error('Error: laravel-echo-server.json file not found.'));

                return false;
            }

            var options = JSON.parse(fs.readFileSync(configFile, 'utf8'));

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
     * @param  {Object} yargs
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
