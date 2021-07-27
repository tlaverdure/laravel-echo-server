import {Publisher} from "./publisher";

export class IoPublisher implements Publisher {
    constructor(private io) {
    }

    publish(channel: string, event: string, data: any): Promise<any> {
        if (event === "presence:leaving") {
            this.io
                .to(channel)
                .emit(event, data.data.member);

            return Promise.resolve(undefined);
        }

        if (event === "presence:joining") {
            this.io
                .sockets
                .connected[data.socket.id]
                .broadcast
                .to(channel)
                .emit(event, data.data.member);

            return Promise.resolve(undefined);
        }

        this.io.sockets
            .connected[data.socket.id]
            .broadcast
            .to(channel)
            .emit(event, channel, data.data);

        return Promise.resolve(undefined);
    }
}
