var request = require('request');
import { Channel } from './channel';
import { Log } from './../log';
var url = require('url');

export class PrivateChannel {
    /**
     * Request client.
     *
     * @type {object}
     */
    private request: any;

    /**
     * Create a new private channel instance.
     */
    constructor(private options) {
        this.request = request;
    }

    /**
     * Send authentication request to application server.
     *
     * @param  {object} socket
     * @param  {object} data
     * @return {Promise<any>}
     */
    authenticate(socket: any, data: any): Promise<any> {
        let options = {
            url: this.authHost(socket) + this.options.authEndpoint,
            form: { channel_name: data.channel },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : {},
            rejectUnauthorized: false
        };

        return this.serverRequest(socket, options);
    }

    /**
     * Get the auth endpoint.
     *
     * @return {string}
     */
    protected authHost(socket: any): string {
        let referer: Object = url.parse(socket.request.headers.referer);
        let authHostSelected: string = 'http://localhost';
        let authHosts: any = (this.options.authHost) ?
            this.options.authHost : this.options.host;
        
        if(typeof authHosts === "string")
            authHosts = [authHosts];
        
        for(let authHost of authHosts)
        {
            authHostSelected = authHost;
            if(referer.hostname.substr(referer.hostname.indexOf('.')) === authHostSelected || referer.protocol + "//" + referer.host === authHostSelected || referer.host === authHostSelected)
            {
                authHostSelected = referer.protocol+"//"+referer.host;
                break;
            }
        }

        return authHostSelected;
    }

    /**
     * Send a request to the server.
     *
     * @param  {object} socket
     * @param  {object} options
     * @return {Promise<any>}
     */
    protected serverRequest(socket: any, options: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            options.headers = this.prepareHeaders(socket, options);
            let body;

            this.request.post(options, (error, response, body, next) => {
                if (error) {
                    if (this.options.devMode) {
                        Log.error(`[${new Date().toLocaleTimeString()}] - Error authenticating ${socket.id} for ${options.form.channel_name}`);
                    }

                    Log.error(error);

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
     * Prepare headers for request to app server.
     *
     * @param  {object} options
     * @return {any}
     */
    protected prepareHeaders(socket: any, options: any): any {
        options.headers['Cookie'] = socket.request.headers.cookie;
        options.headers['X-Requested-With'] = 'XMLHttpRequest';

        return options.headers;
    }
}
