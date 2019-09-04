/**
 * Interface for key/value data stores.
 */
export interface DatabaseDriver {
    /**
     * Get a value from the database.
     */
    get(key: string): Promise<any>;

    /**
     * Set a value to the database.
     */
    set(key: string, value: any): void;
}
