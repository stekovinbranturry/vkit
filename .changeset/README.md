# Changesets

This monorepo uses [Changesets](https://github.com/changesets/changesets) to version and publish packages.

When your PR includes user-facing changes to `vtools-core` or `vtools`, add a changeset:

```sh
pnpm changeset
```

Follow the prompts, commit the generated `.changeset/*.md` file with your PR.

After merge to `main`, CI opens a **Version Packages** PR. Merging that PR publishes to npm.
