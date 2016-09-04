var fs = require('fs');
var https = require('https');
var io = require('socket.io');
import { Log } from './log';

export class Server {
    /**
     * Socket.io client.
     *
     * @type {object}
     */
    public io: any;

    /**
     * Create a new server instance.
     */
    constructor(private options) { }

    /**
     * Start the Socket.io server.
     *
     * @return {void}
     */
    init(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.serverProtocol().then(() => {
                Log.success(`Server running at ${this.options.hostname} on port ${this.options.port}`);

                resolve(this.io);
            });
        });
    }

    /**
     * Select the http protocol to run on.
     *
     * @return {Promise<any>}
     */
    serverProtocol(): Promise<any> {
        return new Promise((resolve, reject) => {
            if ((/(https)\:\/\//).test(this.options.hostname)) {
                this.secure().then(() => {
                    resolve(this.secureServer());
                }, error => Log.error(error));
            } else {
                resolve(this.io = io(this.options.port));
            }
        });
    }

    /**
     * Load SSL 'key' & 'cert' files if https is enabled.
     *
     * @return {void}
     */
    secure(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.options.sslCertPath || !this.options.sslKeyPath) {
                reject('SSL paths are missing in server config.');
            }

            Object.assign(this.options, {
                cert: fs.readFileSync(this.options.sslCertPath),
                key: fs.readFileSync(this.options.sslKeyPath)
            });

            resolve(this.options);
        });
    }

    /**
     * Create a secure socket.io server.
     *
     * @return {any}
     */
    secureServer(): any {
        let server = https.createServer(this.options, (req, res) => {
            res.writeHead(200);
            res.end('')
        }).listen(this.options.port);

        return this.io = io(server);
    }
}
