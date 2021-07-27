export interface Publisher {
    publish(channel: string, event: string, data: any): Promise<any>;
}
