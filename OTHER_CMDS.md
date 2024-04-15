### Get a list of PRs that need reviewed

```
gh search prs --state=open --review-requested=@me --json number,title,labels,updatedAt,url,repository,author --template '{{tablerow "URL" "AUTHOR" "TITLE" "UPDATED" }}{{range .}}{{tablerow .url .author.login .title (timeago .updatedAt)}}{{end}}' | cat
```
