#!/usr/bin/env node

import { ChildProcessByStdio, spawn } from "child_process";
import { program } from "commander";
import { Readable } from "stream";

program
  .version("1.0.0")
  .name("smell-test")
  .description("Runs a cli command and waits on a specific log line to appear")
  .argument("<log-line>", "The log line to wait for")
  .argument(
    "<command...>",
    "The command to run. If you want to pass flags, use --"
  )
  .option("--quiet", "Don't output anything")
  .action(
    async (
      logLine: string,
      command: string[],
      options: { quiet?: boolean }
    ) => {
      const child = spawn(command[0], command.slice(1), {
        stdio: ["inherit", "pipe", "pipe"],
      });
      if (!options.quiet) {
        child.stderr.pipe(process.stderr);
        child.stdout.pipe(process.stdout);
      }
      child.stdout.on("data", (data) => tryFind(data, logLine, child));
      child.stderr.on("data", (data) => tryFind(data, logLine, child));
      child.on("close", () => {
        if (!options.quiet) {
          console.error(
            `[ERROR] Command \`${command.join(
              " "
            )}\` did not output log line: ${logLine}`
          );
        }
        process.exit(1);
      });
    }
  );

program.parse(process.argv);
function tryFind(
  data: Buffer,
  logLine: string,
  child: ChildProcessByStdio<null, Readable, Readable>
) {
  const dataString = data.toString();
  if (dataString.includes(logLine)) {
    child.kill("SIGTERM");
    process.exit(0);
  }
}
