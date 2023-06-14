#!/usr/bin/env node

import assert from "assert";
import { spawn } from "child_process";
import { program } from "commander";

program
  .version("1.5.0")
  .name("smell-test")
  .description("Runs a cli command and waits on a specific log line to appear")
  .argument("<log-line>", "The log line to wait for")
  .argument(
    "<command...>",
    "The command to run. If you want to pass flags, use --"
  )
  .option("--quiet", "Don't output anything")
  .option(
    "-a, --amount <amount>",
    "The amount of times to check for the log line",
    "1"
  )
  .action(
    async (
      logLine: string,
      command: string[],
      options: { quiet?: boolean; amount: string }
    ) => {
      const amount = parseInt(options.amount);
      assert(!isNaN(amount), "Amount must be a number");
      if (!options.quiet) {
        console.log(`Waiting for log line: ${logLine}`);
        console.log(`Running command: ${command.join(" ")}`);
      }
      const child = spawn(command[0], command.slice(1), {
        stdio: ["inherit", "pipe", "pipe"],
      });
      if (!options.quiet) {
        child.stderr.pipe(process.stderr);
        child.stdout.pipe(process.stdout);
      }
      let count = 0;
      child.stdout.on("data", (data) => tryFind(data, logLine));
      child.stderr.on("data", (data) => tryFind(data, logLine));
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
      function tryFind(data: Buffer, logLine: string) {
        const dataString = data.toString();
        if (dataString.includes(logLine)) {
          if (!options.quiet) {
            console.log(`Found log line: ${logLine}`);
          }
          if (count >= amount) {
            child.kill("SIGTERM");
            process.exit(0);
          }
          count++;
        }
      }
    }
  );

program.parse(process.argv);
