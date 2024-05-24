import { octokit as globalOctokit } from './github.js'

export async function getAuthenticatedUsername(octokit = globalOctokit) {
  try {
    const { data } = await octokit.rest.users.getAuthenticated()
    return data.login
  } catch (error) {
    console.error("Error fetching authenticated user:", error)
    throw error
  }
}
