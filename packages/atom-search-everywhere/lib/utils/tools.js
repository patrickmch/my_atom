'use babel';
import os from 'os';
import fs from 'fs';
import path from 'path';

export function isGitRepo(rootPath) {
    return atom.project.getRepositories().some((repo) => {
        if (rootPath && repo) {
            const repoPath = fs.realpathSync(path.normalize(repo.getWorkingDirectory()));
            const projectPath = fs.realpathSync(path.normalize(rootPath));
            return projectPath.startsWith(repoPath);
        } else {
            return false;
        }
    });
}

export function openFile(filePath, line, column) {
    if (!filePath) {
        return;
    }
    return atom.workspace.open(filePath, {initialLine: line, initialColumn: column})
    .then(function(editor) {
        const editorElement = atom.views.getView(editor);
        const { top } = editorElement.pixelPositionForBufferPosition(editor.getCursorBufferPosition());
        return editorElement.setScrollTop(top - (editorElement.getHeight() / 2));
    });
}


export function getProjectPath() {
    const homeDir = os.homedir();
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor) {
        return atom.project.getPaths()[0] || homeDir;
    }
    if (editor.getPath()) {
        return atom.project.relativizePath(editor.getPath())[0] || path.dirname(editor.getPath());
    } else {
        return atom.project.getPaths()[0] || homeDir;
    }
}

export function getWordUnderCursor() {
    const editor  = atom.workspace.getActivePaneItem();
    let pattern = editor || editor.getSelectedText();
    pattern = editor != null ? editor.getSelectedText() : "";
    if (pattern === "") {
        pattern = editor != null ? editor.getWordUnderCursor() : "";
    }
    return pattern;
}
