export interface Subscriber {
    /**
     * Subscribe to incoming events.
     *
     * @param  {Function} onMessage
     * @param  {Function} onReady
     * @return {void}
     */
    subscribe(onMessage: Function, onReady?: Function): void;
}
