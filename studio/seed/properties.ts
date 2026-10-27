export type PropertySeed = {
  slug: string
  title: string
  category: 'cabin' | 'beach' | 'city' | 'villa'
  city: string
  state: string
  coords: [number, number]
  price: number
  cleaningFee: number
  minNights: number
  guests: number
  bedrooms: number
  beds: number
  bathrooms: number
  pets: boolean
  amenities: string[]
  checkIn: string
  checkOut: string
  rating: number
  reviews: number
  host: string
  cancellation: 'flexible-cancellation' | 'moderate-cancellation' | 'strict-cancellation'
  cover: string // Unsplash photo id, always the first image
  summary: string
  description: string
  neighborhood: string
}

export const properties: PropertySeed[] = [
  {
    slug: 'modern-cabin-hot-tub', title: 'Modern Cabin with Hot Tub', category: 'cabin', city: 'Lake Arrowhead', state: 'CA', coords: [34.2486, -117.1893],
    price: 289, cleaningFee: 95, minNights: 2, guests: 6, bedrooms: 3, beds: 4, bathrooms: 2, pets: true,
    amenities: ['hot-tub', 'wifi', 'forest-view', 'fireplace', 'fire-pit', 'kitchen'], checkIn: '16:00', checkOut: '11:00',
    rating: 4.9, reviews: 342, host: 'alex-rivera', cancellation: 'moderate-cancellation', cover: '1449158743715-0a90ebb6d2d8',
    summary: 'A quiet, cozy cabin tucked into the pines above Lake Arrowhead, with a private hot tub on the deck and floor-to-ceiling windows that glow at sunset.',
    description: 'Dark cedar walls, a vaulted living room and a wall of glass facing the trees. The deck has a six-person hot tub, a fire pit and loungers, and the kitchen is stocked for real cooking. At night it is dark and silent enough to hear the pines, and mornings start with coffee on the deck while the mist lifts off the mountain. The loft bedroom has its own reading nook.',
    neighborhood: 'Ten minutes from Lake Arrowhead Village for restaurants and the lake, and a short drive to hiking trails and the Skyforest ridge. The street is residential and peaceful, with no through traffic after dark.',
  },
  {
    slug: 'oceanview-villa-pool', title: 'Oceanview Villa with Private Pool', category: 'villa', city: 'Malibu', state: 'CA', coords: [34.0259, -118.7798],
    price: 412, cleaningFee: 180, minNights: 3, guests: 8, bedrooms: 4, beds: 5, bathrooms: 3.5, pets: false,
    amenities: ['pool', 'ocean-view', 'wifi', 'air-conditioning', 'bbq', 'kitchen'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.8, reviews: 128, host: 'sofia-marchetti', cancellation: 'strict-cancellation', cover: '1512917774080-9991f1c4c750',
    summary: 'A luxurious, romantic villa above the Pacific with an infinity-edge pool, sunset terraces and open walls to the water.',
    description: 'White stucco, glass sliding walls and a heated pool that seems to spill into the ocean. Every bedroom has a sea view, the main suite has a soaking tub on its own terrace, and the outdoor kitchen is built for long dinners while the sun goes down. A chef and a masseuse can be booked through your host.',
    neighborhood: 'On a private road in the Malibu hills, ten minutes from Zuma Beach and the Malibu Pier restaurants. Quiet and very private, so you will want a car for groceries and dinners out.',
  },
  {
    slug: 'a-frame-redwoods', title: 'A-Frame in the Redwoods', category: 'cabin', city: 'Monte Rio', state: 'CA', coords: [38.4666, -123.0144],
    price: 236, cleaningFee: 85, minNights: 2, guests: 4, bedrooms: 2, beds: 2, bathrooms: 1, pets: true,
    amenities: ['fireplace', 'wifi', 'forest-view', 'fire-pit', 'kitchen'], checkIn: '16:00', checkOut: '11:00',
    rating: 4.9, reviews: 96, host: 'maya-chen', cancellation: 'moderate-cancellation', cover: '1542718610-a1d656d1884c',
    summary: 'A secluded, romantic A-frame hidden among old-growth redwoods near the Russian River. Quiet, cozy and dark at night, with a wood fireplace.',
    description: 'A steep A-frame with a glass front, a wood stove and a loft bed under the peak. You step outside into redwoods more than a hundred feet tall, and the only sound is the creek below. Two sets of board games and a record player sit by the fireplace, and the firewood is already stacked. It is a place for slow weekends and not much else.',
    neighborhood: 'Five minutes from the Russian River beaches and the Monte Rio Theater, and twenty minutes to Guerneville and the coast at Jenner. The road in is winding and unlit, so arrive before dark.',
  },
  {
    slug: 'designer-home-wine-country', title: 'Designer Home in Wine Country', category: 'villa', city: 'Healdsburg', state: 'CA', coords: [38.6105, -122.8694],
    price: 365, cleaningFee: 150, minNights: 2, guests: 8, bedrooms: 4, beds: 5, bathrooms: 3, pets: false,
    amenities: ['pool', 'wifi', 'workspace', 'kitchen', 'air-conditioning', 'ev-charger'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.7, reviews: 201, host: 'maya-chen', cancellation: 'moderate-cancellation', cover: '1600596542815-ffad4c1539a9',
    summary: 'A modern, quiet designer home among the vineyards with a saltwater pool, a chef-grade kitchen and room for two couples or a family.',
    description: 'Architect-designed with concrete floors, oak joinery and doors that open the whole ground floor to a pool terrace. The kitchen has a six-burner range, a wine fridge and a long table for eight. Two bedrooms have desks with monitors, which makes it a good place to work for a day before the weekend begins. The street is dead quiet at night.',
    neighborhood: 'A ten-minute walk to Healdsburg Plaza for tasting rooms, bakeries and restaurants, and a short drive to Dry Creek and Alexander Valley wineries. Cycling the valley roads is popular, and two bikes are included.',
  },
  {
    slug: 'lakeside-hideaway', title: 'Lakeside Hideaway with Hot Tub', category: 'cabin', city: 'Big Bear Lake', state: 'CA', coords: [34.2439, -116.9114],
    price: 259, cleaningFee: 90, minNights: 2, guests: 5, bedrooms: 2, beds: 3, bathrooms: 2, pets: true,
    amenities: ['hot-tub', 'lake-view', 'fireplace', 'wifi', 'bbq', 'kitchen'], checkIn: '16:00', checkOut: '11:00',
    rating: 4.8, reviews: 187, host: 'alex-rivera', cancellation: 'moderate-cancellation', cover: '1470770841072-f978cf4d019e',
    summary: 'A cozy, family-friendly cabin across the road from Big Bear Lake with a hot tub, a stone fireplace and a game room kids will fight over.',
    description: 'Knotty pine walls, a river-rock fireplace and a deck with a hot tub looking down to the water. The lower level has a game room with a pool table and bunk beds for the children, while the upstairs bedroom has a king bed and a lake view. A fenced yard keeps dogs safe, and the deck grill is ready for dinner.',
    neighborhood: 'A five-minute walk to the lake and the boat launch, and ten minutes to Big Bear Village and the ski lifts at Snow Summit. In summer the lake is for paddling and swimming, and in winter the road is plowed early.',
  },
  {
    slug: 'forest-lodge-fireplace', title: 'Secluded Forest Lodge', category: 'cabin', city: 'Bend', state: 'OR', coords: [44.0582, -121.3153],
    price: 198, cleaningFee: 80, minNights: 2, guests: 4, bedrooms: 2, beds: 2, bathrooms: 1.5, pets: true,
    amenities: ['fireplace', 'wifi', 'forest-view', 'mountain-view', 'kitchen', 'fire-pit'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.7, reviews: 74, host: 'tom-halvorsen', cancellation: 'flexible-cancellation', cover: '1510798831971-661eb04b3739',
    summary: 'A secluded, quiet lodge on five wooded acres outside Bend, with a big stone fireplace and no neighbors in sight. Cozy and dark at night.',
    description: 'Ponderosa pines surround a log-and-stone lodge with a great room built around its fireplace. The porch faces the Cascades, the kitchen has a gas range, and the second bedroom has bunk beds. There is no street lighting for miles, so the stars are bright enough to read by. Dogs are welcome and the trails start at the back gate.',
    neighborhood: 'Twenty minutes to downtown Bend for breweries and the Deschutes River, and thirty minutes to Mt. Bachelor. The last mile is gravel and passable in an ordinary car except after heavy snow.',
  },
  {
    slug: 'mountain-chalet-spa', title: 'Mountain Chalet with Spa', category: 'cabin', city: 'Aspen', state: 'CO', coords: [39.1911, -106.8175],
    price: 520, cleaningFee: 220, minNights: 3, guests: 8, bedrooms: 4, beds: 6, bathrooms: 4, pets: false,
    amenities: ['hot-tub', 'fireplace', 'mountain-view', 'wifi', 'kitchen', 'ev-charger'], checkIn: '16:00', checkOut: '10:00',
    rating: 4.9, reviews: 263, host: 'tom-halvorsen', cancellation: 'strict-cancellation', cover: '1464146072230-91cabc968266',
    summary: 'A luxurious, cozy ski chalet with a heated outdoor spa, heated floors and a living room built around a three-story stone fireplace.',
    description: 'Four ensuite bedrooms, a boot room with heated racks and a hot tub on the deck facing Aspen Mountain. The great room has a double-height fireplace, a library wall and a dining table for ten. In summer the aspens turn the valley green and gold, and in winter you can ski to the lift in the morning and soak at night.',
    neighborhood: 'Five minutes by car or free shuttle to downtown Aspen, and close to the Maroon Bells trails in summer. The neighborhood is residential and quiet, with a ski-in path to the Aspen Highlands lifts at the end of the road.',
  },
  {
    slug: 'snowy-cabin-retreat', title: 'Snowy Cabin Retreat', category: 'cabin', city: 'Truckee', state: 'CA', coords: [39.328, -120.1833],
    price: 175, cleaningFee: 70, minNights: 2, guests: 4, bedrooms: 2, beds: 2, bathrooms: 1, pets: true,
    amenities: ['fireplace', 'mountain-view', 'wifi', 'kitchen'], checkIn: '16:00', checkOut: '11:00',
    rating: 4.6, reviews: 152, host: 'alex-rivera', cancellation: 'flexible-cancellation', cover: '1559767949-0faa5c7e9992',
    summary: 'A small, quiet and cozy cabin in the Sierra snow with a wood stove, a sled by the door and a ten-minute drive to Northstar.',
    description: 'Warm pine inside and a deep porch outside, this cabin has a wood stove that heats it in minutes and a mudroom for wet boots and dogs. The kitchen is small but complete, and the bunk room sleeps two children comfortably. It is the kind of place you retreat to after a day on the mountain and do not leave in the evening.',
    neighborhood: 'Ten minutes to Northstar and fifteen to Donner Lake, with the old-town streets of Truckee for dinner. Winter driving requires chains or snow tires, and the host will check the road for you on arrival day.',
  },
  {
    slug: 'beach-house-sunset', title: 'Sunset Beach House', category: 'beach', city: 'Santa Cruz', state: 'CA', coords: [36.9741, -122.0308],
    price: 310, cleaningFee: 120, minNights: 2, guests: 6, bedrooms: 3, beds: 4, bathrooms: 2, pets: true,
    amenities: ['ocean-view', 'wifi', 'beach-access', 'bbq', 'kitchen'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.8, reviews: 219, host: 'lena-kowalski', cancellation: 'moderate-cancellation', cover: '1499793983690-e29da59ef1c2',
    summary: 'A bright, family-friendly beach house a short walk from the sand, with a deck that faces the sunset and a rack of boogie boards by the door.',
    description: 'Blue shutters, a wide front deck and a living room that opens to the ocean breeze. The kids sleep in a bunk room, adults get the two upstairs bedrooms with sea views, and the outdoor shower waits at the bottom of the steps. Beach chairs, towels, umbrellas and a wagon are provided.',
    neighborhood: 'A four-minute walk to the beach and a short drive to the Boardwalk, the wharf and Pleasure Point cafes. The street is lively with surfers in the morning and calm in the evening.',
  },
  {
    slug: 'oceanfront-bungalow', title: 'Oceanfront Bungalow', category: 'beach', city: 'Kailua-Kona', state: 'HI', coords: [19.64, -155.9969],
    price: 395, cleaningFee: 140, minNights: 3, guests: 4, bedrooms: 2, beds: 2, bathrooms: 2, pets: false,
    amenities: ['ocean-view', 'pool', 'beach-access', 'wifi', 'air-conditioning', 'kitchen'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.9, reviews: 311, host: 'lena-kowalski', cancellation: 'strict-cancellation', cover: '1507525428034-b723cf961d3e',
    summary: 'A quiet, romantic bungalow right on the water on the Kona coast, with a small pool and a lanai where you can watch manta rays at night.',
    description: 'Teak floors, open louvered windows and a lanai twelve steps from the lava-rock shore. The bedrooms are cooled by sea air and ceiling fans, and there is air conditioning when you want it. Snorkel gear is provided, and in the evenings the lights on the water draw manta rays to the bay. Morning is for coffee and turtles.',
    neighborhood: 'A ten-minute drive to Kailua-Kona town for the farmers market and restaurants, and close to snorkeling at Kahaluʻu. The coast road is quiet and the surrounding houses are small and low-key.',
  },
  {
    slug: 'dune-cottage', title: 'Dune Cottage Steps from the Sand', category: 'beach', city: 'Cannon Beach', state: 'OR', coords: [45.8918, -123.9615],
    price: 225, cleaningFee: 85, minNights: 2, guests: 4, bedrooms: 2, beds: 3, bathrooms: 1, pets: true,
    amenities: ['ocean-view', 'fireplace', 'beach-access', 'wifi', 'kitchen'], checkIn: '16:00', checkOut: '11:00',
    rating: 4.7, reviews: 88, host: 'jordan-ellis', cancellation: 'flexible-cancellation', cover: '1473116763249-2faaef81ccda',
    summary: 'A cozy, quiet cottage in the dunes with a gas fireplace and a path to the beach, perfect for storm watching and long walks with the dog.',
    description: 'Gray cedar shingles, window seats and a small fireplace make this the best kind of rainy-day house. The path from the back porch crosses the dunes to the beach in two minutes, and a rinse station is waiting for sandy dogs. It is small, simple and warm.',
    neighborhood: 'A ten-minute walk to downtown Cannon Beach for chowder and bookshops, and Haystack Rock is a mile down the sand. Evenings are calm, with the sound of waves and little traffic.',
  },
  {
    slug: 'palm-villa-pool', title: 'Tropical Villa with Plunge Pool', category: 'villa', city: 'Miami', state: 'FL', coords: [25.7617, -80.1918],
    price: 340, cleaningFee: 140, minNights: 2, guests: 10, bedrooms: 5, beds: 6, bathrooms: 4, pets: true,
    amenities: ['pool', 'wifi', 'air-conditioning', 'bbq', 'kitchen', 'workspace'], checkIn: '16:00', checkOut: '11:00',
    rating: 4.6, reviews: 164, host: 'jordan-ellis', cancellation: 'moderate-cancellation', cover: '1613490493576-7fde63acd811',
    summary: 'A big, family-friendly tropical villa behind a wall of palms, with a plunge pool, an outdoor kitchen and space for ten.',
    description: 'Five bedrooms, a long open living room and a courtyard around a saltwater plunge pool. Kids have a game room, adults have an outdoor bar and grill, and there are bikes in the garage for exploring the neighborhood. The house is fully air conditioned and has a dedicated workspace for remote days.',
    neighborhood: 'In a leafy residential area ten minutes from Wynwood and fifteen from South Beach. A grocery store, cafes and a dog-friendly park are within walking distance.',
  },
  {
    slug: 'soho-loft', title: 'Sunny Loft in SoHo', category: 'city', city: 'New York', state: 'NY', coords: [40.7233, -74.003],
    price: 245, cleaningFee: 75, minNights: 2, guests: 3, bedrooms: 1, beds: 2, bathrooms: 1, pets: false,
    amenities: ['wifi', 'workspace', 'air-conditioning', 'kitchen', 'skyline-view'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.6, reviews: 402, host: 'daniel-okafor', cancellation: 'moderate-cancellation', cover: '1502672260266-1c1ef2d93688',
    summary: 'A bright, modern cast-iron loft with twelve-foot ceilings and big south-facing windows in the middle of SoHo. Ideal for a work trip with a weekend attached.',
    description: 'Original wood floors, exposed brick and tall windows flood the room with sun. There is a proper desk with a monitor and a fast connection, a queen bed behind a sliding partition and a pull-out sofa for a third guest. The kitchen is compact but has everything for breakfast.',
    neighborhood: 'On a cobblestone street with galleries, cafes and shops downstairs. The subway is two minutes away, and the street is lively until late, though the bedroom faces the quiet courtyard.',
  },
  {
    slug: 'downtown-studio', title: 'Downtown Studio with Skyline View', category: 'city', city: 'Seattle', state: 'WA', coords: [47.6062, -122.3321],
    price: 148, cleaningFee: 55, minNights: 1, guests: 2, bedrooms: 0, beds: 1, bathrooms: 1, pets: true,
    amenities: ['wifi', 'workspace', 'skyline-view', 'kitchen', 'air-conditioning'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.5, reviews: 133, host: 'priya-raman', cancellation: 'flexible-cancellation', cover: '1522708323590-d24dbb6b0267',
    summary: 'A modern, quiet studio on a high floor with a skyline and Space Needle view. Small, efficient and good for work trips and solo travelers.',
    description: 'A bright studio with a comfortable queen bed, a full desk with a monitor, and a window wall facing Elliott Bay and the Space Needle. The kitchenette has a two-burner stove and espresso machine, and the building has a gym and a rooftop terrace. A small dog is welcome.',
    neighborhood: 'Two blocks from Pike Place Market and the waterfront, with light rail a five-minute walk away. The building is quiet at night and the area is busy during the day.',
  },
  {
    slug: 'garden-apartment', title: 'Garden Apartment near the Park', category: 'city', city: 'Austin', state: 'TX', coords: [30.2672, -97.7431],
    price: 129, cleaningFee: 50, minNights: 1, guests: 4, bedrooms: 1, beds: 2, bathrooms: 1, pets: true,
    amenities: ['wifi', 'workspace', 'kitchen', 'air-conditioning', 'bbq'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.7, reviews: 91, host: 'priya-raman', cancellation: 'flexible-cancellation', cover: '1493809842364-78817add7ffb',
    summary: 'A cozy, quiet garden-level apartment with a private patio, a shaded yard and a five-minute walk to Zilker Park.',
    description: 'A one-bedroom with a queen bed, a sleeper sofa and a full kitchen that opens to a back patio with a grill and string lights. There is a desk by the window, a fast connection and a coffee grinder for slow mornings. The yard is fenced, so dogs can roam.',
    neighborhood: 'On a tree-lined street in Zilker, a short walk to Barton Springs, the hike-and-bike trail and the South Congress shops. Nights are mellow.',
  },
  {
    slug: 'hillside-estate', title: 'Hillside Estate with Infinity Pool', category: 'villa', city: 'Santa Barbara', state: 'CA', coords: [34.4208, -119.6982],
    price: 495, cleaningFee: 220, minNights: 3, guests: 10, bedrooms: 5, beds: 6, bathrooms: 5, pets: false,
    amenities: ['pool', 'ocean-view', 'hot-tub', 'wifi', 'kitchen', 'air-conditioning'], checkIn: '16:00', checkOut: '11:00',
    rating: 4.9, reviews: 58, host: 'sofia-marchetti', cancellation: 'strict-cancellation', cover: '1520250497591-112f2f40a3f4',
    summary: 'A secluded, luxurious and romantic Spanish-style estate in the Santa Barbara hills with an infinity pool, a hot tub and views from the mountains to the sea.',
    description: 'Terracotta roofs, tiled courtyards and a long infinity pool that points at the Channel Islands. The estate has five ensuite bedrooms, an outdoor dining pavilion, a hot tub tucked under an olive tree and a wine cellar your host will happily help you stock. Mornings begin with fog and end in sunshine.',
    neighborhood: 'Behind a gate on a quiet hillside road, fifteen minutes from the beaches and State Street. Private and very quiet, and the nearest neighbor is out of sight.',
  },

  // New stays
  {
    slug: 'treehouse-cabin-creek', title: 'Treehouse Cabin above the Creek', category: 'cabin', city: 'Asheville', state: 'NC', coords: [35.5951, -82.5515],
    price: 210, cleaningFee: 80, minNights: 2, guests: 4, bedrooms: 2, beds: 2, bathrooms: 1, pets: false,
    amenities: ['forest-view', 'mountain-view', 'wifi', 'fire-pit', 'kitchen'], checkIn: '16:00', checkOut: '11:00',
    rating: 4.8, reviews: 143, host: 'tom-halvorsen', cancellation: 'moderate-cancellation', cover: '1448375240586-882707db888b',
    summary: 'A secluded, romantic cabin on stilts above a mountain creek, wrapped by a wraparound deck and the sound of running water.',
    description: 'Built twenty feet off the ground among tulip poplars, this cabin has a deck on all sides, a clawfoot tub by a window and a sleeping loft reached by a ship ladder. The creek runs below, and a fire pit sits by the footbridge. It is quiet, a little adventurous and very private.',
    neighborhood: 'Fifteen minutes to downtown Asheville for breweries and live music, and close to the Blue Ridge Parkway overlooks. The drive up is steep and gravel, and an all-wheel-drive car is better in winter.',
  },
  {
    slug: 'log-cabin-flathead', title: 'Log Cabin on Flathead Lake', category: 'cabin', city: 'Whitefish', state: 'MT', coords: [48.4111, -114.3376],
    price: 245, cleaningFee: 100, minNights: 2, guests: 6, bedrooms: 3, beds: 4, bathrooms: 2, pets: true,
    amenities: ['lake-view', 'mountain-view', 'fireplace', 'wifi', 'fire-pit', 'kitchen'], checkIn: '16:00', checkOut: '10:00',
    rating: 4.7, reviews: 109, host: 'tom-halvorsen', cancellation: 'moderate-cancellation', cover: '1587061949409-02df41d5e562',
    summary: 'A family-friendly, cozy log cabin with its own dock and a view across the lake to the Whitefish Range.',
    description: 'Hand-hewn logs, a rock fireplace and a long porch that looks across the water. A kayak and two paddleboards are kept at the dock, and the kitchen has a big table for card games. Three bedrooms cover a family, and dogs have a fenced yard behind the house.',
    neighborhood: 'Fifteen minutes to Whitefish for restaurants and the ski lifts at Big Mountain, and thirty-five to the west entrance of Glacier National Park. Quiet lake road with a few other homes.',
  },
  {
    slug: 'smoky-mountain-lodge', title: 'Smoky Mountain Hot Tub Lodge', category: 'cabin', city: 'Gatlinburg', state: 'TN', coords: [35.7143, -83.5102],
    price: 189, cleaningFee: 85, minNights: 2, guests: 8, bedrooms: 3, beds: 5, bathrooms: 3, pets: true,
    amenities: ['hot-tub', 'mountain-view', 'fireplace', 'wifi', 'bbq', 'kitchen'], checkIn: '16:00', checkOut: '10:00',
    rating: 4.5, reviews: 376, host: 'alex-rivera', cancellation: 'flexible-cancellation', cover: '1545158535-c3f7168c28b6',
    summary: 'A roomy, family-friendly lodge in the Great Smoky Mountains with a hot tub on the deck, a game loft and a big view of the ridgelines.',
    description: 'Three levels of knotty pine, a stone fireplace and a game loft with an arcade cabinet and a pool table. The deck has a hot tub and rocking chairs facing the ridges, and the kitchen is set up for a full family dinner. Good for large groups who want to spend most of their time together.',
    neighborhood: 'Ten minutes to the Great Smoky Mountains National Park entrance and downtown Gatlinburg, and close to Dollywood. The lodge is on a ridge road, with a few other cabins within sight.',
  },
  {
    slug: 'surfside-studio-pb', title: 'Surfside Studio Steps from the Waves', category: 'beach', city: 'San Diego', state: 'CA', coords: [32.797, -117.2549],
    price: 165, cleaningFee: 60, minNights: 2, guests: 3, bedrooms: 0, beds: 2, bathrooms: 1, pets: false,
    amenities: ['ocean-view', 'beach-access', 'wifi', 'kitchen', 'air-conditioning'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.5, reviews: 257, host: 'lena-kowalski', cancellation: 'flexible-cancellation', cover: '1519046904884-53103b34b206',
    summary: 'A bright and breezy beach studio in Pacific Beach, one block from the boardwalk, with surfboards to borrow and a balcony facing the sunset.',
    description: 'One airy room with a queen bed, a daybed, a kitchenette and a balcony with a slice of the ocean. Two longboards, rash guards and beach towels are in the hall closet. It is a simple base for people who plan to spend the day in the water.',
    neighborhood: 'A one-minute walk to the sand and the Crystal Pier, with taco shops, surf rentals and a lively boardwalk. Weekends are busy and the street is livelier than most beach neighborhoods.',
  },
  {
    slug: 'gulf-cottage-dock', title: 'Gulf Cottage with Private Dock', category: 'beach', city: 'Destin', state: 'FL', coords: [30.3935, -86.4958],
    price: 275, cleaningFee: 110, minNights: 3, guests: 6, bedrooms: 3, beds: 4, bathrooms: 2, pets: true,
    amenities: ['ocean-view', 'beach-access', 'pool', 'wifi', 'bbq', 'kitchen'], checkIn: '16:00', checkOut: '10:00',
    rating: 4.7, reviews: 198, host: 'jordan-ellis', cancellation: 'moderate-cancellation', cover: '1506929562872-bb421503ef21',
    summary: 'A relaxed, family-friendly Gulf cottage with a shared pool, a private dock for fishing and white sand five minutes away.',
    description: 'Seafoam shutters, a screened porch and a dock where the kids can fish at sunrise. Inside it is a simple, bright beach cottage with a bunk room, a porch swing and a big table for crab boils. Beach gear, a cooler and a fish-cleaning table are provided.',
    neighborhood: 'Five minutes to the emerald-water beaches of Destin and a short drive to Harbor Boardwalk and seafood restaurants. A dog-friendly stretch of beach is at the end of the road.',
  },
  {
    slug: 'maui-cliffside-beach-house', title: 'Cliffside Beach House in Paia', category: 'beach', city: 'Paia', state: 'HI', coords: [20.9033, -156.3694],
    price: 430, cleaningFee: 160, minNights: 4, guests: 6, bedrooms: 3, beds: 3, bathrooms: 3, pets: false,
    amenities: ['ocean-view', 'pool', 'beach-access', 'wifi', 'air-conditioning', 'kitchen'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.9, reviews: 121, host: 'lena-kowalski', cancellation: 'strict-cancellation', cover: '1468413253725-0d5181091126',
    summary: 'A luxurious, romantic cliffside house on Maui’s north shore with a lap pool above the surf break and a terrace made for sunrise.',
    description: 'Open-air living rooms, outdoor showers and a lap pool whose edge drops to the sea. Each of the three suites opens to the trade winds, and the covered terrace has a daybed for whale watching in winter. Surf instructors, private chefs and snorkel tours can be arranged through your host.',
    neighborhood: 'Five minutes to Paia town for coffee, fish tacos and boutiques, and close to Hoʻokipa Beach for windsurfing. The road is narrow and the neighborhood is peaceful.',
  },
  {
    slug: 'outer-banks-dune-house', title: 'Outer Banks Dune House', category: 'beach', city: 'Nags Head', state: 'NC', coords: [35.9574, -75.6241],
    price: 320, cleaningFee: 130, minNights: 3, guests: 10, bedrooms: 5, beds: 7, bathrooms: 4, pets: true,
    amenities: ['ocean-view', 'beach-access', 'pool', 'hot-tub', 'wifi', 'kitchen'], checkIn: '16:00', checkOut: '10:00',
    rating: 4.6, reviews: 289, host: 'jordan-ellis', cancellation: 'moderate-cancellation', cover: '1520454974749-611b7248ffdb',
    summary: 'A large, family-friendly dune house for ten with a heated pool, a hot tub and a private boardwalk over the dunes to the beach.',
    description: 'Elevated above the dunes for views from every floor, this five-bedroom house has a game room, a pool deck and an elevator for the grandparents. The kitchen seats ten, the crab pots are on the porch and the beach boardwalk starts at the back gate. A great place for reunions.',
    neighborhood: 'Ten minutes to Jockey’s Ridge State Park and the Nags Head fishing pier, and a short drive to Kitty Hawk and Roanoke Island. The oceanfront road is quiet outside peak season.',
  },
  {
    slug: 'brooklyn-brownstone-parlor', title: 'Brownstone Parlor Floor in Brooklyn', category: 'city', city: 'Brooklyn', state: 'NY', coords: [40.6782, -73.9442],
    price: 210, cleaningFee: 85, minNights: 2, guests: 4, bedrooms: 2, beds: 2, bathrooms: 1, pets: false,
    amenities: ['wifi', 'workspace', 'fireplace', 'kitchen', 'air-conditioning'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.7, reviews: 218, host: 'daniel-okafor', cancellation: 'moderate-cancellation', cover: '1560448204-e02f11c3d0e2',
    summary: 'A warm, quiet parlor floor in a Brooklyn brownstone with high ceilings, original moldings and a decorative fireplace on a tree-lined block.',
    description: 'Two bedrooms, a long parlor with a desk by the bay window and a kitchen opening onto a shared garden. The ceilings are twelve feet tall, the floors are original oak and the block is lined with maples. It feels like a friend’s apartment rather than a rental.',
    neighborhood: 'A three-minute walk to the subway in Fort Greene, near Prospect Park and the BAM. Cafes, a farmers market and bookshops are all on the next block, and the street is peaceful after dark.',
  },
  {
    slug: 'la-arts-district-loft', title: 'Artist Loft in the Arts District', category: 'city', city: 'Los Angeles', state: 'CA', coords: [34.0407, -118.2358],
    price: 185, cleaningFee: 70, minNights: 2, guests: 3, bedrooms: 1, beds: 2, bathrooms: 1, pets: true,
    amenities: ['wifi', 'workspace', 'skyline-view', 'air-conditioning', 'kitchen'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.4, reviews: 164, host: 'daniel-okafor', cancellation: 'flexible-cancellation', cover: '1556911220-bff31c812dba',
    summary: 'A modern industrial loft in a converted warehouse, full of art and light, with a rooftop skyline view and a desk for working.',
    description: 'Concrete floors, steel windows and a fourteen-foot ceiling over a bed on a mezzanine. The walls are hung with works from local artists, the kitchen is open to the living room, and the building’s rooftop has a view of downtown LA. Dogs are welcome with a short walk to a dog park.',
    neighborhood: 'In the Arts District with galleries, breweries and coffee roasters at the door. The street has some noise on weekends, and the Metro and ride-share are close.',
  },
  {
    slug: 'new-orleans-row-house', title: 'Historic Row House near the French Quarter', category: 'city', city: 'New Orleans', state: 'LA', coords: [29.9657, -90.061],
    price: 155, cleaningFee: 65, minNights: 2, guests: 5, bedrooms: 2, beds: 3, bathrooms: 1.5, pets: false,
    amenities: ['wifi', 'air-conditioning', 'kitchen', 'fireplace', 'workspace'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.6, reviews: 301, host: 'priya-raman', cancellation: 'flexible-cancellation', cover: '1484154218962-a197022b5858',
    summary: 'A colorful, cozy 1890s row house with a shaded courtyard, tall shuttered windows and live music a few blocks away.',
    description: 'Heart-pine floors, ceiling medallions and a courtyard with a fountain behind a wrought-iron gate. Two bedrooms upstairs, a daybed in the parlor and a kitchen stocked with chicory coffee. Your host has marked her favorite po’boy shops on the paper map by the door.',
    neighborhood: 'Six blocks from the French Quarter in the Marigny, with live jazz clubs on Frenchmen Street and a streetcar stop nearby. The area is lively at night, and the house itself is insulated and calm.',
  },
  {
    slug: 'chicago-penthouse-workspace', title: 'Skyline Penthouse with Workspace', category: 'city', city: 'Chicago', state: 'IL', coords: [41.8858, -87.6181],
    price: 390, cleaningFee: 120, minNights: 2, guests: 4, bedrooms: 2, beds: 2, bathrooms: 2, pets: false,
    amenities: ['skyline-view', 'workspace', 'wifi', 'air-conditioning', 'kitchen', 'ev-charger'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.8, reviews: 77, host: 'daniel-okafor', cancellation: 'strict-cancellation', cover: '1505691938895-1758d7feb511',
    summary: 'A modern, quiet penthouse on the 38th floor with a wall of glass over the lake and the skyline, two desks and a chef’s kitchen.',
    description: 'Floor-to-ceiling windows face both the Chicago River and Lake Michigan. There are two dedicated work areas with monitors and a gigabit connection, two ensuite bedrooms with blackout shades and a kitchen with a full-size range. A concierge, a gym and a pool are in the building.',
    neighborhood: 'In the Loop near Millennium Park and the Riverwalk, with the L trains at the corner. The building is well soundproofed, so the city is mostly something you look at.',
  },
  {
    slug: 'palm-springs-desert-villa', title: 'Desert Modern Villa with Pool', category: 'villa', city: 'Palm Springs', state: 'CA', coords: [33.8303, -116.5453],
    price: 450, cleaningFee: 180, minNights: 3, guests: 8, bedrooms: 4, beds: 5, bathrooms: 3, pets: true,
    amenities: ['pool', 'hot-tub', 'mountain-view', 'wifi', 'air-conditioning', 'bbq'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.8, reviews: 134, host: 'sofia-marchetti', cancellation: 'strict-cancellation', cover: '1564013799919-ab600027ffc6',
    summary: 'A modern mid-century-style villa with a heated pool and spa framed by palms and the San Jacinto mountains, built for lazy, sunny weekends.',
    description: 'A low glass-and-stone house with a butterfly roof, four bedrooms and a courtyard pool with a built-in spa. Misters on the patio keep the afternoon heat manageable, and the fire pit is for desert nights. A fenced yard, bikes and a record player complete the picture.',
    neighborhood: 'Ten minutes to downtown Palm Springs and the Palm Canyon Drive restaurants, and close to the tram up Mt. San Jacinto. A quiet street in the Movie Colony neighborhood.',
  },
  {
    slug: 'napa-vineyard-villa', title: 'Vineyard Villa in Napa', category: 'villa', city: 'Napa', state: 'CA', coords: [38.2975, -122.2869],
    price: 420, cleaningFee: 170, minNights: 2, guests: 8, bedrooms: 4, beds: 5, bathrooms: 4, pets: false,
    amenities: ['pool', 'wifi', 'kitchen', 'air-conditioning', 'fire-pit', 'workspace'], checkIn: '15:00', checkOut: '11:00',
    rating: 4.9, reviews: 92, host: 'sofia-marchetti', cancellation: 'strict-cancellation', cover: '1600585154340-be6161a56a0c',
    summary: 'A quiet, luxurious Tuscan-style villa set among the vines, with a stone terrace, a pool and a kitchen made for a long lunch.',
    description: 'Limestone floors, a wood-fired pizza oven on the terrace and a pool facing rows of cabernet. Four ensuite bedrooms are spread across the house, and the main living room has a library and a fireplace for cool evenings. Your host will book tastings at neighbors’ wineries that are not on the usual lists.',
    neighborhood: 'Surrounded by vineyards on the Silverado Trail, ten minutes from downtown Napa and Yountville. The road is quiet at all hours and the nearest neighbors are vines.',
  },
  {
    slug: 'hill-country-ranch-villa', title: 'Hill Country Ranch Villa', category: 'villa', city: 'Fredericksburg', state: 'TX', coords: [30.2752, -98.872],
    price: 280, cleaningFee: 130, minNights: 2, guests: 12, bedrooms: 6, beds: 8, bathrooms: 5, pets: true,
    amenities: ['pool', 'hot-tub', 'bbq', 'fire-pit', 'wifi', 'kitchen'], checkIn: '16:00', checkOut: '11:00',
    rating: 4.7, reviews: 142, host: 'priya-raman', cancellation: 'moderate-cancellation', cover: '1600607687939-ce8a6c25118c',
    summary: 'A big, family-friendly stone ranch house for twelve with a pool, a hot tub and fire pit on twenty open acres of Texas hill country.',
    description: 'Limestone walls, a metal roof and a wraparound porch lined with rocking chairs. Six bedrooms, a game barn with a shuffleboard table and a pool built for crowds. Wildflowers cover the pasture in spring, and the sky at night is full of stars. Perfect for reunions, weddings weekends and big family trips.',
    neighborhood: 'Ten minutes to Fredericksburg’s Main Street for German bakeries, wineries and shops. There are no neighbors in sight, so a late night on the porch bothers nobody.',
  },
]
