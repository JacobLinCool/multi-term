import stream from "node:stream";
import EventEmitter from "node:events";
import Anser from "anser";
import chalk from "chalk";

let term_count = 0;

export class Term extends EventEmitter {
    public _stdout: string[] = [];
    public _stderr: string[] = [];
    public _mixed: string[] = [];

    public stdout = new stream.PassThrough();
    public stderr = new stream.PassThrough();

    constructor(public name = `Term ${term_count++}`, public size = 100) {
        super();

        this.stdout.on("data", (data) => {
            const parsed = Anser.ansiToJson(data.toString(), { json: true });
            for (const chunk of parsed) {
                if (chunk.clearLine) {
                    if (this._stdout.length > 0) {
                        this._stdout.pop();
                    }

                    if (this._mixed.length > 0) {
                        this._mixed.pop();
                    }
                }

                const content = chunk.content.split(/[\r\n]+/g);
                this._stdout.push(...content);
                this._mixed.push(...content);

                while (this._stdout.length > this.size) {
                    this._stdout.shift();
                }

                while (this._mixed.length > this.size) {
                    this._mixed.shift();
                }

                this.emit("stdout", content);
            }
        });

        this.stderr.on("data", (data) => {
            const parsed = Anser.ansiToJson(data.toString(), { json: true });
            for (const chunk of parsed) {
                if (chunk.clearLine) {
                    if (this._stderr.length > 0) {
                        this._stderr.pop();
                    }

                    if (this._mixed.length > 0) {
                        this._mixed.pop();
                    }
                }

                const content = chunk.content.split(/[\r\n]+/g);
                this._stderr.push(...content);
                this._mixed.push(...content);

                while (this._stderr.length > this.size) {
                    this._stderr.shift();
                }

                while (this._mixed.length > this.size) {
                    this._mixed.shift();
                }

                this.emit("stderr", content);
            }
        });
    }

    public push(...lines: string[]): void {
        this._stdout.push(...lines);
        this._mixed.push(...lines);

        while (this._stdout.length > this.size) {
            this._stdout.shift();
        }

        while (this._mixed.length > this.size) {
            this._mixed.shift();
        }

        this.emit("stdout", lines);
    }

    public get out(): string {
        return this._stdout.join("\n");
    }

    public get err(): string {
        return this._stderr.join("\n");
    }

    public get mixed(): string {
        return this._mixed.join("\n");
    }
}

export class MultiTerm extends EventEmitter {
    private _terms: Term[] = [];

    constructor(public height = 3, public width = 80) {
        super();
    }

    public add(term: Term): this {
        this._terms.push(term);
        term.on("stdout", () => {
            this.emit("stdout");
        });
        term.on("stderr", () => {
            this.emit("stderr");
        });

        return this;
    }

    public remove(term: Term): Term | undefined {
        const idx = this._terms.findIndex((t) => t !== term);

        if (idx !== -1) {
            const t = this._terms.splice(idx, 1);
            t[0].removeAllListeners();
            return t[0];
        }

        return undefined;
    }

    public get out(): string {
        return this._terms
            .map((term) => format_output(term.name, term._stdout.slice(-this.height), this.width))
            .join("\n");
    }

    public get err(): string {
        return this._terms
            .map((term) => format_output(term.name, term._stderr.slice(-this.height), this.width))
            .join("\n");
    }

    public get mixed(): string {
        return this._terms
            .map((term) => format_output(term.name, term._mixed.slice(-this.height), this.width))
            .join("\n");
    }
}

export function format_output(name: string, contents: string[], width: number): string {
    let output = chalk.magentaBright(`· ${name}`) + "\n";
    if (contents.length > 0) {
        if (contents[contents.length - 1].trim() === "") {
            contents.pop();
        }

        for (let i = 0; i < contents.length - 1; i++) {
            output += `${chalk.magentaBright("│")} ${contents[i].slice(0, width)}\n`;
        }
        output += `${chalk.magentaBright("└")} ${contents[contents.length - 1].slice(0, width)}`;
    }
    return output;
}
