var request = require('request');
import { Channel } from './channel';
import { Log } from './../log';

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
            url: this.authHost() + this.options.authEndpoint,
            form: { channel_name: data.channel },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : {},
            rejectUnauthorized: false
        };

        return this.severRequest(socket, options);
    }

    /**
     * Get the auth endpoint.
     *
     * @return {string}
     */
    protected authHost(): string {
        return (this.options.authHost) ?
            this.options.authHost : this.options.host;
    }

    /**
     * Send a request to the server.
     *
     * @param  {object} socket
     * @param  {object} options
     * @return {Promise<any>}
     */
    protected severRequest(socket: any, options: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            options.headers = this.prepareHeaders(socket, options);

            this.request.post(options, (error, response, body, next) => {
                if (!error && response.statusCode == 200) {
                    resolve(JSON.parse(response.body));
                } else {
                    Log.error(error);

                    reject('Could not send authentication request.');
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
