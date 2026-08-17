/** Conventional Commits — see CLAUDE.md §5.5 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      [
        'repo', 'infra', 'docs', 'ci',
        'api', 'admin-web', 'mobile',
        'shared-types', 'zatca-ubl', 'ledger', 'ui-tokens',
        'identity', 'organizations', 'vehicles', 'work-orders', 'invoicing',
        'payments', 'escrow', 'promissory-notes', 'notifications', 'disputes',
        'parts', 'distributors', 'logistics', 'fleet', 'integrations',
      ],
    ],
    'subject-case': [0],
    'body-max-line-length': [0],
  },
};
