export type HostSeed = {
  slug: string
  name: string
  isSuperhost: boolean
  hostingSince: number
  bio: string
  portrait: number // index into HOST_PORTRAITS
}

export const hosts: HostSeed[] = [
  {slug: 'alex-rivera', name: 'Alex Rivera', isSuperhost: true, hostingSince: 2017, portrait: 0, bio: 'Alex grew up in the San Bernardino Mountains and now looks after four cabins around Lake Arrowhead and Big Bear. Expect a hand-written trail map, a stocked wood box and fast replies.'},
  {slug: 'maya-chen', name: 'Maya Chen', isSuperhost: true, hostingSince: 2016, portrait: 1, bio: 'A former hotel manager who swapped front desks for the Sonoma and Mendocino coast. Maya keeps her homes small in number and high in detail.'},
  {slug: 'daniel-okafor', name: 'Daniel Okafor', isSuperhost: false, hostingSince: 2021, portrait: 2, bio: 'Daniel hosts the city apartments he renovated himself in New York, Chicago and Brooklyn. Everything is built for a working trip with a long weekend attached.'},
  {slug: 'sofia-marchetti', name: 'Sofia Marchetti', isSuperhost: true, hostingSince: 2015, portrait: 3, bio: 'Sofia manages a small collection of villas in Southern California and the Napa Valley. She is on call for anything from a pool heater to a restaurant booking.'},
  {slug: 'jordan-ellis', name: 'Jordan Ellis', isSuperhost: false, hostingSince: 2020, portrait: 4, bio: 'Jordan runs coastal rentals across Oregon, Florida and the Outer Banks, and surfs before every check-in.'},
  {slug: 'priya-raman', name: 'Priya Raman', isSuperhost: false, hostingSince: 2022, portrait: 5, bio: 'Priya hosts in Seattle, Austin and New Orleans, three cities she picked for the food. Her welcome notes list the places she actually eats.'},
  {slug: 'tom-halvorsen', name: 'Tom Halvorsen', isSuperhost: true, hostingSince: 2014, portrait: 6, bio: 'Tom has been renting mountain lodges in Colorado, Oregon and Montana since before it was an app. He answers the phone himself.'},
  {slug: 'lena-kowalski', name: 'Lena Kowalski', isSuperhost: false, hostingSince: 2019, portrait: 7, bio: 'Lena looks after beach houses in Hawaii and Santa Cruz and keeps a shelf of boogie boards, beach chairs and board games at each one.'},
]
