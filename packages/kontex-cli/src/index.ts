#!/usr/bin/env bun
import { Command } from "commander";
import { registerLoginCommand } from "./commands/login.js";
import { registerLogoutCommand } from "./commands/logout.js";
import { registerInitCommand } from "./commands/init.js";
import { registerCompileCommand } from "./commands/compile.js";
import { registerFindCommand } from "./commands/find.js";
import { registerStatusCommand } from "./commands/status.js";
import { registerAuditCommand } from "./commands/audit.js";
import { registerDaemonCommand } from "./commands/daemon.js";
import { registerHooksCommand } from "./commands/hooks.js";
import { registerMcpCommand } from "./commands/mcp.js";
import { registerHookCommand } from "./commands/hook.js";

const program = new Command();
program.name("kontex").description("Persistent, git-native memory for AI-assisted development").version("1.0.0");

registerLoginCommand(program);
registerLogoutCommand(program);
registerInitCommand(program);
registerCompileCommand(program);
registerFindCommand(program);
registerStatusCommand(program);
registerAuditCommand(program);
registerDaemonCommand(program);
registerHooksCommand(program);
registerMcpCommand(program);
registerHookCommand(program);

program.parse();
