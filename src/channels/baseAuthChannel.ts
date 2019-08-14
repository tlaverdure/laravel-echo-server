import {Log} from "../log";
let url = require('url');
const request = require('request');
const cookie = require('cookie');

export class BaseAuthChannel {

    /**
     * Request client.
     */
    protected request: any;

    /**
     * Master NSP /
     */
    protected rootChannel = 'root';

    /**
     * instance base auth
     *
     * @param options
     * @param log
     */
    constructor(protected options: any, protected log: any) {

        this.request = request;
    }

    /**
     * Send authentication request to application server.
     */
    authenticate(socket: any, data: any = null): Promise<any> {

        const options = this.prepareRequestOptions(socket, data);

        if (this.options.devMode) {
            Log.info(`[${new Date().toLocaleTimeString()}] - Sending auth request to: ${options.url}\n`);
        }

        this.log.info(`[${new Date().toLocaleTimeString()}] - Sending auth request to: ${options.url}\n`);

        return this.serverRequest(socket, options);
    }

    /**
     * SetUp Request options
     *
     * @param socket
     * @param data
     */
    prepareRequestOptions(socket: any, data: any = null){

        let options = {
            url: this.authHost(socket) + this.options.authEndpoint,
            form: { channel_name: this.rootChannel },
            headers: {},
            rejectUnauthorized: false
        };

        if(data && data.channel)
            options.form.channel_name = data.channel;

        return options;
    }

    /**
     * Send a request to the server.
     */
    protected serverRequest(socket: any, options: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {

            options.headers = this.prepareHeaders(socket);

            let body;

            this.request.post(options, (error, response, body, next) => {

                if (error) {
                    if (this.options.devMode) {
                        Log.error(`[${new Date().toLocaleTimeString()}] - Error authenticating ${socket.id} for ${options.form.channel_name}`);
                        Log.error(error);
                    }

                    reject({ reason: 'Error sending authentication request.', status: 0 });
                } else if (response.statusCode !== 200) {
                    if (this.options.devMode) {
                        Log.warning(`[${new Date().toLocaleTimeString()}] - ${socket.id} could not be authenticated to ${options.form.channel_name}`);
                        Log.error(response.body);
                    }

                    reject({ reason: 'Client can not be authenticated, got HTTP status ' + response.statusCode, status: response.statusCode });
                } else {
                    if (this.options.devMode) {
                        Log.info(`[${new Date().toLocaleTimeString()}] - ${socket.id} authenticated for: ${options.form.channel_name}`);
                    }

                    try {
                        body = JSON.parse(response.body);
                    } catch (e) {
                        body = response.body
                    }

                    resolve(body);
                }
            });
        });
    }

    /**
     * Get the auth host based on the Socket.
     */
    protected authHost(socket: any): string {
        let authHosts = (this.options.authHost) ?
            this.options.authHost : this.options.host;

        if (typeof authHosts === "string") {
            authHosts = [authHosts];
        }

        let authHostSelected = authHosts[0] || 'http://localhost';

        if (socket.request.headers.referer) {
            let referer = url.parse(socket.request.headers.referer);

            for (let authHost of authHosts) {
                authHostSelected = authHost;

                if (this.hasMatchingHost(referer, authHost)) {
                    authHostSelected = `${referer.protocol}//${referer.host}`;
                    break;
                }
            };
        }

        if (this.options.devMode) {
            Log.error(`[${new Date().toLocaleTimeString()}] - Preparing authentication request to: ${authHostSelected}`);
        }

        return authHostSelected;
    }

    /**
     * Check if there is a matching auth host.
     */
    protected hasMatchingHost(referer: any, host: any): boolean {
        return referer.hostname.substr(referer.hostname.indexOf('.')) === host ||
            `${referer.protocol}//${referer.host}` === host ||
            referer.host === host;
    }

    /**
     * Prepare headers for request to app server.
     */
    protected prepareHeaders(socket: any): any {
        let headers = {};

        headers['Cookie'] = socket.request.headers.cookie;
        headers['X-Requested-With'] = 'XMLHttpRequest';
        headers['X-Socket-Id'] = socket.id;


        if(socket.request.headers['Authorization']){
            headers['Authorization'] = socket.request.headers['Authorization']
        }else if(socket.request._query.token){
            headers['Authorization'] = ' Bearer ' + socket.request._query.token;
        } else {
            const cookies = cookie.parse(socket.request.headers.cookie);
            headers['Authorization'] = ' Bearer ' + cookies['jwt_token'];
        }

        return headers;
    }


}
