import * as net from "net";
import { Redis, Config } from "./redis";

function parseArgs(args: string[]){
    const parsedArgs: {[key: string]: string} = {};
    for (let i = 0; i < args.length; i += 2) {
        if (args[i].slice(0, 2) !== "--") {
            throw new Error("Invalid argument format");
        }
        parsedArgs[args[i].slice(2)] = args[i + 1];
    }
    console.log(parsedArgs);
    return parsedArgs;
}

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Get arguments from the command line
const args = process.argv.slice(2);
const parsedArgs = parseArgs(args);

// Uncomment this block to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {

    const redis = new Redis(parsedArgs as Config);

    connection.on("connect", () => {
        console.log("Connected to client");
    });

    connection.on("data", (data: Buffer) => {
        const commands = data.toString('utf-8')
        connection.write(redis.run(commands));
    });
});

server.listen(6379, "127.0.0.1");