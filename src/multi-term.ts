import stream from "node:stream";
import EventEmitter from "node:events";
import Anser from "anser";
import chalk from "chalk";
import truncate from "cli-truncate";

let term_count = 0;

export class Term extends EventEmitter {
    public _stdout: string[] = [];
    public _stderr: string[] = [];
    public _mixed: string[] = [];

    public stdout = new stream.PassThrough();
    public stderr = new stream.PassThrough();

    private _stdout_clear = false;
    private _stderr_clear = false;

    constructor(public name = `Term ${term_count++}`, public size = 100) {
        super();

        this.stdout.on("data", (data) => {
            const parsed = Anser.ansiToJson(data.toString(), { json: true });
            for (const chunk of parsed) {
                if (this._stdout_clear) {
                    if (this._stdout.length > 0) {
                        this._stdout.pop();
                    }

                    if (this._mixed.length > 0) {
                        this._mixed.pop();
                    }
                }

                if (chunk.clearLine) {
                    this._stdout_clear = true;
                } else {
                    this._stdout_clear = false;
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
                if (this._stderr_clear) {
                    if (this._stderr.length > 0) {
                        this._stderr.pop();
                    }

                    if (this._mixed.length > 0) {
                        this._mixed.pop();
                    }
                }

                if (chunk.clearLine) {
                    this._stderr_clear = true;
                } else {
                    this._stderr_clear = false;
                }

                const content = chunk.content.split(/[\r\n]+\s*/g);
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
            if (this._terms.length === 0) {
                this.emit("clear");
            }
            return t[0];
        }

        return undefined;
    }

    public get out(): string {
        return this._terms
            .map((term) =>
                format_output(
                    term.name,
                    term._stdout.filter((line) => line.trim().length > 0).slice(-this.height),
                    this.width,
                ),
            )
            .join("\n");
    }

    public get err(): string {
        return this._terms
            .map((term) =>
                format_output(
                    term.name,
                    term._stderr.filter((line) => line.trim().length > 0).slice(-this.height),
                    this.width,
                ),
            )
            .join("\n");
    }

    public get mixed(): string {
        return this._terms
            .map((term) =>
                format_output(
                    term.name,
                    term._mixed.filter((line) => line.trim().length > 0).slice(-this.height),
                    this.width,
                ),
            )
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
            if (contents[i].trim().length === 0) {
                continue;
            }
            output += `${chalk.magentaBright("│")} ${truncate(contents[i], width)}\n`;
        }
        output += `${chalk.magentaBright("└")} ${truncate(contents[contents.length - 1], width)}`;
    }

    return output;
}
