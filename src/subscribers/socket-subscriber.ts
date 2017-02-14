import {Subscriber} from './subscriber';
import {Log} from '../log';
const client = require('socket.io-client');

export class SocketSubscriber implements Subscriber {
    private io;

    constructor (private options) {
        if (typeof options.socket === 'object' && options.socket.hasOwnProperty('host')) {
            this.io = client(options.socket.host, options.socket.opts);

            this.io.on( 'connect', () => {
                Log.success('Connected to socket server!');
            });

            this.io.on( 'connect_error', e => {
                Log.error('Socket Error: ' + e + '\n');
            });

            this.io.on( 'connect_timeout', () => {
                Log.error('Socket Timeout...\n');
            });

            this.io.on( 'error', e => {
                Log.error(`Socket Error: ${e}\n`);
            });
        }
    }

    /**
     * Whether or not a subscription to a socket provider has been registered
     * @return {boolean}
     */
    get isSubscribed () : boolean {
        return typeof this.io !== 'undefined';
    }

    /**
     * Subscribe to events to broadcast.
     *
     * @param callback
     * @return {Promise<void>}
     */
    subscribe(callback: Function): Promise<any> {
        if (this.isSubscribed) {
            this.io.on('event', ({channel, message}) => {

                if (this.options.devMode) {
                    Log.info("Channel: " + channel);
                    Log.info("Event: " + message.event);
                }

                callback(channel, message);
            });
            Log.success('Listening for socket events...');
        }

        return Promise.resolve();
    }
}