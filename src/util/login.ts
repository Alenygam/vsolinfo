import fetch from "cross-fetch";
import * as vscode from "vscode";
import { state } from "./state";

const reqURL = "https://training.olinfo.it/api/user"

async function loginFunc(username: string, password: string) : Promise<void> {
    try {
        const obj = {
            action: "login",
            keep_signed: true,
            password,
            username,
        };
        const res = await fetch(reqURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(obj)
        })

        // This API is fucking trash always returns status 200
        const resJson = await res.json();
        if (!resJson.success) throw Error("Request wasn't successful (whatever that means)");

        const cookie : string = res.headers.get('set-cookie')!;
        // 6 is the position of the first character in token
        const token = cookie.substring(6, cookie.indexOf(';'));
        await state.secrets.store('olinfoToken', token);
        vscode.window.showInformationMessage("Authentication Successful.");
    } catch (err) {
        vscode.window.showErrorMessage("Authentication Failed.");
        console.error(err);
    }
}

export {loginFunc};

