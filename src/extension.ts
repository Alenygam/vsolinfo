import * as vscode from 'vscode';
import * as commands from './commands'
import { state, initState } from './util/state';

const pref = 'vsolinfo';

export function activate(context: vscode.ExtensionContext) {
	// Initialize state (very important)
	initState(context);

	// Convert import to object
	const commandsObj = Object(commands).default;
	
	// Iterate through keys
	Object.keys(commandsObj).forEach((key: string) => {
		// Register command
		let disposable = vscode.commands.registerCommand(`${pref}.${key}`, commandsObj[key]);
		context.subscriptions.push(disposable);
	})
}

export function deactivate() {}
