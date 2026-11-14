const types = [
  { type: 'feat', section: 'Fonctionnalités' },
  { type: 'fix', section: 'Corrections' },
  { type: 'patch', section: 'Correctifs' },
  { type: 'update', section: 'Mises à jour' },
  { type: 'chore', section: 'Maintenance' },
  { type: 'docs', section: 'Documentation' },
  { type: 'perf', section: 'Performances' },
  { type: 'refactor', section: 'Refactorisation' },
  { type: 'style', section: 'Style' },
  { type: 'test', section: 'Tests' },
  { type: 'build', section: 'Build' },
  { type: 'ci', section: 'Intégration continue' },
  { type: 'revert', section: 'Annulations' },
];

module.exports = {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', {
      preset: 'conventionalcommits',
      releaseRules: [
        { breaking: true, release: 'major' },
        ...types.map(({ type }) => ({ type, release: type === 'feat' ? 'minor' : 'patch' })),
      ],
    }],
    ['@semantic-release/release-notes-generator', {
      preset: 'conventionalcommits',
      presetConfig: { types: types.map(type => ({ ...type, hidden: false })) },
    }],
    ['@semantic-release/npm', { npmPublish: false }],
    ['@semantic-release/exec', {
      prepareCmd: 'npm run build && tar -czf restaurant-xyz-${nextRelease.gitTag}.tar.gz -C dist .',
    }],
    ['@semantic-release/github', {
      assets: [{ path: 'restaurant-xyz-*.tar.gz', label: 'Application de production' }],
      successComment: false,
      failComment: false,
      failTitle: false,
      releasedLabels: false,
    }],
  ],
};
