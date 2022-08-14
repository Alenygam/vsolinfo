import * as vscode from 'vscode';
import { state } from '../util/state';
import fetch, { Headers } from 'cross-fetch';

export async function setProblem() {
    if (!(await state.secrets.get('olinfoToken'))) {
        vscode.window.showErrorMessage("You're not logged in.");
        return;
    }
    
    const quickPick = vscode.window.createQuickPick()
    quickPick.title = "Select a problem";
    quickPick.items = await initItems("");
    quickPick.show();
    quickPick.onDidChangeValue(async (e) => {
        quickPick.items = await initItems(e);
    })
    quickPick.onDidAccept(() => {
        const problemID = quickPick.selectedItems[0].detail;
        state.workspaceState.update('problemOlinfo', problemID);
        vscode.window.showInformationMessage(`Problem "${problemID}" set succesfully for the current workspace.`);
        quickPick.hide();
    })
    quickPick.onDidHide(() => {
        quickPick.dispose();
    })

}

async function initItems(search: string ) : Promise<vscode.QuickPickItem[]> {
    try {
        const obj = {
            action: "list",
            first : 0,
            last: 10,
            search,
        }
        const res = await fetch("https://training.olinfo.it/api/task", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(obj)
        });

        const resJSON = await res.json();
        if (!resJSON.success) throw Error("WHY DID THIS NOT WORK AAAAAAA");

        const arr = resJSON.tasks;
        var itemsArr: vscode.QuickPickItem[] = [];
        for (let i = 0; i < arr.length; i++) {
            itemsArr[i] = {
                label: arr[i].title,
                detail: arr[i].name
            };
        }
        return itemsArr;
    } catch (err) {
        console.error(err);
        return [];
    }
}