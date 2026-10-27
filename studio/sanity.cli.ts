import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'a4so5rrr',
    dataset: 'production'
  },
  studioHost: 'roam-rentals-a4so5rrr',
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    appId: 'xf0eqi399dwezed1z1lfvibj',
    autoUpdates: true,
  },
})
