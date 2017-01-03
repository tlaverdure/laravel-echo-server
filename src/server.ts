var fs = require('fs');
var http = require('http');
var https = require('https');
var io = require('socket.io');
import { Log } from './log';

export class Server {
    /**
     * The http server.
     *
     * @type {any}
     */
    public http: any;

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
                Log.success(`Running at ${this.options.host} on port ${this.options.port}`);

                resolve(this.io);
            }, error => reject(error));
        });
    }

    /**
     * Select the http protocol to run on.
     *
     * @return {Promise<any>}
     */
    serverProtocol(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.options.protocol == 'https') {
                this.secure().then(() => {
                    resolve(this.httpServer(true));
                }, error => reject(error));
            } else {
                resolve(this.httpServer(false));
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
     * Create a socket.io server.
     *
     * @return {any}
     */
    httpServer(secure: boolean) {
        if (secure) {
            this.http = https.createServer(this.options, this.httpHandler);
        } else {
            this.http = http.createServer(this.httpHandler);
        }

        this.http.listen(this.options.port, this.options.host);

        return this.io = io(this.http, this.options.socketio);
    }

    /**
     * Http handler for http server.
     *
     * @param  {any} req
     * @param  {any} res
     */
    httpHandler(req, res): void {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Powered-By', 'Laravel Echo Server');
    }
}
