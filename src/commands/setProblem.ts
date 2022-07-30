import * as vscode from 'vscode';
import { state } from '../util/state';
import fetch from 'cross-fetch';

function notValid() {
    vscode.window.showErrorMessage("Not a valid olinfo URL / problem ID");
}

// Returns true if successful, false if not...
async function validateRequest(presumedID: string): Promise<boolean> {
    try {
        const obj = {
            name: presumedID,
            action: "get",
        };
        const res = await fetch('https://training.olinfo.it/api/task', {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(obj),
        })

        // Api is trash always returns status 200
        const resJson = await res.json();
        if (!resJson.success) throw Error("Request apparently not successful");

        return true;
    } catch (err) {
        notValid();
        console.error(err);
        return false;
    }
}

export async function setProblem() {
    if (!(await state.secrets.get('olinfoToken'))) {
        vscode.window.showErrorMessage("You're not logged in.");
        return;
    }
    
    const IDorURL = await vscode.window.showInputBox({
        title: "Problem ID or Problem URL"
    });
    if (!IDorURL) {
        vscode.window.showWarningMessage("Operation cancelled.");
        return;
    }

    var problemID : string;

    try {
        // Parse the URL so I can get the problemID from it
        const url = new URL(IDorURL);
        if (url.host != "training.olinfo.it") {
            // Host is not training.olinfo.it
            notValid(); return;
        }
        const pathList = url.hash.split('/')
        if (pathList.length < 3 || pathList[0] != '#' || pathList[1] != 'task') {
            // Path is not a task path
            notValid(); return;
        }

        // 3rd parameter in the path is the problemID
        problemID = pathList[2];
    } catch (_err) {
        // Check if it's an actual problemID by trying to access it.
        const result = await validateRequest(IDorURL);
        if (!result) {
            notValid(); return;
        }
        problemID = IDorURL;
    }

    state.workspaceState.update('problemOlinfo', problemID);
    vscode.window.showInformationMessage(`Problem "${problemID}" set succesfully for the current workspace.`);
}