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
    subscribe(callback): Promise<any> {
        var _this   = this;

        return new Promise((resolve, reject) => {
            this._redis.on('pmessage', (subscribed, channel, message) => {
                message = JSON.parse(message);

                if (_this.options.devMode)
                {
                    Log.info(channel, message);
                }

                callback(channel, message);
            });

            this._redis.psubscribe('*', (err, count) => {
                if (err) {
                    reject('Redis could not subscribe.')
                }

                Log.success('Listening for redis events...');

                resolve();
            });
        });
    }
}
