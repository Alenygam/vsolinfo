import * as vscode from 'vscode';
import { state } from '../util/state';

export async function logout() {
    if (!(await state.secrets.get('olinfoToken'))) {
        vscode.window.showErrorMessage("You're not logged in.");
        return;
    }

    await state.secrets.delete('olinfoToken');
    vscode.window.showInformationMessage("Logged out successfully.");
}