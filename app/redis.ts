import { RedisError } from "./errors";

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
 * The Redis server should be able to parse and serialize data according to the Redis protocol.
 **/
export class Redis {
    private readonly CRLF = "\r\n";

    private readonly FIRST_BYTE = {
        ARRAY: "*",
        BULK_STRING: "$",
        STRING: "+",
        NUMBER: ":"
    };

    private store: Map<string, any>;
    private expiry: Map<string, number>;

    constructor() {
        this.store = new Map();
        this.expiry = new Map();
    }

    /**
     * Reference: https://redis.io/docs/latest/develop/reference/protocol-spec/
     * 
     * @param data 
     * @returns parsed data according to the Redis protocol
     */
    parse(data: string): any  {
        const firstByte = data[0];
        switch (firstByte) {
            case this.FIRST_BYTE.BULK_STRING:
                return this.parseBulkString(data);
            case this.FIRST_BYTE.ARRAY:
                return this.parseArray(data);
            case this.FIRST_BYTE.STRING:
                return data.slice(1).replace(this.CRLF, '');
            case this.FIRST_BYTE.NUMBER:
                return data.slice(1).replace(this.CRLF, "");
            default:
                return "ERR unknown command";
        }
    }

    private parseBulkString(data: string): string | null {
        const parts = data.split(this.CRLF);
        const length = parseInt(parts[0].slice(1));
        if (length === -1) return null;
        return parts[1];
    }

    private parseArray(data: string): string[] | null {
        const parts = this.getParts(data);
        const length = this.getLength(data);
        if (length === -1) return null;
        const array: string[] = [];
        for (let i = 1; i <= length; i++) {
            array.push(this.parse(parts[i]));
        }
        return array;
    }

    private getLength(input: string): number {
        const pattern = /[\*$](-?\d+)/;
        const match = input.match(pattern);
        return match ? parseInt(match[1]) : -1;
    }

    private getParts(input: string): string[] {
        const FIRST_BYTE = "[*$+:]";
        const pattern = new RegExp(`${FIRST_BYTE}\\d+\\r\\n(?:(?!${FIRST_BYTE}\\d+\\r\\n)[\\s\\S])*`, 'g');
        return input.match(pattern) || [];
    }

    serialize(data: string | number | boolean | null | RedisError): string {
        if (typeof data === "string") {
            return `+${data}${this.CRLF}`;
        } else if (typeof data === "number") {
            return `:${data}${this.CRLF}`;
        } else if (typeof data === "boolean") {
            return data ? `+OK${this.CRLF}` : `+NO${this.CRLF}`;
        } else if (data === null) {
            return `+NULL${this.CRLF}`;
        } else if (data instanceof RedisError) {
            return `-${data.message}${this.CRLF}`;
        } else {
            return `+NULL${this.CRLF}`;
        }  
    }

    serializeBulkString(data: string | null): string {
        if (data === null) return "$-1\r\n";
        return `$${data.length}\r\n${data}${this.CRLF}`;
    }

    run(args: any[]): string {
        const command: COMMANDS = args[0].toUpperCase();
        console.log(command);
        switch (command) {
            case COMMANDS.ECHO:
                return this.serialize(args[1]);
            case COMMANDS.PING:
                return this.serialize("PONG");
            case COMMANDS.GET:
                if (args.length < 2) return this.serialize(new RedisError("ERR wrong number of arguments for 'get' command"));
                const res = this.get(args[1]);
                if (res === null) return this.serializeBulkString(STATUS.NULL);
                return this.serialize(res);
            case COMMANDS.SET:
                if (args.length < 3) return this.serialize(new RedisError("ERR wrong number of arguments for 'set' command"));
                return this.serialize(this.set(args[1], args[2]));
            default:
                return this.serialize(new RedisError("ERR unknown command"));
        }
    }

    private isExpired(key: string): boolean {
        const expiry = this.expiry.get(key);
        if (expiry && expiry < Date.now()) {
            return true;
        }
        return false;
    }

    private setExpiry(key: string, ttl: number, ): void {}

    get(key: string): string | null {
        if (this.isExpired(key))
            return null;
        return this.store.get(key) || null;
    }

    set(key: string, value: string): boolean {
        this.store.set(key, value);
        return true;
    }
}