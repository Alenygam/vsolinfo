import fetch from 'cross-fetch';
import * as vscode from 'vscode';
import { state } from '../util/state';

export async function statement() {
    if (!(await state.secrets.get('olinfoToken'))) {
        vscode.window.showErrorMessage("You're not logged in.");
        return;
    }

    // Check if a problemID was already set before...
    const problemID: string | undefined = await state.workspaceState.get('problemOlinfo');
    if (!problemID) {
        vscode.window.showErrorMessage("You have not set a problem for this workspace yet.")
        return;
    }

    var statementData;
    // Try to fetch task data
    try {
        const obj = {
            action: "get",
            name: problemID,
        }
        const res = await fetch("https://training.olinfo.it/api/task", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(obj),
        });

        statementData = await res.json();
        if (!statementData.success) throw Error("Not successful request (WHY??)")
    } catch (err) {
        console.log(err);
        vscode.window.showErrorMessage("Something went wrong");
        return;
    }

    var selection : string | undefined;
    if (Object.keys(statementData.statements).length == 1) {
        // there is only one language
        const keys = Object.keys(statementData.statements)
        selection = keys[0];
    } else {
        selection = await vscode.window.showQuickPick(
            Object.keys(statementData.statements), 
            {canPickMany: false},
        );
    }
    if (!selection) {
        // Did not select a language
        vscode.window.showWarningMessage("Operation cancelled.");
        return;
    }

    // Mozilla pdf.js viewer + olinfo pdf file
    // The VSCode webview cannot natively show pdf files
    const url = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" +
        `https://training.olinfo.it/api/files/${statementData.statements[selection]}/testo.pdf`;

    // Webview panel
    const panel = vscode.window.createWebviewPanel(
        "statement_panel", 
        problemID,
        {viewColumn: vscode.ViewColumn.Beside},
        {enableScripts: true, enableCommandUris: true, enableFindWidget: true, enableForms: true}
    );
    panel.webview.html = createHTML(url);
}

const createHTML = (url: string) => {
    // I have to get around VSCode webviews not wanting to load from URL
    return `
    <html>
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                /* some styling so our webview can be full screened */
                html {
                    overflow: auto;
                }
                
                html, body, div, iframe {
                    margin: 0px; 
                    padding: 0px; 
                    height: 100%; 
                    border: none;
                }

                iframe {
                    display: block; 
                    width: 100%; 
                    border: none; 
                    overflow-y: auto; 
                    overflow-x: hidden;
                }
            </style>
        </head>
        <body>
            <!-- iframe for Mozilla's pdf viewer -->
            <iframe src="${url}"
                frameborder="0" 
                marginheight="0" 
                marginwidth="0" 
                width="100%" 
                height="100%" 
                scrolling="auto"></iframe>
        </body>
    </html>
    `
}