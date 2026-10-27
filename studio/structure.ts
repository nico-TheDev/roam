import type {StructureResolver} from 'sanity/structure'
import {HomeIcon} from '@sanity/icons/Home'
import {UserIcon} from '@sanity/icons/User'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Roam')
    .items([
      S.documentTypeListItem('property').title('Stays').icon(HomeIcon),
      S.documentTypeListItem('host').title('Hosts').icon(UserIcon),
      S.documentTypeListItem('policy').title('Policies').icon(DocumentTextIcon),
    ])
