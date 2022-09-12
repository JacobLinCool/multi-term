import { exec } from "node:child_process";
import { Term, MultiTerm } from "../lib/index.mjs";
import update from "log-update";

main();

async function main() {
    const multi_term = new MultiTerm();
    multi_term.on("stdout", () => update(multi_term.mixed));

    for (let i = 0; i < 5; i++) {
        await sleep(200);
        const command = `node -e "let i = 0; setInterval(() => { console.log(new Date()); if (i++ > 30) process.exit(0); }, 100)"`;

        const term = new Term(`Task ${i} - Start at ${new Date().toJSON()}`);
        multi_term.add(term);

        const proc = exec(command);
        proc.stdout?.pipe(term.stdout);
        proc.stderr?.pipe(term.stderr);
        proc.on("close", () => {
            multi_term.remove(term);
        });
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
