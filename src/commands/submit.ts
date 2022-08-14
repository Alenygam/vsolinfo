import * as vscode from 'vscode';
import { state } from '../util/state';
import fetch from 'cross-fetch';

export async function submit() {
    const token : string | undefined = await state.secrets.get('olinfoToken');
    if (!token) {
        vscode.window.showErrorMessage("You're not logged in.");
        return;
    }

    if (!vscode.window.activeTextEditor) {
        vscode.window.showWarningMessage("No active editor...");
        return;
    }
    
    const problemID: string | undefined = await state.workspaceState.get('problemOlinfo');
    if (!problemID) {
        vscode.window.showErrorMessage("You have not set a problem for this workspace yet.")
        return;
    }

    const language = vscode.window.activeTextEditor.document.languageId;
    if (language !== 'c' && language !== 'cpp') {
        vscode.window.showWarningMessage("Only supported languages by the extension are c/c++");
        return;
    }


    const text = vscode.window.activeTextEditor.document.getText();
    const obj : any = {
        action: "new",
        files: {},
        task_name: problemID
    }

    obj.files[`${problemID}.%l`] = {
        data: Buffer.from(text).toString('base64'),
        filename: "ace.cpp",
        language: "C++11 / g++"
    }

    try {
        const res = await fetch("https://training.olinfo.it/api/submission", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(obj)
        })

        const data = await res.json();
        if (!data.success) throw new Error("Request unsuccessful (whatever that means)");

        vscode.window.showInformationMessage("Code submitted successfully")
    } catch (err) {
        console.error(err);
        vscode.window.showErrorMessage("Could not submit code");
    }
}