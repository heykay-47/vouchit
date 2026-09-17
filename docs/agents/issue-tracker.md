# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply/remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

The repository is `heykay-47/vouchit`. The `gh` CLI also infers it from `git remote -v`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When enabled, PRs use the equivalent `gh pr` commands and the same triage labels. External PRs are those whose `authorAssociation` is `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE`.

GitHub shares one number space across issues and PRs. Resolve an ambiguous `#42` with `gh pr view 42`, falling back to `gh issue view 42`.

## Skill operations

- **Publish to the issue tracker**: create a GitHub issue.
- **Fetch a ticket**: run `gh issue view <number> --comments`.
- **Wayfinder map**: one issue labelled `wayfinder:map`, with linked child issues.
- **Child tickets**: use GitHub sub-issues where available; otherwise use a task list and `Part of #<map>`.
- **Blocking**: use native issue dependencies where available; otherwise add `Blocked by: #<n>`.
- **Claim**: `gh issue edit <n> --add-assignee @me`.
- **Resolve**: comment with the answer, close the issue, and update the map's decisions.
