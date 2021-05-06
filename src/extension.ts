// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ast-view" is now active!');

    context.subscriptions.push(
		vscode.commands.registerCommand('showCodeASTView.start', () => {
            ASTViewPanel.createOrShow(context);
            const activeEditor = vscode.window.activeTextEditor;

            ASTViewPanel.setonDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        return;
                        case 'move_to_code_line':
                            if (vscode.window.activeTextEditor?.viewColumn != ASTViewPanel.LastActiveEditor.viewColumn) {
                                vscode.window.showTextDocument(ASTViewPanel.LastActiveEditor.document, ASTViewPanel.LastActiveEditor.viewColumn, false);
                            }
                            if (typeof(message.lineno) != "undefined" && message.lineno != -1) {
                                ASTViewPanel.LastActiveEditor.selections = [new vscode.Selection(new vscode.Position(message.lineno-1,0), new vscode.Position(message.lineno,0))]
                            } else {
                                vscode.window.showInformationMessage("Unknow LineNo");
                            }
                            return;
                        // ASTViewPanel.ast_view_log.appendLine("]" + message.command + " : " + message.text);
                    }
                    },
                    undefined,
                    context.subscriptions
            )

            new Promise( () => {
                ASTViewPanel.DealActiveEditor(context.extensionUri, activeEditor);
             });
		})
	);

    // if (vscode.window.registerWebviewPanelSerializer) {
	// 	// Make sure we register a serializer in activation event
	// 	vscode.window.registerWebviewPanelSerializer(ASTViewPanel.viewType, {
	// 		async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
	// 			console.log(`Got state: ${state}`);
	// 			// Reset the webview options so we use latest uri for `localResourceRoots`.
	// 			webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
	// 			ASTViewPanel.revive(webviewPanel, context.extensionUri);
	// 		}
	// 	});
	// }

}

function DealASTJsonPY(astObj: any, parentid : string) {
    return astObj
}

function DealASTJsonGO(astObj: any, parentid : string) {
    let NodeList: any = []

    let thisID = astObj.pos + '-' + astObj.end + '-' + astObj.type
    NodeList.push({
        id: thisID,
        label: astObj.type,
        fileds: {"pos": astObj.pos, "end": astObj.end, "type": astObj.type, "lineno": astObj.lineno},
        parent: parentid,
    })
    for ( let index = 0; index < astObj.children.length; index ++) {
        NodeList  = NodeList.concat(DealASTJsonGO(astObj.children[index], thisID));
    }
    return NodeList;
}

// this method is called when your extension is deactivated
export function deactivate() {}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `static` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'static')]
	};
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

class ASTViewPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: ASTViewPanel | undefined;

    public static lastData :any | undefined;

    public static LastActiveEditor : vscode.TextEditor

	public static readonly viewType = 'ASTView';

    public static ast_view_log = vscode.window.createOutputChannel("ast-view");

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
    private need_update: boolean = false;

	public static createOrShow(context: any) {

        const extensionUri = context.extensionUri
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: vscode.ViewColumn.Beside;

		// If we already have a panel, show it.
		if (ASTViewPanel.currentPanel) {
			ASTViewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
			return;
		}
		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			ASTViewPanel.viewType,
			'ASTView Coding',
			vscode.ViewColumn.Beside ,
			getWebviewOptions(extensionUri),
		);
        
		ASTViewPanel.currentPanel = new ASTViewPanel(panel, extensionUri);
        
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		ASTViewPanel.currentPanel = new ASTViewPanel(panel, extensionUri);
	}

    public static setonDidReceiveMessage(listener: (e: any) => any, thisArgs?: any, disposables?: vscode.Disposable[] | undefined ){
        if  (!(ASTViewPanel == null || ASTViewPanel.currentPanel == null)) {
            ASTViewPanel.currentPanel._panel.webview.onDidReceiveMessage(listener, thisArgs,disposables)
        }
        
    }

    

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (!this._panel.visible) {
                    this.need_update = true;
				} else if (this.need_update) {
                    this._update();
                    this.need_update = false;
                }
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		// this._panel.webview.onDidReceiveMessage(
		// 	message => {
		// 		switch (message.command) {
		// 			case 'alert':
		// 				vscode.window.showErrorMessage(message.text);
		// 				return;
		// 		}
		// 	},
		// 	null,
		// 	this._disposables
		// );
	}

    public static DealActiveEditor(extensionUri: vscode.Uri   , activeEditor:vscode.TextEditor | undefined) {
        if (typeof(activeEditor) == "undefined" || !activeEditor) {

            ASTViewPanel.SendToView({
                "command": 'update_ast', 
                "data": '{}',
                "isShowInfo": true ,
                "language": "UNKNOW",
                "filepath": "UNKNOW",
                "errMessage": "Run ASTView in code view"
            })
            return;
        }
        
        ASTViewPanel.LastActiveEditor = activeEditor

        const { execSync } = require('child_process');
        if (activeEditor.document.languageId == "go") {
            
            try {
                const astJSONString = execSync('python  ' + vscode.Uri.joinPath(extensionUri, 'scripts','go2ast.py').fsPath + " " + activeEditor.document.uri.fsPath, { 'encoding': 'utf8' });
                const astJson = JSON.parse(astJSONString);
                const ASTNodes = JSON.stringify(DealASTJsonGO(astJson, '-'))
                ASTViewPanel.ast_view_log.appendLine( "["+activeEditor.document.languageId+"] NodeList: " + ASTNodes);

                ASTViewPanel.SendToView({
                    "command": 'update_ast', 
                    "data": ASTNodes,
                    "isShowInfo": false ,
                    "language": activeEditor.document.languageId,
                    "filepath": activeEditor.document.uri.fsPath,
                    "errMessage": ""
                })

            } catch (error) {
                ASTViewPanel.SendToView({
                    "command": 'update_ast', 
                    "data": '{}',
                    "isShowInfo": true ,
                    "language": activeEditor.document.languageId,
                    "filepath": activeEditor.document.uri.fsPath,
                    "errMessage": "Loading AST failed:  "+  error
                })
            }
        } else if (activeEditor.document.languageId == "python") {
            try {
                const astJSONString = execSync('python ' +vscode.Uri.joinPath(extensionUri, 'scripts','py2ast.py').fsPath + " " + activeEditor.document.uri.fsPath, { 'encoding': 'utf8' });
                const astJson = JSON.parse(astJSONString);
                ASTViewPanel.ast_view_log.appendLine("Result: " + astJSONString)
                const ASTNodes = JSON.stringify(DealASTJsonPY(astJson,'-'));
                ASTViewPanel.ast_view_log.appendLine( "["+activeEditor.document.languageId+"] NodeList: " + ASTNodes);
                ASTViewPanel.SendToView({
                    "command": 'update_ast', 
                    "data": ASTNodes,
                    "isShowInfo": false ,
                    "language": activeEditor.document.languageId,
                    "filepath": activeEditor.document.uri.fsPath,
                    "errMessage": ""
                })

            } catch (error) {
                ASTViewPanel.SendToView({
                    "command": 'update_ast', 
                    "data": '{}',
                    "isShowInfo": true ,
                    "language": activeEditor.document.languageId,
                    "filepath": activeEditor.document.uri.fsPath,
                    "errMessage": "Loading AST failed: "+  error
                })
            }
        }  else {
            ASTViewPanel.SendToView({
                "command": 'update_ast', 
                "data": '{}',
                "isShowInfo": true ,
                "language": activeEditor.document.languageId,
                "filepath": activeEditor.document.uri.fsPath,
                "errMessage": "Not Support this languageType: "+  activeEditor.document.languageId
            })
        }
    }

	public static SendToView(data:any ) {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
        if (typeof(ASTViewPanel.currentPanel) != "undefined" ) {
            ASTViewPanel.lastData = data;
            ASTViewPanel.currentPanel._panel.webview.postMessage(data);
        }
	}

	public dispose() {
		ASTViewPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);

        if (typeof(ASTViewPanel.lastData) != 'undefined') {
            ASTViewPanel.SendToView(ASTViewPanel.lastData);
        }
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
        ASTViewPanel.ast_view_log.appendLine("[RENDER]: _getHtmlForWebview")
        var ScriptListStr = ""
        var TestList= ""

        let JSList = [ 'jquery.min.js', 'jquery.json2html.js',   'json2html.js',   'vis.js', 'node.js']
        for (let index = 0; index < JSList.length; index ++) {
            let tmpURL = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'static', JSList[index]));
            ScriptListStr += `<script src="${tmpURL}"></script>\n`
            TestList += `${JSList[index]} : ${tmpURL}` + '\n'
        }

        let CSSList = [ 'node.css','bootstrap.min.css',  'json2html.css',   'vis-network.min.css']
        for (let index = 0; index < CSSList.length; index ++) {
            let tmpURL = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'static', CSSList[index]));
            ScriptListStr += `<link href="${tmpURL}" rel="stylesheet">\n`
            TestList += `${tmpURL}` + '\n'
        }
        // Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();

		return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Document</title>
  </head>
  <body class="container-fluid" onload="init();">
    ${ScriptListStr}
    <script type="text/javascript">
        const vscode = acquireVsCodeApi();
        var dataListJSON = {};
        var network = null;

        var input_isShowInfo = true;
        var input_language = "UNKNOW";
        var input_filepath = "UNKNOW";
        var input_errMessage = "Loading Data....(depend on code ,cost more than 1mins) :P"
        var input_datalistSTR = "{}";

        function destroy() {
            if (network !== null) {
                network.destroy();
                network = null;
            }
        }
        function DrawIt() {
            destroy();
            nodes = [];
            edges = [];
            for (let index in dataListJSON) {
                node = dataListJSON[index];
                nodes.push({id: node.id, label: node.label, fields: node.fields});
                edges.push({from: node.id, to: node.parent})
                nodeData.set(node.id, node);
            }
            var directionInput = document.getElementById("direction");
            var container = document.getElementById('mynetwork');
            var data = {
                nodes: nodes,
                edges: edges
            };
            var options = {
                edges: {
                    smooth: {
                        type: 'cubicBezier',
                        forceDirection: (directionInput.value == "UD" || directionInput.value == "DU") ? 'vertical' : 'horizontal',
                        roundness: 0.4
                    }
                },
                layout: {
                    hierarchical: {
                        direction: directionInput.value
                    }
                },
                physics:false
            };
            network = new vis.Network(container, data, options);
            network.on('select', function (params) {
                var d = nodeData.get(params.nodes[0]);
                vscode.postMessage({
                    command: 'move_to_code_line',
                    pos: d.fileds.pos,
                    end: d.fileds.end,
                    lineno: d.fileds.lineno,
                  });
                visualize(d);
            });
        }
        function TTest() {
            vscode.postMessage({
                command: 'alert',
                text: 'hello vscode'
            });
        }
        function init() {

            // 默认初始化:
            updateAll();
            
            // web 接收
            window.addEventListener('message', event => {
              const message = event.data;
              if (message.command == "update_ast") {
                 clock_time = 0
                 input_datalistSTR = message.data;
                 input_language = message.language;
                 input_filepath = message.filepath;
                 input_errMessage = message.errMessage;
                 input_isShowInfo = message.isShowInfo;
                 updateAll();
              }
              console.log(message.command);
            })   

        }

        function  updateAll() {
            document.getElementById("label_language").innerHTML = input_language;
            document.getElementById("label_filePath").innerHTML = input_filepath;
            document.getElementById("label_errmessage").innerHTML = input_errMessage;
            if (input_isShowInfo) {
                
                document.getElementById("show_err").style.visibility = "";
                document.getElementById("show_info").style.visibility = "hidden";
            } else {
                input_errMessage = "Loading ....";
                dataListJSON = JSON.parse(input_datalistSTR);
                document.getElementById("show_err").style.visibility = "hidden";
                document.getElementById("show_info").style.visibility = "";
                new Promise( () => {
                    DrawIt();
                })
            }
        }
        
        

    </script>

    <div   class="container">

        <div class="row">
            <h1>Code AST Visualizer View (ast-view)</h1>
        </div>

        <div class="row-10" style="margin-top:30px;">
            <div  class="col-5">
                <p class="labelIt">Language:<a class="labelText" id="label_language"> </a></p>            
            </div>

            <div class="col-6">
                <p class="labelIt">FilePath:<a class="labelText" id="label_filePath"> </a></p>
            </div>

        </div>

        <div class="row"  id="show_err" style="margin-top:20px;">
            <p class="ErrInfo" id="label_errmessage">  </p>
        </div>
    

        <div id="show_info">
            <div class="row" style="margin-top:20px;">
                <div class="col">
                    <input type="hidden" id='direction' value="LR">
                    <div class="CodeTree" id="mynetwork"></div>
                </div>
            </div>
            <div class="row" style="margin-top:30px;">
                <div class="col-md-4">
                    <h2>Node Properties</h2>
                    <i>Select a node on the AST graph to see properties.</i>
                    <p id="selection"></p>
                </div>
            </div>
        
        </div>

        
    </div>

    

  </body>
</html>
        `;
	}
}


// <div class="col-md-20">
//     <p>
//         Graph direction:
//         <input type="button" onclick="ChangeDirection('UD')" id="btn-UD" value="Up-Down">
//         <input type="button" onclick="ChangeDirection('DU')" id="btn-DU" value="Down-Up">
//         <input type="button" onclick="ChangeDirection('LR')" id="btn-LR" value="Left-Right">
//         <input type="button" onclick="ChangeDirection('RL')" id="btn-RL" value="Right-Left">
//         <input type="hidden" id='direction' value="LR">
//     </p>
//     <div id="mynetwork"></div>
// </div>

// <script type="text/javascript">
// function ChangeDirection(value) {
//     document.getElementById("direction").value=value;
//     DrawIt();
// };
// </script>
