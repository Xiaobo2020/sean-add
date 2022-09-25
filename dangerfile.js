const { fail, danger } = require('danger');
const {
  jsLockfile,
  commonPrDescription,
} = require('danger-plugin-toolbox');
const { 
  prAuthor, 
  prDescription, 
  inCommitGrep
} = require('danger-plugin-toolbox/dist/rules/helpers');

const {
  git: { commits, created_files: createdFiles, modified_files: modifiedFiles },
  github: {
    pr: {
      base: { sha: baseSHA }
    },
    utils: { createOrAddLabel }
  },
} = danger;

const fileChanges = [...modifiedFiles, ...createdFiles];

const botAuthors = ['WikiStudy2020'];
const prAuthorIsBot = botAuthors.includes(prAuthor);

/**
 * @jsLockfile
 * if dependencies change, 'package-lock.json' also must be updated.
 */
jsLockfile();

/**
 * @commonPrDescription
 * check there is a description for internal or external contributions
 */
commonPrDescription({
  minLength: 50,
  logType: 'message',
  msg: 'Please provide more context about your PR that other engineers, or your future self, would find useful.'
});

/**
 * @reviewedByAuthor
 * hard fail if PR author has not reviewed their code
 */
const prAuthorSelfReviewed = () => {
  const PR_SELF_REVIEW_CHECK = 'Code has been reviewed by the author';
  const hasPrAuthorSelfReviewed = prDescription.includes(`[x] ${PR_SELF_REVIEW_CHECK}`);
  if (!hasPrAuthorSelfReviewed && !prAuthorIsBot) {
    fail(
      `\`${PR_SELF_REVIEW_CHECK}\` is unchecked in the PR description.\n\n` +
      "* Please ensure you have read through your code changes in 'Files changed' _before_ asking others to review your PR. " +
      "This helps catch obvious errors and typos, which avoids wasting your time and the reviewer's time, and ultimately allows us to " +
      'ship product changes more quickly.\n\n* Please also take this opportunity to annotate your PR with GitHub comments to explain ' +
      'any complex logic or decisions that you have made. This helps the reviewer understand your PR and speed up the review process.\n\n' +
      `Once you've done this, check \`${PR_SELF_REVIEW_CHECK}\` in the PR description to make this Danger step pass.`,
    );
  }
};
prAuthorSelfReviewed();

/**
 * @testedInBrowser
 * hard fail if PR author has not manually tested their changes when source files have been modified
 */
const MANUAL_TEST_CHECK = 'Manually tested in a web browser';
const hasBeenManuallyTested = prDescription.includes(`[x] ${MANUAL_TEST_CHECK}`);
const hasSourceFileChanges = inCommitGrep(/src\/.*.(?<!test.)(js|ts|jsx|tsx)$/);
if (hasSourceFileChanges && !hasBeenManuallyTested && !prAuthorIsBot) {
  fail(
    `\`${MANUAL_TEST_CHECK}\` is unchecked in the PR description when source files have been modified.\n\n` +
    '* Please ensure you have manually tested your change in a web browser.\n\n* Preferably, also manually test the full search flow.\n\n' +
    '* This helps prevent bugs that automated tests miss from reaching production. Ultimately, this saves travellers from ' +
    'suffering a degraded experience and saves us from wasting time in incidents/ILDs that could be avoided.\n\n' +
    "* Manual testing is _not_ a substitute for automated testing - if you've made logic changes, please ensure they are covered by tests.\n\n" +
    `Once you've done this, check \`${MANUAL_TEST_CHECK}\` in the PR description to make this Danger step pass.`,
  );
}

/**
 * @syncTestFiles
 * Hard fail if source files have been modified, but not test files
 */
const AUTOMATED_TEST_CHECK = 'Automated tests added/updated';
const hasUpdatedAutomatedTests = prDescription.includes(`[x] ${AUTOMATED_TEST_CHECK}`);
const hasTestFileChanges = inCommitGrep(/src\/.*test.*(js|ts|jsx|tsx)$/);
if (hasSourceFileChanges && !hasTestFileChanges && !hasUpdatedAutomatedTests && !prAuthorIsBot) {
  fail(
    'Source files have been modified, but no test files have been added or modified.\n\n' +
      "If you've made logic changes, please ensure they are covered by automated tests.\n\n" +
      `Once you've done this, check \`${AUTOMATED_TEST_CHECK}\` in the PR description to make this Danger step pass.`,
  );
}

/**
 * @skipPRSize
 * Encourage smaller PRs.
 */
const SKIP_BIG_PR_FAIL_CHECK = 'Skip PR size check';
const SKIP_BIG_PR_FAIL = prDescription.includes(`[x] ${SKIP_BIG_PR_FAIL_CHECK}`);
const bigPRThreshold = 25;
if (!SKIP_BIG_PR_FAIL && fileChanges.length > bigPRThreshold) {
  fail(
    `This PR contains ${fileChanges.length} files (${createdFiles.length} new, ${modifiedFiles.length} modified). Consider splitting it into multiple PRs. Otherwise toggle the danger check \`${SKIP_BIG_PR_FAIL_CHECK}\` in the PR template`,
  );
}
