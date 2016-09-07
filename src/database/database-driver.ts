/**
 * Interface for key/value data stores.
 */
export interface DatabaseDriver {
    /**
     * Get a value from the database.
     *
     * @return {Promise<any>}
     */
    get(key: string): Promise<any>;

    /**
     * Set a value to the database.
     *
     * @return {Promise<any>}
     */
    set(key: string, value: any): void;
}
