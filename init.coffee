# Your init script
#
# Atom will evaluate this file each time a new window is opened. It is run
# after packages are loaded/activated and after the previous editor state
# has been restored.
#
# An example hack to log to the console when each text editor is saved.
#
# atom.workspace.observeTextEditors (editor) ->
#   editor.onDidSave ->
#     console.log "Saved! #{editor.getPath()}"
# atom.commands.add '.tree-view', 'custom:expand-item-down': ->
#   fs = require 'fs'
#   for panel in atom.workspace.getLeftPanels()
#     if panel.item.constructor.name == "TreeView"
#       atom.commands.dispatch(panel.item.element, 'core:move-down')
#       console.log('test')
#       if fs.lstatSync(panel.item.selectedPath).isDirectory()
#         return
#       else
#         panel.item.openSelectedEntry(pending: true, activatePane: false)
#         return
# atom.commands.add '.tree-view', 'custom:expand-item-up': ->
#   fs = require 'fs'
#   for panel in atom.workspace.getLeftPanels()
#     if panel.item.constructor.name == "TreeView"
#       atom.commands.dispatch(panel.item.element, 'core:move-up')
#       console.log('test')
#       if fs.lstatSync(panel.item.selectedPath).isDirectory()
#         return
#       else
#         panel.item.openSelectedEntry(pending: true, activatePane: false)
#         return

# Adds space chars without moving the cursor
atom.commands.add 'atom-text-editor',
  'custom:insert-space-keep-cursor-place': ->
    editor = atom.workspace.getActiveTextEditor()
    currentPosition = editor.getCursorBufferPosition()
    editor.insertText('\u0020')
    editor.setCursorBufferPosition(currentPosition)

atom.commands.add 'atom-text-editor',
  'custom:insert-tab-keep-cursor-place': ->
    editor = atom.workspace.getActiveTextEditor()
    currentPosition = editor.getCursorBufferPosition()
    editor.insertText('\u0020\u0020\u0020\u0020')
    editor.setCursorBufferPosition(currentPosition)

# Better support for indent (from https://github.com/atom/atom/pull/9104)
atom.commands.add 'atom-text-editor', 'my:move-line-up', ->
  editor = atom.workspace.getActiveTextEditor()
  if atom.config.get('editor.autoIndent')
    atom.config.set('editor.autoIndent', false)
    editor.moveLineUp()
    atom.config.set('editor.autoIndent', true)
  else
    editor.moveLineUp()

atom.commands.add 'atom-text-editor', 'my:move-line-down', ->
  editor = atom.workspace.getActiveTextEditor()
  if atom.config.get('editor.autoIndent')
    atom.config.set('editor.autoIndent', false)
    editor.moveLineDown()
    atom.config.set('editor.autoIndent', true)
  else
    editor.moveLineDown()
