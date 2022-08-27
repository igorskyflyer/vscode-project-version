const { Keppo } = require('@igor.dvlpr/keppo')
const { readFile, access, writeFile } = require('fs/promises')
const { join } = require('path')
const vscode = require('vscode')

/**
 * @typedef {object} ProjectInfo
 * @property {string} name
 * @property {string} version
 */

/** @enum {string} */
const DisplayMode = {
  IconAndText: 'Icon and Text',
  TextOnly: 'Text only',
  Custom: 'Custom',
}

class PackageInfo {
  /**
   * Creates an instance of PackageInfo.
   * @author Igor Dimitrijević
   * @param {vscode.ExtensionContext} context
   * @memberof PackageInfo
   */
  constructor(context) {
    /**
     * @private
     * @type {vscode.ExtensionContext}
     */
    this.context = context
    /**
     * @private
     * @type {string|null}
     */
    this.packagePath = null
    /**
     * @private
     * @type {ProjectInfo}
     */
    this.projectInfo = {
      name: '',
      version: '',
    }
    /** @type {vscode.StatusBarItem} */
    this.statusBarItem = null
    /** @type {boolean} */
    this.needsRepaint = true
  }

  setPackageUri() {
    if (this.packagePath != null) {
      return
    }

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length >= 1) {
      this.packagePath = join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'package.json')
    }
  }

  registerWorkspaceHandlers() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        this.setPackageUri()
        await this.updateStatusBarItem(true)
      })
    )
  }

  registerConfigurationHandlers() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (
          e.affectsConfiguration('projectVersion.statusBarItemAlignment') ||
          e.affectsConfiguration('projectVersion.statusBarItemPriority')
        ) {
          if (this.statusBarItem) {
            this.statusBarItem.hide()
            this.statusBarItem.dispose()
          }

          this.statusBarItem = vscode.window.createStatusBarItem(this.getStatusBarAlignment(), this.getStatusBarPriority())
          this.statusBarItem.show()

          this.context.subscriptions.push(this.statusBarItem)
        }

        this.setPackageUri()
        await this.updateStatusBarItem(true, true)
      })
    )
  }

  registerFileWatcher() {
    const watcher = vscode.workspace.createFileSystemWatcher('**/package.json')

    watcher.onDidCreate(async () => {
      this.setPackageUri()
      await this.updateStatusBarItem(true)
    })

    watcher.onDidChange(async () => {
      await this.updateStatusBarItem(true)
    })

    watcher.onDidDelete(async () => {
      this.packagePath = null
      await this.updateStatusBarItem(true)
    })

    this.context.subscriptions.push(watcher)
  }

  /** @returns {string} */
  getCustomFormat() {
    return vscode.workspace.getConfiguration('projectVersion').get('customFormat') || ''
  }

  /** @returns {string} */
  getFormat() {
    return vscode.workspace.getConfiguration('projectVersion').get('display') || DisplayMode.IconAndText
  }

  /**
   * @returns {string}
   */
  formatDisplay() {
    const format = this.getFormat()
    let customFormat = this.getCustomFormat()

    if (format === DisplayMode.TextOnly) {
      return `${this.projectInfo.name} ${this.projectInfo.version}`
    } else if (customFormat && format === DisplayMode.Custom) {
      customFormat = customFormat.replace('${name}', this.projectInfo.name)
      customFormat = customFormat.replace('${version}', this.projectInfo.version)

      // handle non-existent variables
      customFormat = customFormat.replace(/\$\{.*?\}/gi, '')

      return customFormat
    } else {
      return `$(info) ${this.projectInfo.name} ${this.projectInfo.version}`
    }
  }

  /** @returns {boolean} */
  getAutoSaveOnVersionChange() {
    return vscode.workspace.getConfiguration('projectVersion').get('autoSaveOnVersionChange') || false
  }

  /** @returns {Promise<boolean>} */
  async readPackageInfo() {
    try {
      const packageFile = await readFile(this.packagePath)
      const packageJson = JSON.parse(packageFile.toString())

      if (!this.packageHasChanged(packageJson)) {
        this.needsRepaint = false
        return true
      } else {
        this.needsRepaint = true
      }

      const name = packageJson['name']
      const version = packageJson['version']

      if (name) {
        this.projectInfo.name = name
      } else {
        this.projectInfo.name = ''
      }

      if (version) {
        this.projectInfo.version = version
      } else {
        this.projectInfo.version = ''
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * @param {ProjectInfo} info
   */
  packageHasChanged(info) {
    if (info.name !== this.projectInfo.name || info.version !== this.projectInfo.version) {
      return true
    }

    return false
  }

  getStatusBarAlignment() {
    const alignment = vscode.workspace.getConfiguration('projectVersion').get('statusBarItemAlignment') || 'Right'

    if (alignment === 'Left') {
      return vscode.StatusBarAlignment.Left
    } else {
      return vscode.StatusBarAlignment.Right
    }
  }

  getStatusBarPriority() {
    const priority = vscode.workspace.getConfiguration('projectVersion').get('statusBarItemPriority')

    if (typeof priority !== 'number') {
      return 1000
    } else {
      return priority
    }
  }

  setupStatusBarItem() {
    this.statusBarItem.tooltip = "Open project's package.json."
    this.statusBarItem.text = '$(sync~spin)'
    this.statusBarItem.command = 'projectVersion.openPackage'
    this.statusBarItem.show()
  }

  async init() {
    this.statusBarItem = vscode.window.createStatusBarItem(this.getStatusBarAlignment(), this.getStatusBarPriority())

    this.registerWorkspaceHandlers()
    this.registerConfigurationHandlers()
    this.registerFileWatcher()

    this.context.subscriptions.push(this.statusBarItem)
  }

  /**
   * @param {boolean} [forceRepaint=false]
   * @param {boolean} [useCached=false]
   */
  async updateStatusBarItem(forceRepaint, useCached) {
    if (!forceRepaint && !this.needsRepaint) {
      return
    }

    if (!useCached) {
      const didRead = await this.readPackageInfo()

      if (!didRead) {
        this.noPackage()
        return
      } else {
        this.setupStatusBarItem()
      }
    }

    this.statusBarItem.text = this.formatDisplay()
  }

  noPackage() {
    this.statusBarItem.text = 'N/A'
    this.statusBarItem.command = null
    this.statusBarItem.tooltip = 'No package.json found.'
  }

  showStatusBarItem() {
    if (this.statusBarItem != null) {
      this.statusBarItem.show()
    }
  }

  /** @returns {Promise<boolean>} */
  async packageFileExists() {
    if (this.packagePath) {
      try {
        await access(this.packagePath)
        return true
      } catch {
        return false
      }
    }

    return false
  }

  async openPackageFile() {
    if (await this.packageFileExists()) {
      try {
        const packageFile = await vscode.workspace.openTextDocument(this.packagePath)
        vscode.window.showTextDocument(packageFile)
      } catch {
        vscode.window.showErrorMessage("An error has occurred while opening the project's package.json file.")
      }
    } else {
      vscode.window.showInformationMessage('This project has no package.json file.')
    }
  }

  /**
   * @param {string} component
   */
  async increaseVersion(component) {
    try {
      const document = await vscode.workspace.openTextDocument(this.packagePath)

      if (document.isDirty) {
        vscode.window.showErrorMessage(
          'The file package.json is dirty, either save it, undo the changes or consider using the setting Auto save of the extension.'
        )
        return
      }

      if (!this.projectInfo.version) {
        vscode.window.showErrorMessage('The package.json file does not contain the version property.')
        return
      }

      const version = new Keppo(this.projectInfo.version)
      version.isStrict(true)

      if (component === 'major') {
        version.increaseMajor(1)
      } else if (component === 'minor') {
        version.increaseMinor(1)
      } else {
        version.increasePatch(1)
      }

      const packageFile = document.getText()

      const replacedFile = packageFile.replace(`"version": "${this.projectInfo.version}"`, `"version": "${version.toString()}"`)

      if (packageFile === replacedFile) {
        vscode.window.showErrorMessage(
          "Couldn't update the version, either there is no version property or the package.json is not formatted correctly."
        )
        return
      }

      if (this.getAutoSaveOnVersionChange()) {
        await writeFile(this.packagePath, replacedFile)
      } else {
        const editor = await vscode.window.showTextDocument(document)

        editor.edit((editBuilder) => {
          editBuilder.replace(
            new vscode.Range(document.lineAt(0).range.start, document.lineAt(document.lineCount - 1).range.end),
            replacedFile
          )
        })
      }
    } catch {
      vscode.window.showErrorMessage(
        "An error has occurred while updating the project's version. Check if your project's package.json file is valid."
      )
    }
  }
}

module.exports = { PackageInfo }
