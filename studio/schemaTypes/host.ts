import {defineField, defineType} from 'sanity'
import {UserIcon} from '@sanity/icons/User'

export const host = defineType({
  name: 'host',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name', maxLength: 64},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'photo',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', type: 'string', title: 'Alternative Text'})],
    }),
    defineField({name: 'isSuperhost', type: 'boolean', initialValue: false}),
    defineField({name: 'hostingSince', type: 'number', description: 'Year, e.g. 2019.', validation: (rule) => rule.integer().min(2008)}),
    defineField({name: 'bio', type: 'text', rows: 3}),
  ],
  preview: {select: {title: 'name', media: 'photo', superhost: 'isSuperhost'}, prepare: ({title, media, superhost}) => ({title, media, subtitle: superhost ? 'Superhost' : 'Host'})},
})
