### Get a list of PRs that need reviewed

```
gh search prs --state=open --review-requested=@me --json number,title,labels,updatedAt,url,repository,author --template '{{tablerow "URL" "AUTHOR" "TITLE" "UPDATED" }}{{range .}}{{tablerow .url .author.login .title (timeago .updatedAt)}}{{end}}' | cat
```


### Aliases


#### See all reviews with `gh reviews`

```
gh alias set reviews 'search prs --state=open --review-requested=@me --json number,title,labels,updatedAt,url,repository,author --template '\''{{tablerow "URL" "AUTHOR" "TITLE" "UPDATED" }}{{range .}}{{tablerow .url .author.login .title (timeago .updatedAt)}}{{end}}'\'''
```

#### See open PRs with `gh prs-open`
```
gh alias set 'prs-open' 'search prs --state=open --author sgtpooki --json number,title,labels,updatedAt,url,repository,author --template '\''{{tablerow "URL" "TITLE" "UPDATED" }}{{range .}}{{tablerow .url .title (timeago .updatedAt)}}{{end}}'\'''
```

#### See issues that need triaged with `gh issue triage`

```
gh alias set 'issue triage' 'search issues --owner ipfs,libp2p,ipfs-shipyard -- label:need/triage'
```

