import { fork, execSync } from "child_process";
import process from "process";
import os from "os";
import kill from "tree-kill";

/**
 * Start BrowserLLM server
 */
const parent_cwd = process.cwd();

// is git repo
function isGitRepo(parent_cwd) {
    try {
        execSync("git rev-parse --is-inside-work-tree", {
            cwd: parent_cwd,
            stdio: "ignore",
        });
        return true;
    } catch {
        return false;
    }
}

// Git status info
export function getGitStatus(cwd) {
    try {
        const branch = execSync(
            "git branch --show-current",
            { cwd, encoding: "utf8" }
        ).trim();

        let mainBranch = "main";

        // Try origin/HEAD first
        try {
            const headRef = execSync(
                "git symbolic-ref refs/remotes/origin/HEAD",
                {
                    cwd,
                    encoding: "utf8",
                    stdio: ["ignore", "pipe", "ignore"],
                }
            ).trim();

            mainBranch = headRef.split("/").pop();
        } catch {
            // Fallback: detect common main branches locally
            try {
                const branches = execSync(
                    "git branch --format='%(refname:short)'",
                    { cwd, encoding: "utf8" }
                );

                const branchList = branches
                    .split("\n")
                    .map(b => b.trim());

                if (branchList.includes("main")) {
                    mainBranch = "main";
                } else if (branchList.includes("master")) {
                    mainBranch = "master";
                } else if (branchList.includes("trunk")) {
                    mainBranch = "trunk";
                }
            } catch {
                // ignore
            }
        }

        const gitUser = execSync(
            "git config user.name",
            { cwd, encoding: "utf8" }
        ).trim();

        const status = execSync(
            "git status --short --untracked-files=no",
            { cwd, encoding: "utf8" }
        ).trim();

        const commits = execSync(
            "git log --oneline -5",
            { cwd, encoding: "utf8" }
        ).trim();

        return `
Current branch: ${branch}

Main branch (you will usually use this for PRs): ${mainBranch}

Git user: ${gitUser}

Status:
${status || "Clean working tree"}

Recent commits:
${commits}
`.trim();

    } catch {
        return "Failed to retrieve git status.";
    }
}

const inGitRepo = isGitRepo(parent_cwd);
const gitStatus = isGitRepo ? getGitStatus(parent_cwd) : null;
const shell = process.env.SHELL || "unknown";
const child_cwd = "/home/nate/Projects/OpenCode/BrowserLLM/";
const server_path = "src/server/server.js";

let child;

export function startServer(isResume) {
    return new Promise((resolve, reject) => {
        child = fork(server_path, [], {
            cwd: child_cwd,
            silent: true,
            env: {
                ...process.env,
                SHELL: shell,
                GIT_REPO: inGitRepo ? "true" : "false",
                CWD: parent_cwd,
                GIT_STATUS: gitStatus || "",
                RESUME: isResume ? "true" : "false",
            }
        });

        globalThis.browserLLMChild = child;

        child.on("message", (msg) => {
            if (msg === "ready") {
                console.log("BrowserLLM server is ready.");
                resolve(child);
            }
        });

        child.on("error", reject);
    });
}