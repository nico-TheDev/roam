export type PolicySeed = {
  slug: string
  title: string
  kind: 'cancellation' | 'house-rules' | 'pets' | 'check-in' | 'payments' | 'safety'
  summary: string
  body: string
  refundWindowDays?: number
}

export const policies: PolicySeed[] = [
  {
    slug: 'flexible-cancellation', title: 'Flexible cancellation', kind: 'cancellation', refundWindowDays: 1,
    summary: 'Full refund up to 1 day before check-in.',
    body: 'Cancel up to 24 hours before check-in for a full refund of the nightly rate and the cleaning fee. If you cancel later than that, the first night is not refunded and the remaining nights are refunded in full. If you leave early, nights you do not stay are not refunded.',
  },
  {
    slug: 'moderate-cancellation', title: 'Free cancellation', kind: 'cancellation', refundWindowDays: 7,
    summary: 'Full refund up to 7 days before check-in.',
    body: 'Cancel up to 7 days before check-in for a full refund. If you cancel between 7 days and 48 hours before check-in, you get back 50% of the nightly rate and the full cleaning fee. Within 48 hours of check-in, the booking is not refundable. If you leave early, nights you do not stay are not refunded.',
  },
  {
    slug: 'strict-cancellation', title: 'Strict cancellation', kind: 'cancellation', refundWindowDays: 30,
    summary: 'Full refund up to 30 days before check-in.',
    body: 'Cancel up to 30 days before check-in for a full refund. If you cancel between 30 and 14 days before check-in, you get back 50% of the nightly rate. Within 14 days of check-in, the booking is not refundable. The cleaning fee is refunded in full if you cancel more than 7 days before check-in.',
  },
  {
    slug: 'house-rules', title: 'House rules', kind: 'house-rules',
    summary: 'Quiet hours 10 pm to 8 am, no parties, no smoking.',
    body: 'Quiet hours are from 10 pm to 8 am. Parties and events are not allowed. Smoking and vaping are not allowed inside, and guests who smoke outside must use the ashtray provided and put it out completely. Only the guests named in the booking may stay overnight, and the number of guests cannot exceed the maximum on the listing. Please treat the home and its neighbors with respect, take your trash to the bins before you leave and turn off lights, heating and cooling when you go out.',
  },
  {
    slug: 'pet-policy', title: 'Pet policy', kind: 'pets',
    summary: 'Up to 2 dogs or cats, $50 per pet per stay.',
    body: 'Well-behaved dogs and cats are welcome at stays that list pets as allowed, up to two per booking. There is a pet fee of $50 per pet per stay, which is added at checkout. Please tell your host before you arrive how many pets are coming. Pets must not be left alone in the home, must stay off beds and furniture, and must be leashed on shared grounds. Clean up after your pet inside and outside. Service animals are always welcome and are not charged a fee.',
  },
  {
    slug: 'check-in-and-check-out', title: 'Check-in and check-out', kind: 'check-in',
    summary: 'Self check-in with a door code sent the day before.',
    body: 'Check-in uses a keypad or lockbox. Your host sends the code and the arrival instructions the day before check-in. Check-in and check-out times are on the listing. Early check-in and late check-out are not guaranteed, but you can ask your host through the app, who will say yes whenever the calendar allows. Before you leave, close all windows, lock the door and leave the key or code card where you found it.',
  },
  {
    slug: 'payments-and-fees', title: 'Payments and fees', kind: 'payments',
    summary: 'Pay the full total when you book. No hidden fees.',
    body: 'The total you see before you book includes the nightly rate for every night, the one-time cleaning fee and taxes. It is charged in full when your booking is confirmed. There is no service fee for guests. Pet fees, if they apply, are added at checkout. Security deposits are not collected up front. If something is damaged, your host can request a payment through Roam within 14 days of check-out, and you can respond with photos or a receipt.',
  },
  {
    slug: 'safety-and-property', title: 'Safety and property', kind: 'safety',
    summary: 'Smoke and CO alarms in every home, first-aid kit on site.',
    body: 'Every Roam home has working smoke and carbon monoxide alarms, a fire extinguisher and a first-aid kit. Your host lists the nearest urgent care and the local emergency numbers in the welcome guide. Pools, hot tubs, fire pits and fireplaces are used at your own risk and are not supervised: children must always be with an adult and nobody should use a pool or hot tub alone or after drinking. Some homes have outdoor cameras at the entrances for security, and these never point at private areas or the inside of the home.',
  },
]
