// backend/utils/github.js

const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const [owner, repo] = process.env.GITHUB_REPO.split('/');
const branch = process.env.GITHUB_BRANCH || 'main';
const imagesDir = process.env.GITHUB_DIR || 'images';

/**
 * Uploads an image to GitHub.
 * @param {string} filename - The name of the file.
 * @param {Buffer} content - The file content as a buffer.
 * @returns {string} - The URL of the uploaded image.
 */
const uploadImageToGitHub = async (filename, content) => {
  try {
    // Check if the file already exists to avoid conflicts
    let sha;
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner,
        repo,
        path: `${imagesDir}/${filename}`,
        ref: branch,
      });
      sha = existingFile.sha;
    } catch (error) {
      if (error.status === 404) {
        // File does not exist, proceed to create
        sha = undefined;
      } else {
        throw error;
      }
    }

    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `${imagesDir}/${filename}`,
      message: `Upload image ${filename}`,
      content: Buffer.from(content).toString('base64'),
      branch,
      sha, // Required for updates; omit for new files
    });

    // Construct the raw file URL
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${imagesDir}/${filename}`;
  } catch (error) {
    console.error('Error uploading image to GitHub:', error);
    throw new Error('Failed to upload image.');
  }
};

module.exports = { octokit, owner, repo, branch, imagesDir, uploadImageToGitHub };
