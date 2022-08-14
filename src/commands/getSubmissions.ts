import * as vscode from 'vscode';
import { state } from "../util/state";
import fetch from 'cross-fetch';

export async function getSubmissions() {
	const token: string | undefined = await state.secrets.get('olinfoToken');
    if (!token) {
        vscode.window.showErrorMessage("You're not logged in.");
        return;
    }

    // Check if a problemID was already set before...
    const problemID: string | undefined = await state.workspaceState.get('problemOlinfo');
    if (!problemID) {
        vscode.window.showErrorMessage("You have not set a problem for this workspace yet.")
        return;
    }

	const submissionID: string | undefined = await selectSubmission(problemID, token);
	if (!submissionID) return;

    const panel = vscode.window.createWebviewPanel(
        "statement_panel", 
        problemID,
        {viewColumn: vscode.ViewColumn.Beside}
    );
	initPanel(panel, +submissionID, token);
}

const fetchSubmission = async (submissionID: number, token: string) => {
	const obj = {
		action: "details",
		id: submissionID
	}

	try {
        const res = await fetch("https://training.olinfo.it/api/submission", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(obj)
        });
        
		const resJSON = await res.json();
        if (!resJSON.success) throw Error("WHY DID THIS NOT WORK AAAAAAA");
		
		return resJSON;
	} catch (err) {
		// Why did it go wrong 😔
		console.error(err);
		return undefined;
	}
}

const renderScores = (scores: any) => {
	const toBiggestMeasurement = (num: number) => {
		let idx = 0;
		const units = ["B", "KiB", "MiB", "GiB", "TiB"];
		while ((num / 1024) > 1) {
			num /= 1024;
			idx++;
		}
		// Round to 2 decimal places
		num *= 100;
		num = Math.round(num);
		num /= 100;
		return [num, units[idx]];
	}

	var string = "";
	for (let i in scores) {
		string += `\n<h3>Subtask ${i}</h3>\n`;
		string += `\n<div class="grid">`
		for (let tc of scores[i].testcases) {
			string += `\n<div>${tc.idx}</div>\n`;
			string += `\n<div>${tc.outcome}</div>\n`;
			string += `\n<div>${tc.text}</div>\n`;
			string += `\n<div>${tc.time}s</div>\n`;
			const [measurement, unit] = toBiggestMeasurement(tc.memory);
			string += `\n<div>${measurement} ${unit}</div>\n`;
			string += `\n<div class="${tc.outcome === 'Correct' ? 'success': 'error'}"></div>\n`;
		}
		string += `\n</div>\n`
	}
	return string;
}

const initPanel = (panel: vscode.WebviewPanel, submissionID: number, token: string) => {
	const initial = `
		<html>
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="X-UA-Compatible" content="IE=edge">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
					body {
						font-size: 14px;
					}

					.success, .error {
						padding: 0;
						margin: 5px;
					}

					.success {
						background-color: green;
					}

					.error {
						background-color: red;
					}

					.grid {
						display: grid;
						grid-template-columns: 80px 80px 160px 70px 95px 30px;
					}

					.grid > div {
						padding: 5px;
					}
				</style>
			</head>
			<body>
	`

	const end = `
			</body>
		</html>
	`

	const compilationOutputs = (stdout: string, stderr: string) => {
		console.log(stdout);
		return `
			<h3>Compilation Stdout</h3>
			<pre>
				<code>
${stdout.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt')}
				</code>
			</pre>
			<h3>Compilation Stderr</h3>
			<pre>
				<code>
${stderr.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}
				</code>
			</pre>
		`
	}
	const intrvl = setInterval(refresh, 5000);
	refresh();
	async function refresh() {
		const submission = await fetchSubmission(submissionID, token);
		if (!submission) {
			clearInterval(intrvl);
			vscode.window.showErrorMessage("Could not fetch submission...");
			return;
		}

		if (submission.compilation_outcome === 'fail') {
			clearInterval(intrvl);
			const cstdout = submission.compilation_stdout;
			const cstderr = submission.compilation_stderr;
			// Render things
			panel.webview.html = initial + 
				'\n <h2>Compilation Failed</h2> \n' +
				'\n' + compilationOutputs(cstdout, cstderr) + '\n' 
				+ end;
			return;
		}

		if (submission.compilation_outcome === null) {
			panel.webview.html = initial + '\n <h2>Compilation Pending</h2> \n' + end;
			// Render things
		}

		if (submission.compilation_outcome === 'ok') {
			const cstdout = submission.compilation_stdout;
			const cstderr = submission.compilation_stderr;
			if (submission.evaluation_outcome === null) {
				panel.webview.html = initial + 
					'\n <h2>Compilation Successful | Evaluation Pending</h2> \n' +
					'\n' + compilationOutputs(cstdout, cstderr) + '\n' 
					+ end;
			} else {
				clearInterval(intrvl);
				panel.webview.html = initial + 
					`\n <h2>Compilation Successful | ${submission.score}/100</h2> \n` +
					'\n' + renderScores(submission.score_details) + '\n' +
					'\n' + compilationOutputs(cstdout, cstderr) + '\n' +
					end;
			}
		}
	}
}

// Promise that returns empty string when submission not selected
const selectSubmission = (problemID: string, token: string): Promise<string | undefined> => {
	return new Promise(async (resolve, _) => {
		const quickPick = vscode.window.createQuickPick()
		quickPick.title = "Select a submission";
		quickPick.items = await initItems(problemID, token);
		quickPick.show();
		quickPick.onDidAccept(() => {
			const submissionID = quickPick.selectedItems[0].label;
			quickPick.hide();
			resolve(submissionID);
		})
		quickPick.onDidHide(() => {
			quickPick.dispose();
			resolve(undefined);
		})
	})
}

const initItems = async (problemID: string, token: string) => {
    try {
        const obj = {
            action: "list",
			task_name: problemID
        }
        const res = await fetch("https://training.olinfo.it/api/submission", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${token}`
            },
            body: JSON.stringify(obj)
        });

        const resJSON = await res.json();
        if (!resJSON.success) throw Error("WHY DID THIS NOT WORK AAAAAAA");

        const arr = resJSON.submissions;
        var itemsArr: vscode.QuickPickItem[] = [];
        for (let i = 0; i < arr.length; i++) {
			var str: string;
			if (arr[i].compilation_outcome === 'ok') {
				str = "Compilation Succeeded | ";
				if (arr[i].evaluation_outcome === 'ok') {
					str += `${arr[i].score}/100`;
				} else {
					str += "Evaluation Pending";
				}
			} else if (arr[i].compilation_outcome === 'fail') {
				str = "Compilation Failed";
			} else {
				str = "Compilation Pending";
			}

            itemsArr[i] = {
                label: String(arr[i].id),
                detail: str
            };
        }
        return itemsArr;
    } catch (err) {
        console.error(err);
        return [];
    }
}