const { Keppo } = require('@igor.dvlpr/keppo')
const { readFile, writeFile } = require('fs/promises')
const { join } = require('path')
const vscode = require('vscode')
const Strings = require('./strings.js')

/**
 * @typedef {object} Project
 * @property {string} name
 * @property {Keppo} version
 * @property {boolean} hasPackage
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
     * @type {Project}
     */
    this.project = {
      name: '',
      version: new Keppo(0, 0, 0, true),
      hasPackage: false,
    }
    /** @type {vscode.StatusBarItem} */
    this.statusBarItem = null
    /** @type {boolean} */
    this.needsRepaint = true
  }

  setPackageUri() {
    if (this.packagePath != null) {
      this.project.hasPackage = false
      return
    }

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length >= 1) {
      this.packagePath = join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'package.json')
      this.project.hasPackage = true
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
      this.project.hasPackage = false
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
      return `${this.project.name} ${this.project.version.toString()}`
    } else if (customFormat && format === DisplayMode.Custom) {
      customFormat = customFormat.replace('${name}', this.project.name)
      customFormat = customFormat.replace('${version}', this.project.version.toString())

      // handle non-existent variables
      customFormat = customFormat.replace(/\$\{.*?\}/gi, '')

      return customFormat
    } else {
      return `$(info) ${this.project.name} ${this.project.version.toString()}`
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
        this.project.name = name
      } else {
        this.project.name = ''
      }

      if (version && Keppo.isValid(version)) {
        this.project.version.setVersion(version)
      } else {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * @param {{name: string, version: string}} info
   */
  packageHasChanged(info) {
    if (info.name !== this.project.name || info.version !== this.project.version.toString()) {
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

  init() {
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

  async openPackageFile() {
    if (this.project.hasPackage) {
      try {
        const packageFile = await vscode.workspace.openTextDocument(this.packagePath)
        vscode.window.showTextDocument(packageFile)
      } catch {
        vscode.window.showErrorMessage(Strings.ERROR_OPEN_FILE)
      }
    } else {
      this.noPackageMessage()
    }
  }

  invalidVersionMessage() {
    vscode.window.showErrorMessage(Strings.ERROR_VERSION_RANGE_INVALID)
  }

  /**
   * @param {string} component
   * @param {number} [increaseBy=1]
   */
  async increaseVersion(component, increaseBy = 1) {
    try {
      const document = await vscode.workspace.openTextDocument(this.packagePath)

      if (document.isDirty) {
        vscode.window.showErrorMessage(Strings.ERROR_PACKAGE_DIRTY)
        return
      }

      if (!this.project.version) {
        vscode.window.showErrorMessage(Strings.ERROR_NO_VERSION_PROP)
        return
      }

      const oldVersion = this.project.version.toString()

      if (component === 'major') {
        if (this.project.version.canIncreaseMajor(increaseBy)) {
          this.project.version.increaseMajor(increaseBy)
        } else {
          this.invalidVersionMessage()
        }
      } else if (component === 'minor') {
        if (this.project.version.canIncreaseMinor(increaseBy)) {
          this.project.version.increaseMinor(increaseBy)
        } else {
          this.invalidVersionMessage()
        }
      } else {
        if (this.project.version.canIncreasePatch(increaseBy)) {
          this.project.version.increasePatch(increaseBy)
        } else {
          this.invalidVersionMessage()
        }
      }

      const packageFile = document.getText()

      const replacedFile = packageFile.replace(`"version": "${oldVersion}"`, `"version": "${this.project.version.toString()}"`)

      if (packageFile === replacedFile) {
        vscode.window.showErrorMessage(Strings.ERROR_PACKAGE_INVALID)
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
      vscode.window.showErrorMessage(Strings.ERROR_PACKAGE_INVALID)
    }
  }

  /**
   *
   * @param {string} component
   * @returns {Promise<string>}
   */
  async showIncreaseByInput(component) {
    let maxIncrease = 0

    if (component === 'major') {
      maxIncrease = this.project.version.maxIncreaseMajor()
    } else if (component === 'minor') {
      maxIncrease = this.project.version.maxIncreaseMinor()
    } else {
      maxIncrease = this.project.version.maxIncreasePatch()
    }

    return vscode.window.showInputBox({
      placeHolder: 'Increase by',
      title: `Increase ${component} version number`,
      prompt: `Value to increase by (min: 1, max: ${maxIncrease})`,
      validateInput: (value) => {
        const increaseBy = +value

        if (component === 'major') {
          if (increaseBy > 0 && this.project.version.canIncreaseMajor(increaseBy)) {
            return null
          } else {
            return Strings.ERROR_VERSION_RANGE_INVALID
          }
        } else if (component === 'minor') {
          if (increaseBy > 0 && this.project.version.canIncreaseMinor(increaseBy)) {
            return null
          } else {
            return Strings.ERROR_VERSION_RANGE_INVALID
          }
        } else {
          if (increaseBy > 0 && this.project.version.canIncreasePatch(increaseBy)) {
            return null
          } else {
            return Strings.ERROR_VERSION_RANGE_INVALID
          }
        }
      },
    })
  }

  noPackageMessage() {
    vscode.window.showInformationMessage(Strings.INFO_NO_PACKAGE)
  }

  hasPackage() {
    return this.project.hasPackage
  }
}

module.exports = { PackageInfo }
