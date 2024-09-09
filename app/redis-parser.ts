import { RedisError } from "./errors";

export class RedisParser {
    private readonly CRLF = "\r\n";

    private readonly FIRST_BYTE = {
        ARRAY: "*",
        BULK_STRING: "$",
        STRING: "+",
        NUMBER: ":"
    };

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
                return data.slice(1).replace(this.CRLF, '');
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
}