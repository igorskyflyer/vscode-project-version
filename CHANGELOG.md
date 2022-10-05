# Changelog

<br>

## 1.4.3

- fixes an error that occurs when there is no workspace, [#30](https://github.com/igorskyflyer/vscode-project-version/issues/30).

<br>

## 1.4.2

- major code refactor, improved performance,
- limited max length for version increment in InputBox,
- prevented losing project's `package.json` path when configuration changes,
- removed redundant code,
- improved `package.json` file detection in workspace (using `RelativePattern` glob matching).

<br>

## 1.4.1

- removed redundant `node_modules` package and decreased the extension size by ~37% 🚀,
- updated extension's README with easier functionality intro.
- regular maintenance release,

<br>

## 1.4.0

- added the ability to programmatically bump your `package.json` version, now by an arbitrary number, open `Command Palette` and search for `"Project version increase by..."`, made possible by the upgraded [@igor.dvlpr/keppo](https://www.npmjs.com/package/@igor.dvlpr/keppo) library,
- upgraded internal dependencies:
  - upgraded vscode to v1.71.0,
  - upgraded esbuild to v0.15.7.
- internal refactor for better UX.

<br>

## 1.3.0

- added the ability to programmatically bump your `package.json` version, open `Command Palette` and search for `"Project version increase"`, made possible by:
  - [@igor.dvlpr/keppo](https://www.npmjs.com/package/@igor.dvlpr/keppo) - a library that allows you to parse, manage, compare and output SemVer-compatible version numbers,
- upgraded VS Code to v1.70,
- upgraded esbuild,
- added the auto save on version change setting,
- upgraded dependencies,
- minor refactor.

<br>

## 1.2.1

- minor UX changes

<br>

## 1.2.0

- added hot-reload when changing Settings

<br>

## 1.1.0

- added statusbar item alignment and priority ([#4](https://github.com/igorskyflyer/vscode-project-version/issues/4)),
- upgraded internal dependencies which brings performance gain.

<br>

## 1.0.1

- maintenance

<br>

## 1.0.0

- Initial release 🕺
