## 1.0.1
* Optimize the input when the input interval is too short.
* Fix bug of cancelled searcher will affect the view.
* Fix bug that the callback was not executed when the grep process was killed
## 1.0.0
* Add `builtin` searcher, Use the built-in search API of atom.
* When searching, it will intelligently detect the appropriate searcher. The default detection order is `gitgrep, grep, builtin`.
* Fix the problem of detecting git repository under Windows.
* Fix the problem of detecting git repository under symbolic links.
* Fix some bugs.

## Older
* This project was converted from https://github.com/geksilla/atom-fuzzy-grep.
* Fix the problem of searching for non-ASCII characters such as Chinese.
