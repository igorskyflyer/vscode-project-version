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
        await extension.openPackageFile()
      }),

      vscode.commands.registerCommand('projectVersion.refresh', async () => {
        if (await extension.packageFileExists()) {
          await extension.updateStatusBarItem(true)
        } else {
          vscode.window.showInformationMessage('This project has no package.json file.')
        }
      }),

      vscode.commands.registerCommand('projectVersion.config', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:igordvlpr.project-version')
      }),

      vscode.commands.registerCommand('projectVersion.increaseMajor', async () => {
        if (await extension.packageFileExists()) {
          await extension.increaseVersion('major')
        } else {
          vscode.window.showInformationMessage('This project has no package.json file.')
        }
      }),

      vscode.commands.registerCommand('projectVersion.increaseMajorBy', async () => {
        if (await extension.packageFileExists()) {
          const input = await extension.showIncreaseByInput('major')

          if (input && input !== '') {
            await extension.increaseVersion('major', +input)
          }
        } else {
          vscode.window.showInformationMessage('This project has no package.json file.')
        }
      }),

      vscode.commands.registerCommand('projectVersion.increaseMinor', async () => {
        if (await extension.packageFileExists()) {
          await extension.increaseVersion('minor')
        } else {
          vscode.window.showInformationMessage('This project has no package.json file.')
        }
      }),

      vscode.commands.registerCommand('projectVersion.increaseMinorBy', async () => {
        if (await extension.packageFileExists()) {
          const input = await extension.showIncreaseByInput('minor')

          if (input && input !== '') {
            await extension.increaseVersion('minor', +input)
          }
        } else {
          vscode.window.showInformationMessage('This project has no package.json file.')
        }
      }),

      vscode.commands.registerCommand('projectVersion.increasePatch', async () => {
        if (await extension.packageFileExists()) {
          await extension.increaseVersion('patch')
        } else {
          vscode.window.showInformationMessage('This project has no package.json file.')
        }
      }),

      vscode.commands.registerCommand('projectVersion.increasePatchBy', async () => {
        if (await extension.packageFileExists()) {
          const input = await extension.showIncreaseByInput('patch')

          if (input && input !== '') {
            await extension.increaseVersion('patch', +input)
          }
        } else {
          vscode.window.showInformationMessage('This project has no package.json file.')
        }
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
