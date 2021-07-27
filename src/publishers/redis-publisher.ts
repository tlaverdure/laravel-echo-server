var Redis = require('ioredis');
import {Publisher} from './publisher';

var _ = require("lodash");

export class RedisPublisher implements Publisher {
    /**
     * Redis pub/sub client.
     *
     * @type {object}
     */
    private _redis: any;

    /**
     *
     * KeyPrefix for used in the redis Connection
     *
     * @type {String}
     */
    private readonly _keyPrefix: string;

    /**
     * Create a new instance of subscriber.
     *
     * @param {any} options
     */
    constructor(private options) {
        this._keyPrefix = options.databaseConfig.redis.keyPrefix || '';
        this._redis = new Redis(options.databaseConfig.redis);
    }

    /**
     * Subscribe to events to broadcast.
     *
     * @return {Promise<any>}
     */
    publish(channel: string, event: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            try {
                this._redis.publish(this._keyPrefix + channel, JSON.stringify({event, ..._.omit(data, ['socket'])}));
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }
}
