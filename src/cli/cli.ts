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
     * Initialize server with a configuration file.
     *
     * @param  {Object} yargs
     * @return {void}
     */
    init(yargs) {
        this.setupConfig().then((options) => {
            options = Object.assign(options, echo.defaultOptions);
            options.appKey = this.createAppKey();

            this.saveConfig(options).then(() => {
                console.log('Configuration file saved. Run ' + colors.magenta.bold('laravel-echo-server start') + ' to run server.');

                process.exit();
            }, (error) => {
                console.error(error);
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

        Object.keys(options).filter(function(k) {
            return Object.keys(echo.defaultOptions).indexOf(k) >= 0;
        }).sort().forEach((option, i, arr) => {
            opts[option] = options[option];
        });

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
        var options = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        options.devMode = yargs.argv.dev || false;

        echo.run(options);
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
     * Create an api key for a referrer.
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
     * Add a registered referrer.
     *
     * @param  {Object} yargs
     * @return {void}
     */
    referrerAdd(yargs): void {
        var options = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        var host = yargs.argv._[1] || null;
        options.referrers = options.referrers || [];

        if (host && options.appKey) {
            var index = null;
            var referrer = options.referrers.find((referrer, i) => {
                index = i;
                return referrer.host == host;
            });

            if (referrer) {
                referrer.apiKey = this.createApiKey(options.appKey);
                options.referrers[index] = referrer;
            } else {
                referrer = {
                    host: host,
                    apiKey: this.createApiKey(options.appKey)
                };

                options.referrers.push(referrer);
            }

            console.log(colors.green('Referrer added: ' + host));
            console.log(colors.green('API Key: ' + referrer.apiKey))

            this.saveConfig(options);
        }
    }

    /**
     * Remove a registered referrer.
     *
     * @param  {Object} yargs
     * @return {void}
     */
    referrerRemove(yargs): void {
        var options = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        var host = yargs.argv._[1] || null;
        options.referrers = options.referrers || [];

        var index = null;
        var referrer = options.referrers.find((referrer, i) => {
            index = i;
            return referrer.host == host;
        });

        if (index >= 0) {
            options.referrers.splice(index, 1);
        }

        console.log(colors.green('Referrer removed: ' + host));

        this.saveConfig(options);
    }
}
