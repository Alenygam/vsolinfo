import * as vscode from 'vscode';
import { loginFunc } from '../util/login';
import { state } from '../util/state';

function cancelled() {
        vscode.window.showWarningMessage("Authentication cancelled.");
}

export async function login() {
    if (await state.secrets.get('olinfoToken')) {
        vscode.window.showInformationMessage("You're already logged in");
        return;
    }
    const username = await vscode.window.showInputBox({
        title: "Username"
    });
    if (!username) {
        cancelled()
        return;
    }

    const password = await vscode.window.showInputBox({
        title: "Password"
    })
    if (!password) {
        cancelled()
        return;
    }

    await loginFunc(username, password);
}