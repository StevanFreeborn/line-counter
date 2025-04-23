import { execSync } from "child_process";
import fs from "fs";

export function parseArgs(process: NodeJS.Process) {
  const repoPath = process.argv[2];
  const outputPath = process.argv[3];
  const pollInterval = process.argv[4];

  const usageMessage = `
Usage: line-counter <path-to-repo> <output-path> [poll-interval]

Arguments:
  path-to-repo    Path to the repository to monitor.
  output-path     Path to the output directory where the results will be saved.
  poll-interval   Interval in seconds to poll for changes (default: 10s).
`;

  if (process.argv[2] === "--help") {
    console.log(usageMessage);
    process.exit(0);
  }

  if (repoPath === undefined) {
    console.error("Please provide a path to the repository.");
    console.error(usageMessage);
    process.exit(1);
  }

  const repoPathExists = fs.existsSync(repoPath);

  if (!repoPathExists) {
    console.error(`The specified repository path does not exist: ${repoPath}`);
    process.exit(1);
  }

  if (outputPath === undefined) {
    console.error("Please provide a path to the output directory.");
    console.error(usageMessage);
    process.exit(1);
  }

  const outputPathExists = fs.existsSync(outputPath);

  if (!outputPathExists) {
    console.error(`The specified output path does not exist: ${outputPath}`);
    process.exit(1);
  }

  const outputPathIsDirectory = fs.lstatSync(outputPath).isDirectory();

  if (outputPathIsDirectory === false) {
    console.error(
      `The specified output path is not a directory: ${outputPath}`,
    );
    process.exit(1);
  }

  const pollIntervalString = pollInterval || "10";
  const pollIntervalSeconds = parseInt(pollIntervalString, 10);
  const originalLocation = process.cwd();

  return {
    repoPath,
    outputPath: `${outputPath}/line-counter-output.txt`,
    pollIntervalSeconds,
    originalLocation,
  };
}

export function ensureGitInstalled() {
  try {
    const gitVersion = execSync("git --version", { encoding: "utf-8" });
    const gitVersionRegex = /git version .+/;

    if (!gitVersionRegex.test(gitVersion)) {
      console.error(
        "Git is not installed or not found in PATH. Please install Git and try again.",
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("Unable to detect if Git is installed.");
    process.exit(1);
  }
}

export function changeToRepoDirectory(repoPath: string) {
  try {
    process.chdir(repoPath);
  } catch (error) {
    console.error(`Failed to change directory to ${repoPath}: `, error);
    process.exit(1);
  }
}

export function getCommitDiff(startCommit?: string) {
  try {
    const command = startCommit
      ? `git diff --shortstat ${startCommit} HEAD`
      : "git diff --shortstat";

    const diff = execSync(command, {
      encoding: "utf-8",
    });

    const addMatch = diff.match(/(\d+) insertion/);
    const removeMatch = diff.match(/(\d+) deletion/);

    let added = 0;
    let removed = 0;

    if (addMatch && addMatch[1]) {
      added = parseInt(addMatch[1], 10);
    }

    if (removeMatch && removeMatch[1]) {
      removed = parseInt(removeMatch[1], 10);
    }

    return { added, removed };
  } catch (error) {
    console.error("Error executing git diff: ", error);
    process.exit(1);
  }
}

export async function wait(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
