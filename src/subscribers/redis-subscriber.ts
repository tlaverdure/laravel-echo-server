var Redis = require('ioredis');
import { Log } from './../log';
import { Subscriber } from './subscriber';
import { Channel } from '../channels';

export class RedisSubscriber implements Subscriber {
    /**
     * Redis pub/sub client.
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
     */
    subscribe(callback): Promise<any> {
        return new Promise((resolve, reject) => {
            this._redis.on('pmessage', (subscribed, channel, message) => {
                try {
                    message = JSON.parse(message);

                    if (this.options.devMode) {
                        Log.info("Channel: " + channel);
                        Log.info("Event: " + message.event);
                    }

                    callback(channel, message);
                } catch (e) {
                    if (this.options.devMode) {
                        Log.info("No JSON message");
                    }
                }
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
