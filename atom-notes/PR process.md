# Pull Request Process

- checkout develop
- pull
- checkout whatever_your_branch_is
- git rebase develop
- if whatever_your_branch_is is on the repo:
  - delete it from the repo (git push origin --delete whatever_your_branch_is)
  - rename whatever_your_branch_is (git branch -m whatever_your_branch_is_2)
- git push --set-upstream origin whatever_your_branch_is_2
