var Redis = require('ioredis');
import { Log } from './../log';
import { Subscriber } from './subscriber';

export class RedisSubscriber implements Subscriber {
    /**
     * Redis pub/sub client.
     *
     * @type {object}
     */
    private _redis: any;

    /**
     * Create a new instance of subscriber.
     */
    constructor(private options) {
        this._redis = new Redis(options.databaseConfig.redis);
    }

    /**
     * Subscribe to events to broadcast.
     *
     * @return {void}
     */
    subscribe(callback): void {
        this._redis.psubscribe('*', (err, count) => { });
        this._redis.on('pmessage', (subscribed, channel, message) => {
            message = JSON.parse(message);

            callback(channel, message);
        });

        Log.success('Listening for redis events...');
    }
}
