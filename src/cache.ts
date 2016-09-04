var Redis = require('ioredis');

export class Cache {
    /**
     * Redis client.
     *
     * @type {object}
     */
    private _redis: any;

    /**
     * Create a new cache instance.
     */
    constructor() {
        this._redis = new Redis();
    }

    /**
     * Store data to cache.
     *
     * @param  {string} key
     * @param  {any}  value
     * @return {void}
     */
    store(key: string, value: any): void {
        this._redis.set(key, JSON.stringify(value));
    }

    /**
     * Retrieve data from redis.
     *
     * @param  {string}  key
     * @return {Promise<any>}
     */
    get(key: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this._redis.get(key).then(value => resolve(JSON.parse(value)));
        });
    }

    flush() { }
}
