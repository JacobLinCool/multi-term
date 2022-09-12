# multi-term

Show outputs of parallel running child processes without messing up anything.

[DEMO Video](https://user-images.githubusercontent.com/28478594/189705530-93f9eb4b-3a6c-4183-8fb2-9ab1c277a8d1.mp4)

## Install

```sh
pnpm i multi-term
```

## Usage

See [`examples`](./examples) for demo source.

Every `MultiTerm` emits event `stdout` or `stderr` when the underlying terms receive data, then you can access `.out`, `.err`, or `.mixed` to get the formatted outputs.

You can make it responsive to the terminal width:

```ts
const multi_term = new MultiTerm(3, process.stdout.columns - 2); 
process.stdout.on("resize", () => { 
    multi_term.width = process.stdout.columns - 2; 
});
```

## Other Examples

I use it in an [anime opening marker](https://github.com/JacobLinCool/baha-anime-skip/blob/main/packages/marker/src/index.ts).
