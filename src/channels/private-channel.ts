import {BaseAuthChannel} from "./baseAuthChannel";

export class PrivateChannel extends BaseAuthChannel {

    /**
     * Create a new private channel instance.
     */
    constructor(protected options: any, protected log: any) {
        super(options, log)
    }
}
