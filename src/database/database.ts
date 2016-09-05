import { DatabaseDriver } from './database-driver';
import { SQLiteDatabase } from './sqlite';
import { RedisDatabase } from './redis';
import { Log } from './../log';

/**
 * Class that controls the key/value data store.
 */
export class Database implements DatabaseDriver {
    /**
     * Database driver.
     *
     * @type {DatabaseDriver}
     */
    private driver: DatabaseDriver;

    /**
     * Create a new database instance.
     *
     * @param  {any} options
     */
    constructor(private options: any) {
        if (options.database == 'redis') {
            this.driver = new RedisDatabase(options);
        } else if (options.database == 'sqlite') {
            this.driver = new SQLiteDatabase(options);
        } else {
            Log.error('Database driver not set.');
        }
    }

    /**
     * Get a value from the database.
     *
     * @return {Promise<any>}
     */
    get(key: string): Promise<any> {
        return this.driver.get(key)
    };

    /**
     * Set a value to the database.
     *
     * @return {Promise<any>}
     */
    set(key: string, value: any): void {
        this.driver.set(key, value);
    };
}
