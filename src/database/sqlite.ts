let sqlite3;
import { DatabaseDriver } from './database-driver';
try {
    sqlite3 = require('sqlite3');
} catch (e) { }

export class SQLiteDatabase implements DatabaseDriver {
    /**
     * SQLite client.
     *
     * @type {object}
     */
    private _sqlite: any;

    /**
     * Create a new cache instance.
     */
    constructor(private options) {
        if (!sqlite3) return;

        let path = process.cwd() + options.databaseConfig.sqlite.databasePath;
        this._sqlite = new sqlite3.cached.Database(path);
        this._sqlite.serialize(() => {
            this._sqlite.run('CREATE TABLE IF NOT EXISTS key_value (key VARCHAR(255), value TEXT)');
            this._sqlite.run('CREATE UNIQUE INDEX IF NOT EXISTS key_index ON key_value (key)');
        });
    }

    /**
     * Retrieve data from redis.
     *
     * @param  {string}  key
     * @return {Promise<any>}
     */
    get(key: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this._sqlite.get("SELECT value FROM key_value WHERE key = $key", {
                $key: key,
            }, (error, row) => {
                if (error) {
                    reject(error);
                }

                let result = row ? JSON.parse(row.value) : null;

                resolve(result);
            });
        });
    }

    /**
     * Store data to cache.
     *
     * @param  {string} key
     * @param  {any}  value
     * @return {void}
     */
    set(key: string, value: any): void {
        this._sqlite.run("INSERT OR REPLACE INTO key_value (key, value) VALUES ($key, $value)", {
            $key: key,
            $value: JSON.stringify(value)
        });
    }
}
