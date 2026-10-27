// Sample content for the search demo. Stays come from the app's seed data (studio/seed/properties.ts);
// photos are Unsplash placeholders. The page labels all of it as sample.
const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=320&q=80`;

export type DemoStay = {
  title: string;
  place: string;
  rating: string;
  reviews: number;
  price: number;
  image: string;
  badges: string[];
};

export type DemoScene = {
  sentence: string;
  chips: { label: string; soft?: boolean }[];
  stays: DemoStay[];
};

export const scenes: DemoScene[] = [
  {
    sentence: 'quiet pet friendly cabin with a hot tub under $300 a night',
    chips: [
      { label: 'Cabin' },
      { label: 'Pet friendly' },
      { label: 'Hot tub' },
      { label: 'Under $300' },
      { label: 'Quiet', soft: true },
    ],
    stays: [
      {
        title: 'Modern Cabin with Hot Tub',
        place: 'Lake Arrowhead, CA',
        rating: '4.9',
        reviews: 342,
        price: 289,
        image: photo('1449158743715-0a90ebb6d2d8'),
        badges: ['Hot tub', 'Pets'],
      },
      {
        title: 'Lakeside Hideaway with Hot Tub',
        place: 'Big Bear Lake, CA',
        rating: '4.8',
        reviews: 187,
        price: 259,
        image: photo('1470770841072-f978cf4d019e'),
        badges: ['Hot tub', 'Pets'],
      },
      {
        title: 'Smoky Mountain Hot Tub Lodge',
        place: 'Gatlinburg, TN',
        rating: '4.5',
        reviews: 376,
        price: 189,
        image: photo('1545158535-c3f7168c28b6'),
        badges: ['Hot tub', 'Pets'],
      },
    ],
  },
  {
    sentence: 'cozy cabin with a fireplace under $200 a night',
    chips: [
      { label: 'Cabin' },
      { label: 'Fireplace' },
      { label: 'Under $200' },
      { label: 'Cozy', soft: true },
    ],
    stays: [
      {
        title: 'Snowy Cabin Retreat',
        place: 'Truckee, CA',
        rating: '4.6',
        reviews: 152,
        price: 175,
        image: photo('1559767949-0faa5c7e9992'),
        badges: ['Fireplace', 'Pets'],
      },
      {
        title: 'Secluded Forest Lodge',
        place: 'Bend, OR',
        rating: '4.7',
        reviews: 74,
        price: 198,
        image: photo('1510798831971-661eb04b3739'),
        badges: ['Fireplace', 'Pets'],
      },
    ],
  },
];

const wide = (id: string, w = 1400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const heroImage = wide('1600585154340-be6161a56a0c', 2200);
export const closeImage = wide('1507525428034-b723cf961d3e', 2000);

export type Showcase = { title: string; place: string; price: number; rating: string; image: string };

// Seeded stays (studio/seed/properties.ts) with their seeded prices and ratings.
export const showcase: Showcase[] = [
  { title: 'Desert Modern Villa with Pool', place: 'Palm Springs, CA', price: 450, rating: '4.8', image: wide('1564013799919-ab600027ffc6', 1800) },
  { title: 'Hillside Estate with Infinity Pool', place: 'Santa Barbara, CA', price: 495, rating: '4.9', image: wide('1520250497591-112f2f40a3f4', 1400) },
  { title: 'Oceanview Villa with Private Pool', place: 'Malibu, CA', price: 412, rating: '4.8', image: wide('1512917774080-9991f1c4c750', 1400) },
  { title: 'Tropical Villa with Plunge Pool', place: 'Miami, FL', price: 340, rating: '4.6', image: wide('1613490493576-7fde63acd811', 1800) },
  { title: 'Designer Home in Wine Country', place: 'Healdsburg, CA', price: 365, rating: '4.7', image: wide('1600596542815-ffad4c1539a9', 1400) },
];
