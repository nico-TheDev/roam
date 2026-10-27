// Fixed list shared by the schema field and the seed. Order on a stay matters: the first four are its highlights.
export const AMENITIES = [
  {title: 'Hot Tub', value: 'hot-tub'},
  {title: 'Pool', value: 'pool'},
  {title: 'Fireplace', value: 'fireplace'},
  {title: 'Ocean View', value: 'ocean-view'},
  {title: 'Forest View', value: 'forest-view'},
  {title: 'Mountain View', value: 'mountain-view'},
  {title: 'Lake View', value: 'lake-view'},
  {title: 'Skyline View', value: 'skyline-view'},
  {title: 'Wi-Fi', value: 'wifi'},
  {title: 'Workspace', value: 'workspace'},
  {title: 'Kitchen', value: 'kitchen'},
  {title: 'Air Conditioning', value: 'air-conditioning'},
  {title: 'EV Charger', value: 'ev-charger'},
  {title: 'BBQ', value: 'bbq'},
  {title: 'Fire Pit', value: 'fire-pit'},
  {title: 'Beach Access', value: 'beach-access'},
] as const

export const CATEGORIES = [
  {title: 'Cabin', value: 'cabin'},
  {title: 'Beach', value: 'beach'},
  {title: 'City', value: 'city'},
  {title: 'Villa', value: 'villa'},
] as const

export const POLICY_KINDS = [
  {title: 'Cancellation', value: 'cancellation'},
  {title: 'House rules', value: 'house-rules'},
  {title: 'Pets', value: 'pets'},
  {title: 'Check-in and check-out', value: 'check-in'},
  {title: 'Payments and fees', value: 'payments'},
  {title: 'Safety', value: 'safety'},
] as const
