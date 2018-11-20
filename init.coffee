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
# atom.packages.onDidActivatePackage (p) ->
#   if gitPlus = atom.packages.getActivePackage('git-plus')?.mainModule.provideService()
#     gitPlus.registerCommand 'atom-text-editor', 'custom-git-commands:reset-add-local.py', ->
#       gitPlus.getRepo() # If there are multiple repos in the project, you will be prompted to select which to use
#       .then (repo) -> gitPlus.run repo, 'reset nols_website/nols_website/settings/local.py'

# Adds space chars without moving the cursor
atom.commands.add 'atom-text-editor',
  'custom:insert-space-keep-cursor-place': ->
    editor = atom.workspace.getActiveTextEditor()
    currentPosition = editor.getCursorBufferPosition()
    editor.insertText('\u0020')
    editor.setCursorBufferPosition(currentPosition)


atom.commands.add 'atom-text-editor',
  'custom:insert-newline-keep-cursor-place': ->
    editor = atom.workspace.getActiveTextEditor()
    currentPosition = editor.getCursorBufferPosition()
    editor.moveToEndOfLine()
    editor.insertText('\n')
    editor.deleteToBeginningOfLine()
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


atom.commands.add 'atom-workspace', 'my:dismiss-notifications', ->
  atom.notifications.getNotifications().forEach (notification) ->
    notification.dismiss()
  atom.notifications.clear()

fs = require('fs')
projectsFile = '/Users/mchey/projects.json'

atom.commands.add 'atom-workspace', 'my:get-file-paths', ->
  jsonData = fs.readFile projectsFile, (err, data)->
    filePaths = []
    pathRegEx = ///^\/(.+)\/([^\/]+)$///i
    atom.project.buffers.forEach (editorWindow) ->
      filePath = editorWindow.file.path
      if filePath isnt undefined && filePath.match(pathRegEx) isnt null
        filePaths.push(filePath)
    json = JSON.parse(data)
    branchName = atom.project.repositories[0].branch.split('/')[2]
    # did this so that we can use the object literal branchName as a key instead of 'branchName'
    project = JSON.parse('{"' + branchName + '":' + '{"paths":["' + filePaths + '"]}' + '}')
    # this converts the paths back to an array: they get smooshed in to one because of the line above
    project[branchName].paths = project[branchName].paths[0].split(',')
    json.push(project)
    fs.writeFile projectsFile, JSON.stringify(json, null, '\t')

atom.commands.add 'atom-workspace', 'my:open-my-project', ->
  jsonData = fs.readFile projectsFile, (err, data)->
    element = document.createElement 'div'
    element.classList.add 'select-list'

    listSelect = document.createElement 'ol'
    listSelect.textContent = 'allo guv'
    listSelect.classList.add 'list-select'
    element.appendChild listSelect

    # json = JSON.parse(data)
    # stuff = json.keys()
    # json.forEach (obj) ->
      # listItem = document.createElement 'li'
      # console.log obj['hello-to-you']
      # listItem.textContent = k
      # listItem.classList.add 'open-project-li'
      # listSelect.appendChild listItem

    modalPanel = atom.workspace.addModalPanel {
        item: element,
        visible: false
    }
    if modalPanel.isVisible() then modalPanel.hide() else modalPanel.show()
