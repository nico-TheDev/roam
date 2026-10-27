import {defineField, defineType} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {POLICY_KINDS} from './amenities'

export const policy = defineType({
  name: 'policy',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title', maxLength: 64},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'kind',
      type: 'string',
      options: {list: [...POLICY_KINDS], layout: 'radio'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'summary',
      type: 'string',
      description: 'The one line a card shows, e.g. "Full refund up to 7 days before check-in."',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'body',
      type: 'text',
      rows: 8,
      description: 'Shown and quoted word for word in answers.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'refundWindowDays',
      type: 'number',
      description: 'Full refund up to this many days before check-in.',
      hidden: ({parent}) => parent?.kind !== 'cancellation',
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'summary'}},
})
