import * as vscode from 'vscode';
import { state } from '../util/state';
import { statementFunc } from '../util/statement';

export async function statement() {
    if (!(await state.secrets.get('olinfoToken'))) {
        vscode.window.showErrorMessage("You're not logged in.");
        return;
    }

    const problemID: string | undefined = await state.workspaceState.get('problemID');
    if (!problemID) {
        vscode.window.showErrorMessage("You have not set a problem for this workspace.")
    }
    statementFunc(problemID!); // problemID is certainly defined...
}