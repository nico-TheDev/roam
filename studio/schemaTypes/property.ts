import {defineArrayMember, defineField, defineType} from 'sanity'
import {HomeIcon} from '@sanity/icons/Home'
import {AMENITIES, CATEGORIES} from './amenities'

export const property = defineType({
  name: 'property',
  type: 'document',
  icon: HomeIcon,
  groups: [
    {name: 'basics', title: 'Basics', default: true},
    {name: 'filters', title: 'Search filters'},
    {name: 'text', title: 'Descriptive text'},
    {name: 'policies', title: 'Host and policies'},
  ],
  fields: [
    defineField({name: 'title', type: 'string', group: 'basics', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'basics',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'images',
      type: 'array',
      group: 'basics',
      description: 'The first image is the cover.',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', type: 'string', title: 'Alternative Text'})],
        }),
      ],
      validation: (rule) => rule.required().min(5),
    }),
    defineField({
      name: 'rating',
      type: 'number',
      group: 'basics',
      validation: (rule) => rule.required().min(0).max(5),
    }),
    defineField({
      name: 'reviewCount',
      type: 'number',
      group: 'basics',
      validation: (rule) => rule.required().integer().min(0),
    }),

    defineField({
      name: 'category',
      type: 'string',
      group: 'filters',
      options: {list: [...CATEGORIES], layout: 'radio'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'location',
      type: 'object',
      group: 'filters',
      fields: [
        defineField({name: 'city', type: 'string', validation: (rule) => rule.required()}),
        defineField({
          name: 'state',
          type: 'string',
          description: 'Two-letter code, e.g. CA.',
          validation: (rule) => rule.required().length(2).uppercase(),
        }),
        defineField({name: 'country', type: 'string', initialValue: 'US', validation: (rule) => rule.required()}),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'coordinates', type: 'geopoint', group: 'filters'}),
    defineField({
      name: 'nightlyPrice',
      type: 'number',
      group: 'filters',
      description: 'USD per night.',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({name: 'cleaningFee', type: 'number', group: 'filters', description: 'USD, once per stay.', validation: (rule) => rule.min(0)}),
    defineField({
      name: 'minNights',
      type: 'number',
      group: 'filters',
      initialValue: 1,
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({
      name: 'maxGuests',
      type: 'number',
      group: 'filters',
      validation: (rule) => rule.required().integer().min(1),
    }),
    defineField({name: 'bedrooms', type: 'number', group: 'filters', validation: (rule) => rule.integer().min(0)}),
    defineField({name: 'beds', type: 'number', group: 'filters', validation: (rule) => rule.integer().min(1)}),
    defineField({name: 'bathrooms', type: 'number', group: 'filters', validation: (rule) => rule.min(0.5)}),
    defineField({
      name: 'petsAllowed',
      type: 'boolean',
      group: 'filters',
      initialValue: false,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'amenities',
      type: 'array',
      group: 'filters',
      description: 'The first four are the stay’s highlights.',
      of: [defineArrayMember({type: 'string'})],
      options: {list: [...AMENITIES]},
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'checkInTime',
      type: 'string',
      group: 'filters',
      description: '24-hour, e.g. 15:00.',
      validation: (rule) => rule.regex(/^([01]\d|2[0-3]):[0-5]\d$/, {name: 'HH:MM'}),
    }),
    defineField({
      name: 'checkOutTime',
      type: 'string',
      group: 'filters',
      description: '24-hour, e.g. 11:00.',
      validation: (rule) => rule.regex(/^([01]\d|2[0-3]):[0-5]\d$/, {name: 'HH:MM'}),
    }),

    defineField({
      name: 'summary',
      type: 'text',
      rows: 3,
      group: 'text',
      description:
        'One or two sentences in a guest’s words (quiet, cozy, secluded...). Embeddings read this, so soft qualities belong here and not in tags.',
      validation: (rule) => rule.required().max(300),
    }),
    defineField({
      name: 'vibeNotes',
      type: 'array',
      group: 'text',
      description:
        'Plain facts about how the stay feels and what surrounds it, one per line. Generated copy may use these and the typed fields, nothing else.',
      of: [defineArrayMember({type: 'string', validation: (rule) => rule.max(140)})],
      validation: (rule) => rule.min(3).max(6),
    }),
    defineField({name: 'description', type: 'text', rows: 8, group: 'text', validation: (rule) => rule.required()}),
    defineField({name: 'neighborhood', type: 'text', rows: 5, group: 'text', description: 'The area and what is good to know.', validation: (rule) => rule.required()}),

    defineField({
      name: 'copyFactsHash',
      type: 'string',
      group: 'text',
      readOnly: true,
      description: 'Hash of the facts the current generated copy was written from. Set by the copy script.',
    }),

    defineField({
      name: 'host',
      type: 'reference',
      group: 'policies',
      to: [{type: 'host'}],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'cancellationPolicy',
      type: 'reference',
      group: 'policies',
      to: [{type: 'policy'}],
      options: {filter: 'kind == "cancellation"'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'policies',
      type: 'array',
      group: 'policies',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'policy'}],
          options: {filter: 'kind != "cancellation"'},
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'title', city: 'location.city', state: 'location.state', price: 'nightlyPrice', media: 'images.0'},
    prepare: ({title, city, state, price, media}) => ({title, media, subtitle: `${city}, ${state} · $${price}/night`}),
  },
})
