export interface Subscriber {
    /**
     * Subscribe to incoming events.
     *
     * @param  {Function} callback
     * @return {void}
     */
    subscribe(callback: Function): Promise<any>;

    /**
     * Unsubscribe from incoming events
     *
     * @return {Promise}
     */
    unsubscribe(): Promise<any>;
}
