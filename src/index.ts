#!/usr/bin/env node

import { execSync } from "child_process";
import readline from "readline";
import fs from "fs";
import { changeToRepoDirectory, ensureGitInstalled, getCommitDiff, parseArgs, wait } from "./utils.js";

ensureGitInstalled();

const args = parseArgs(process);

let exitRequested = false;

readline.emitKeypressEvents(process.stdin);

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on("keypress", (_, key) => {
  if (key.name === "c" && key.ctrl) {
    console.log("Ctrl+C pressed. Exiting and restoring original directory...");
    process.chdir(args.originalLocation);
    exitRequested = true;
    process.exit(0);
  }
});

changeToRepoDirectory(args.repoPath);

const startCommit = execSync("git rev-parse HEAD", {
  encoding: "utf-8",
}).trim();

try {
  while (exitRequested === false) {
    const committedDiff = getCommitDiff(startCommit);
    const uncommittedDiff = getCommitDiff();

    const totalAdded = committedDiff.added + uncommittedDiff.added;
    const totalRemoved = committedDiff.removed + uncommittedDiff.removed;
    const totalChanged = totalAdded + totalRemoved;

    const output = `Total lines changed: ${totalChanged}\nCommitted: +${committedDiff.added}/-${committedDiff.removed}\nUncommitted: +${uncommittedDiff.added}/-${uncommittedDiff.removed}`;

    console.clear();
    console.log(output);

    fs.writeFileSync(args.outputPath, output, { encoding: "utf-8" });

    await wait(args.pollIntervalSeconds);
  }
} catch (error) {
  console.error("An error occurred: ", error);
  process.exit(1);
} finally {
  process.chdir(args.originalLocation);
}
