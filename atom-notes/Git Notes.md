Just Some Notes on Git For My Ongoing Edification

Will show you your first stash in Atom (changing the zero to higher goes back further in time with stashes)
$ git stash show -p stash@{0} >~/.diff && Atom ~/.diff

Use git --force-with-lease instead of normal force. See [this article from Atlassian][2b859efa]






  [2b859efa]: https://developer.atlassian.com/blog/2015/04/force-with-lease/ "Git --force-with-lease"
