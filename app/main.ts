import * as net from "net";
import { Redis } from "./redis";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {

    const cache = new Redis();

    connection.on("connect", () => {
        console.log("Connected to client");
    });

    connection.on("data", (data: Buffer) => {
        const commands = data.toString('utf-8')
        connection.write(cache.run(commands));
    });

});

server.listen(6379, "127.0.0.1");