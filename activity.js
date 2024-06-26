import { octokit } from './utils/github.js'
import { hours as cliHours, user } from './utils/cli.js'
import { getAuthenticatedUsername } from './utils/user.js'

async function fetchAllUserEventsWithinTimeframe (username, hours = cliHours) {
  // since needs to be in YYYY-MM-DDTHH:MM:SSZ
  const since = new Date(new Date() - (hours * 60 * 60 * 1000)).toISOString().split('.')[0] + 'Z'

  let events = []
  for await (const response of octokit.paginate.iterator(octokit.rest.activity.listEventsForAuthenticatedUser, {
    username,
    per_page: 100,
    // TODO: figure out why since is not working
    since,
    before: new Date().toISOString().split('.')[0] + 'Z'
  })) {
    events = events.concat(response.data)
  }
  return events
}

async function fetchUserActivity (username, hours = cliHours) {
  try {
    return fetchAllUserEventsWithinTimeframe(username, hours)
  } catch (error) {
    throw new Error(`Failed to fetch user activity for ${username}: ${error}`)
  }
}

function filterActivityForLastHours (activity, hours = cliHours) {
  const currentTime = new Date()
  const someHoursAgo = currentTime.getTime() - (hours * 60 * 60 * 1000)
  return activity.filter(event => new Date(event.created_at).getTime() > someHoursAgo)
}

function collectUniqueURLs (activity) {
  const uniqueURLs = new Set()
  activity.forEach(event => {
    const eventType = event.type
    if (eventType === 'IssuesEvent') {
      uniqueURLs.add(event.payload.issue.html_url.split('/issues')[0])
    } else if (eventType === 'PullRequestEvent') {
      uniqueURLs.add(event.payload.pull_request.html_url.split('/pull')[0])
    } else if (eventType === 'IssueCommentEvent') {
      uniqueURLs.add(event.payload.issue.html_url.split('/pull')[0].split('/issues')[0])
    } else if (eventType === 'PullRequestReviewCommentEvent') {
      uniqueURLs.add(event.payload.comment.html_url.split('#')[0])
    } else if (eventType === 'PullRequestReviewEvent') {
      uniqueURLs.add(event.payload.review.html_url.split('#')[0])
    } else if (eventType === 'PushEvent') {
      uniqueURLs.add(`https://github.com/${event.repo.name}`)
    } else if (eventType === 'WatchEvent') {
      // No specific URL associated with WatchEvent
    } else {
      if (process.env.DEBUG != null) {
        console.log('Unhandled event type:', eventType)
      }
    }
  })
  return Array.from(uniqueURLs)
}

function generateDailyActivityReport (username, activity, uniqueURLs) {
  let report = ''
  if (activity.length === 0) {
    report += 'No activity found in the given timeframe.'
  } else {
    // Group events by repository URL
    const eventsByURL = {}
    activity.forEach(event => {
      const eventType = event.type
      let eventURL = ''
      if (eventType === 'IssuesEvent') {
        eventURL = event.payload.issue.html_url.split('/issues')[0] // Extract repository URL
      } else if (eventType === 'PullRequestEvent') {
        eventURL = event.payload.pull_request.html_url.split('/pull')[0] // Extract repository URL
      } else if (eventType === 'IssueCommentEvent') {
        eventURL = event.payload.issue.html_url.split('/pull')[0].split('/issues')[0]
      } else if (eventType === 'PullRequestReviewCommentEvent') {
        eventURL = event.payload.comment.html_url.split('#')[0]
      } else if (eventType === 'PullRequestReviewEvent') {
        eventURL = event.payload.review.html_url.split('#')[0]
      } else if (eventType === 'PushEvent') {
        eventURL = `https://github.com/${event.repo.name}`
      } else if (eventType === 'WatchEvent') {
        // No specific URL associated with WatchEvent
      } else {
        if (process.env.DEBUG != null) {
          console.log('Unhandled event type:', eventType)
        }
      }
      if (eventURL) {
        if (!eventsByURL[eventURL]) {
          eventsByURL[eventURL] = []
        }
        eventsByURL[eventURL].push(event)
      }
    })

    // Generate report
    const earliestTime = new Date(activity[activity.length - 1].created_at).toUTCString()
    const latestTime = new Date(activity[0].created_at).toUTCString()
    uniqueURLs.forEach(url => {
      const eventsForURL = eventsByURL[url]
      if (eventsForURL != null && eventsForURL.length > 0) {
        const newEvents = []
        eventsForURL.forEach(event => {
          const eventType = event.type
          let eventDetails = ''
          if (eventType === 'IssuesEvent' && (event.payload.issue.html_url.split('/issues')[0] === url || event.payload.issue.html_url === url)) {
            const issueEventType = event.payload.action
            const issueEventTypeLabel = issueEventType.charAt(0).toUpperCase() + issueEventType.slice(1)

            eventDetails = `${issueEventTypeLabel} Issue: ${event.payload.issue.html_url}`
          } else if (eventType === 'PullRequestEvent' && (event.payload.pull_request.html_url.split('/pull')[0] === url || event.payload.pull_request.html_url === url)) {
            const prEventType = event.payload.action
            const prEventTypeLabel = prEventType.charAt(0).toUpperCase() + prEventType.slice(1)
            eventDetails = `${prEventTypeLabel} Pull Request: ${event.payload.pull_request.html_url}`
          } else if (eventType === 'IssueCommentEvent' && event.payload.issue.html_url.split('/pull')[0].split('/issues')[0] === url) {
            eventDetails = `Commented on Issue: ${event.payload.issue.html_url}`
          } else if (eventType === 'PullRequestReviewCommentEvent' && event.payload.comment.html_url === url) {
            eventDetails = `Commented on Pull Request: ${event.payload.comment.html_url}`
          } else if (eventType === 'PullRequestReviewEvent' && event.payload.review.html_url === url) {
            eventDetails = `Reviewed Pull Request: ${event.payload.review.html_url}`
          } else if (eventType === 'PushEvent' && url.includes(event.repo.name)) {
            // eventDetails = `Pushed to ${event.repo.name} ${event.payload.ref.substring(11)}`
          } else if (eventType === 'WatchEvent') {
            // No specific URL associated with WatchEvent
          }
          if (eventDetails !== '') {
            // const eventTime = new Date(event.created_at).toUTCString()
            newEvents.push(`- ${eventDetails} \n`)
          }
        })
        // check newEvents for duplicate URLS in the newEvents string and remove duplicates and add a count
        const uniqueEventUrls = new Set()
        const filteredNewEvents = newEvents.filter((event, index, self) => {
          const urlForItem = `https://github.com${event.split('https://github.com')[1]}`
          if (uniqueEventUrls.has(urlForItem)) {
            return false
          }
          uniqueEventUrls.add(urlForItem)
          return true
        })

        if (filteredNewEvents.length > 0) {
          report += `Activities for ${url}:\n`
          report += filteredNewEvents.join('') + '\n'
        }
      }
    })
  }
  let hoursWorkedLabel = ''
  if (activity[0]?.created_at != null && activity[activity.length - 1]?.created_at != null) {
    const hoursWorked = ((new Date(activity[0].created_at) - new Date(activity[activity.length - 1].created_at)) / 1000 / 60 / 60).toPrecision(2)
    hoursWorkedLabel = ` (covering ${hoursWorked} hours)`
  }

  return `Activity Report for ${username}${hoursWorkedLabel}:\n${report}`
}

async function main (username) {
  try {
    const activity = await fetchUserActivity(username)
    const filteredActivity = filterActivityForLastHours(activity)
    const uniqueURLs = collectUniqueURLs(filteredActivity)
    const report = generateDailyActivityReport(username, filteredActivity, uniqueURLs)
    console.log(report)
  } catch (error) {
    console.error('could not run activity: ', error)
  }
}


const githubUsername = await new Promise((resolve, reject) => {
  if (user != null) {
    resolve(user)
    return
  }
  try {
    resolve(getAuthenticatedUsername())
  } catch (error) {
    reject(error)
  }
})

main(githubUsername)
