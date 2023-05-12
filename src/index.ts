import { spawn } from "child_process";
import { program } from "commander";

program
  .version("0.0.1")
  .name("smell-test")
  .description("Runs a cli command and waits on a specific log line to appear")
  .arguments("<log-line> <command...>")
  .action(async (logLine: string, command: string[]) => {
    let didFind = false;
    const child = spawn(command[0], command.slice(1), {
      stdio: ["inherit", "pipe", "pipe"],
    });
    child.stderr.pipe(process.stderr);
    child.stdout.pipe(process.stdout);
    child.stdout.on("data", (data) => {
      const dataString = data.toString();
      if (dataString.includes(logLine)) {
        child.kill("SIGTERM");
        didFind = true;
        process.exit(0);
      }
    });
    child.on("close", (code) => {
      if (!didFind) {
        console.error(
          `[ERROR] Command \`${command.join(
            " "
          )}\` did not output log line: ${logLine}`
        );
        process.exit(1);
      }
      process.exit(code ?? 0);
    });
  });

program.parse(process.argv);
