import {Subscriber} from './subscriber';
import {Log} from '../log';
const client = require('socket.io-client');

export class SocketSubscriber implements Subscriber {
    private io;
    private isSubscribed : boolean = false;

    constructor (private options) {
        if (typeof options.socket === 'object' && options.socket.hasOwnProperty('host')) {
            this.isSubscribed = true;
            this.io = client(options.socket.host, options.socket.opts);
        }
    }

    /**
     * Whether or not a subscription to a socket provider has been registered
     * @return {boolean}
     */
    get hasSubscription () : boolean {
        return this.isSubscribed;
    }

    /**
     * Subscribe to events to broadcast.
     *
     * @param callback
     * @return {Promise<void>}
     */
    subscribe(callback: Function): Promise<any> {
        if (this.isSubscribed) {
            this.io.on('event', ({channel, message}) => callback(channel, message));
            Log.success('Listening for socket events...');
        }

        return Promise.resolve();
    }
}