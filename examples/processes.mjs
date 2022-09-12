import { exec } from "node:child_process";
import { Term, MultiTerm } from "../lib/index.mjs";
import update from "log-update";

main();

async function main() {
    // Create a multi-term instance, and use `log-update` to render it on the screen
    const multi_term = new MultiTerm();
    multi_term.on("stdout", () => update(multi_term.mixed));
    multi_term.on("clear", () => {
        update("done");
        update.clear();
        update.done();
        console.log("done");
        setTimeout(() => process.exit(0), 1000);
    });

    for (let i = 0; i < 5; i++) {
        // Wait 0.5 seconds before starting the next process
        await sleep(500);

        // Create a new virtual terminal, and attach it to the multi-term
        const term = new Term(`Task ${i} - Start at ${new Date().toJSON()}`);
        multi_term.add(term);

        // Run a simple program that prints the date every 0.1 seconds
        const command = `node -e "let i = 0; setInterval(() => { console.log((new Date()).toJSON().padStart(i)); if (i++ > 30) process.exit(0); }, 100)"`;

        // Create a child process and pipe the output to the virtual terminal
        const task = exec(command);
        task.stdout?.pipe(term.stdout);
        task.stderr?.pipe(term.stderr);

        // Remove the virtual terminal from the multi-term when the process exits
        task.on("exit", () => multi_term.remove(term));
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
