import type { ChildProcess } from "child_process";

declare global {
    var browserLLMChild: ChildProcess | undefined;
}

export { };