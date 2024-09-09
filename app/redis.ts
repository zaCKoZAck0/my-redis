import { RedisError } from "./errors";
import { RedisParser } from "./redis-parser";

/**
 * Commands supported by the Redis server
 */
enum COMMANDS {
    ECHO = "ECHO", 
    PING = "PING",
    GET = "GET",
    SET = "SET",

    // expiry
    PX = "PX",
}

type Redis_Config = {
    dir: string;
    dbfilename: string;
}

class RedisConfig {
    private dir: string;
    private dbfilename: string;

    constructor(dir?: string, dbfilename?: string) {
        this.dir = dir ?? "dir";
        this.dbfilename = dbfilename ?? "/tmp/redis-data";
    }

    getConfig(): Redis_Config {
        return {
            dir: this.dir,
            dbfilename: this.dbfilename
        };
    }
}

/**
 * Redis server implementation
 * 
 **/
export class Redis {

    private store: Map<string, any>;
    private expiry: Map<string, number>;
    private parser: RedisParser;
    private config: RedisConfig;

    constructor(config?: Redis_Config) {
        this.store = new Map();
        this.expiry = new Map();
        this.parser = new RedisParser();
        this.config = new RedisConfig(config?.dir, config?.dbfilename);
        // Delete expired keys every 10 minutes
        setInterval(() => this.deleteExpiredKeys(), 10000 * 60);
    }

    run(input: string): SERIALIZED {
        // Parse the input and execute the command
        const args = this.parser.parse(input);
        const command: COMMANDS = args[0].toUpperCase();
        switch (command) {
            case COMMANDS.ECHO:
                return this.ECHO(args[1], args.slice(2));
            case COMMANDS.PING:
                return this.PING(args.slice(1));
            case COMMANDS.GET:
                if (args.length < 2) return this.parser.serialize(new RedisError("ERR wrong number of arguments for 'get' command"));
                return this.GET(args[1], args.slice(2));
            case COMMANDS.SET:
                if (args.length < 3) return this.parser.serialize(new RedisError("ERR wrong number of arguments for 'set' command"));
                return this.SET(args[1], args[2], args.slice(3));
            default:
                return this.parser.serialize(new RedisError("ERR unknown command"));
        }
    }

    private ECHO(value: string, args: any[]): SERIALIZED {
        return this.parser.serialize(value);
    }

    private PING(args: any[]): SERIALIZED {
        return this.parser.serialize("PONG");
    }

    private GET(key: string, args: any[]): SERIALIZED {
        const res = this.get(key);
        if (res === null) return this.parser.serializeBulkString(null);
        return this.parser.serialize(res);
    }

    private SET(key: string, value: string, args: any[]): SERIALIZED {
        if (args.length > 0) this.setWithArgs(key, value, args);
        return this.parser.serialize(this.set(key, value));
    }

    private isExpired(key: string): boolean {
        const expiry = this.expiry.get(key);
        if (expiry && expiry < Date.now()) {
            return true;
        }
        return false;
    }

    private setExpiry(key: string, ttl: number): void {
        const expiry = Date.now() + ttl;
        this.expiry.set(key, expiry);
    }

    private deleteExpiredKeys() {
        const now = Date.now();
        for (const [key, expiryTime] of this.expiry.entries()) {
            if (expiryTime <= now) {
                this.deleteRecord(key);
            }
        }
    }

    private deleteRecord(key: string): boolean {
        return this.store.delete(key) || this.expiry.delete(key);
    }

    get(key: string): string | null {
        if (this.isExpired(key)){
            this.deleteRecord(key);
            return null;
        }
        return this.store.get(key) || null;
    }

    set(key: string, value: string): boolean {
        this.store.set(key, value);
        return true;
    }

    private setWithArgs(key:string, value: string, args: any[]) {
        for (let i = 0; i < args.length; i+2) {
            switch (args[i].toUpperCase()) {
                case COMMANDS.PX:
                    if (args.length < i+2) return;
                    this.setExpiry(key, args[i+1]);
                    break;
            }
        }
    }
}