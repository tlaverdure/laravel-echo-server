import {Publisher} from "./publisher";
import {RedisPublisher} from "./redis-publisher";
import {IoPublisher} from "./io-publisher";

export class PublisherFactory {
    public constructor(private io) {
    }

    public create(options: any): Publisher {
        if (options.subscribers.redis) {
            return new RedisPublisher(options);
        }
        return new IoPublisher(this.io);
    }
}
