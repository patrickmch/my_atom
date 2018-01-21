_ = require 'underscore-plus'
{CompositeDisposable} = require 'atom'

# Utils
# -------------------------
AllPanelDirections = ['up', 'down', 'left', 'right']
AllDockDirections = ['down', 'left', 'right']

oppositeDirection =
  up: 'down'
  down: 'up'
  left: 'right'
  right: 'left'

getView = (model) -> atom.views.getView(model)

getCenterWorkspace = -> atom.workspace.getCenter?() ? atom.workspace

translateDirection = (direction, capitalize) ->
  translated = switch direction
    when 'up' then 'top'
    when 'down' then 'bottom'
    else direction

  if capitalize
    _.capitalize(translated)
  else
    translated

getVisiblePanelInDirection = (direction) ->
  methodName = "get#{translateDirection(direction, true)}Panels"
  visiblePanels = atom.workspace[methodName]().filter((panel) -> panel.isVisible)
  switch direction
    when 'up', 'left' then _.last(visiblePanels)
    when 'down', 'right' then _.first(visiblePanels)

getNonEmptyDockInDirection = (direction) ->
  # Dock feature is from Atom v1.17
  return unless atom.workspace.getBottomDock?
  return unless direction in AllDockDirections

  methodName = "get#{translateDirection(direction, true)}Dock"
  dock = atom.workspace[methodName]()
  if dock.getPaneItems().length
    dock
  else
    null

focusPaneCommandsByDirection =
  up: 'window:focus-pane-above'
  down: 'window:focus-pane-below'
  left: 'window:focus-pane-on-left'
  right: 'window:focus-pane-on-right'

focusPaneInDirection = (direction) ->
  success = false
  disposable = atom.workspace.onDidChangeActivePane -> success = true
  atom.commands.dispatch(getView(atom.workspace), focusPaneCommandsByDirection[direction])
  disposable.dispose()
  success

focusPanelInDirection = (direction) ->
  success = false
  if panel = getVisiblePanelInDirection(direction)
    panel.getItem().focus?()
    success = true
  success

focusDockInDirection = (direction) ->
  success = false
  if dock = getNonEmptyDockInDirection(direction)
    dock.activate()
    success = true
  success

getFocusedDirection = (direction) ->
  activeElement = document.activeElement

  for direction in AllPanelDirections
    panelContainer = atom.workspace.panelContainers[translateDirection(direction)]
    if getView(panelContainer).contains(activeElement)
      return direction

  for direction in AllDockDirections
    dock = getNonEmptyDockInDirection(direction)
    if dock?.getElement().contains(activeElement)
      return direction
  null

# Main
# -------------------------
module.exports =
  activate: ->
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.commands.add 'atom-workspace',
      'focus-pane-or-panel:focus-above': => @focusPaneOrPanel('up')
      'focus-pane-or-panel:focus-below': => @focusPaneOrPanel('down')
      'focus-pane-or-panel:focus-on-left': => @focusPaneOrPanel('left')
      'focus-pane-or-panel:focus-on-right': => @focusPaneOrPanel('right')

  deactivate: ->
    @subscriptions?.dispose()

  focusPaneOrPanel: (direction) ->
    centerContainerElement = getView(getCenterWorkspace().getActivePane().getContainer())
    if centerContainerElement.contains(document.activeElement)
      focusPaneInDirection(direction) or
        focusPanelInDirection(direction) or
        focusDockInDirection(direction)
    else
      focusedDirection = getFocusedDirection()
      if focusedDirection? and oppositeDirection[focusedDirection] is direction
        getCenterWorkspace().getActivePane().activate()
