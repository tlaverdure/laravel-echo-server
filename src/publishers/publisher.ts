export interface Publisher {
    publish(channel: string, data: any): Promise<any>;
}
