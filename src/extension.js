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
    extension.init()
  }

  context.subscriptions.push(
    ...[
      vscode.commands.registerCommand('projectVersion.openPackage', async () => {
        await extension.openPackageFile()
      }),

      vscode.commands.registerCommand('projectVersion.refresh', async () => {
        if (extension.hasPackage()) {
          await extension.updateStatusBarItem(true)
        } else {
          extension.noPackageMessage()
        }
      }),

      vscode.commands.registerCommand('projectVersion.config', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:igordvlpr.project-version')
      }),

      vscode.commands.registerCommand('projectVersion.increaseMajor', async () => {
        if (extension.hasPackage()) {
          await extension.increaseVersion('major')
        } else {
          extension.noPackageMessage()
        }
      }),

      vscode.commands.registerCommand('projectVersion.increaseMajorBy', async () => {
        if (extension.hasPackage()) {
          const input = await extension.showIncreaseByInput('major')

          if (input && input !== '') {
            await extension.increaseVersion('major', +input)
          }
        } else {
          extension.noPackageMessage()
        }
      }),

      vscode.commands.registerCommand('projectVersion.increaseMinor', async () => {
        if (extension.hasPackage()) {
          await extension.increaseVersion('minor')
        } else {
          extension.noPackageMessage()
        }
      }),

      vscode.commands.registerCommand('projectVersion.increaseMinorBy', async () => {
        if (extension.hasPackage()) {
          const input = await extension.showIncreaseByInput('minor')

          if (input && input !== '') {
            await extension.increaseVersion('minor', +input)
          }
        } else {
          extension.noPackageMessage()
        }
      }),

      vscode.commands.registerCommand('projectVersion.increasePatch', async () => {
        if (extension.hasPackage()) {
          await extension.increaseVersion('patch')
        } else {
          extension.noPackageMessage()
        }
      }),

      vscode.commands.registerCommand('projectVersion.increasePatchBy', async () => {
        if (extension.hasPackage()) {
          const input = await extension.showIncreaseByInput('patch')

          if (input && input !== '') {
            await extension.increaseVersion('patch', +input)
          }
        } else {
          extension.noPackageMessage()
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
