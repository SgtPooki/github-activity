/* eslint-disable no-console */
import { Octokit } from '@octokit/rest'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

// @ts-check
// Create a custom Octokit with retry and throttling plugins
const MyOctokit = Octokit.plugin(retry, throttling)

export const octokit = new MyOctokit({
  auth: process.env.GITHUB_TOKEN,
  throttle: {
    onRateLimit: (retryAfter, options, octokit) => {
      octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
      if (options.request.retryCount === 0) { // only retries once
        console.log(`Retrying after ${retryAfter} seconds!`);
        return true;
      }
    },
    onSecondaryRateLimit: (retryAfter, options, octokit) => {
      // does not retry, only logs a warning
      octokit.log.warn(`Secondary rate limit hit for request ${options.method} ${options.url}`);
    },
    onAbuseLimit: (retryAfter, options) => {
      // does not retry, only logs a warning
      console.warn(`Abuse detected for request ${options.method} ${options.url}`)
    }
  },
  retry: {
    doNotRetry: ["429"],
  },
});
