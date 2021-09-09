const vscode = require('vscode')
const { PackageInfo } = require('./PackageInfo.js')

/** @type {PackageInfo} */
let extension = null

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
  const files = await vscode.workspace.findFiles('package.json', 'node_modules', 1)

  if (extension == null) {
    extension = new PackageInfo(context)
    await extension.init()
  }

  context.subscriptions.push(
    ...[
      vscode.commands.registerCommand('projectVersion.openPackage', async () => {
        await extension?.openPackageFile()
      }),
      vscode.commands.registerCommand('projectVersion.refresh', async () => {
        if (extension != null) {
          if (await extension.packageFileExists()) {
            await extension.updateStatusBarItem(true)
          } else {
            vscode.window.showInformationMessage('This project has no package.json file.')
          }
        }
      }),
      vscode.commands.registerCommand('projectVersion.config', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:igordvlpr.project-version')
      }),
    ]
  )

  if (!files || files.length < 1) {
    return
  }

  extension.setPackageUri()
  extension.updateStatusBarItem(true)
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
}
