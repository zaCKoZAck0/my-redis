import { RedisError } from "./errors";
import { RedisParser } from "./redis-parser";

/**
 * Commands supported by the Redis server
 */
enum COMMANDS {
    ECHO = "ECHO", 
    PING = "PING",
    GET = "GET",
    SET = "SET"
}

/**
 * Status of the command execution
 */
enum STATUS {
    OK = "OK",
    NO = "NO",
    NULL = "NULL"
}


/**
 * Redis server implementation
 * 
 **/
export class Redis {

    private store: Map<string, any>;
    private expiry: Map<string, number>;
    private parser: RedisParser;

    constructor() {
        this.store = new Map();
        this.expiry = new Map();
        this.parser = new RedisParser();
    }

    run(input: string): string {
        // Parse the input and execute the command
        const args = this.parser.parse(input);
        const command: COMMANDS = args[0].toUpperCase();
        switch (command) {
            case COMMANDS.ECHO:
                return this.parser.serialize(args[1]);
            case COMMANDS.PING:
                return this.parser.serialize("PONG");
            case COMMANDS.GET:
                if (args.length < 2) return this.parser.serialize(new RedisError("ERR wrong number of arguments for 'get' command"));
                const res = this.get(args[1]);
                if (res === null) return this.parser.serializeBulkString(STATUS.NULL);
                return this.parser.serialize(res);
            case COMMANDS.SET:
                if (args.length < 3) return this.parser.serialize(new RedisError("ERR wrong number of arguments for 'set' command"));
                console.log(args);
                return this.parser.serialize(this.set(args[1], args[2], args.slice(3)));
            default:
                return this.parser.serialize(new RedisError("ERR unknown command"));
        }
    }

    private isExpired(key: string): boolean {
        const expiry = this.expiry.get(key);
        console.log(expiry);
        console.log(Date.now());
        if (expiry && expiry < Date.now()) {
            return true;
        }
        return false;
    }

    private setExpiry(key: string, ttl: number): void {
        this.expiry.set(key, ttl);
    }

    get(key: string): string | null {
        if (this.isExpired(key))
            return null;
        return this.store.get(key) || null;
    }

    set(key: string, value: string, ...args: any[]): boolean {
        if (args.length > 0) {
            const expiry = new Date(Date.now() + parseInt(args[1]));
            const ttl = expiry.getMilliseconds();
            this.setExpiry(key, ttl);
        }
        this.store.set(key, value);
        return true;
    }
}