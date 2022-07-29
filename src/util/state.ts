import * as vscode from 'vscode';

var state : vscode.ExtensionContext;

function initState(ctx: vscode.ExtensionContext) {
    state = ctx;
}

export {state, initState};
