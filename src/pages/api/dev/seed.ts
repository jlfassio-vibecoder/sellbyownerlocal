import type { APIRoute } from 'astro';
import { db } from '../../../lib/firebase-admin';
import { UserSchema, VehicleSchema } from '../../../schemas';

const USER_ID = '4SDUnGT1TvhhAweUYFCL8MIsstG3';
const VEHICLE_IDS = ['seed-ram-1500', 'seed-ford-f150'] as const;

const RAM_WINDOW_STICKER_BREAKDOWN = {
  totalMsrp: 59895,
  lineItems: [
    { label: 'Base Price', price: 44095, emphasized: true },
    { label: 'Leather-Trimmed Bucket Seats', price: 1545 },
    { label: 'Night Edition Package 26Q', price: 395 },
    { label: 'Convenience Group', price: 545 },
    { label: '9-Speaker Alpine® Audio w/ Sub', price: 345 },
    { label: 'Tri-Fold Tonneau Cover', price: 595 },
    { label: '8-Speed Auto 8HP70 Transmission', price: 500 },
    { label: 'Anti-Spin Differential Rear Axle', price: 435 },
    { label: '5.7-Liter V8 HEMI® MDS VVT Engine', price: 1450 },
    { label: 'Power Sunroof', price: 1095 },
    { label: 'Sport Performance Hood', price: 775 },
    { label: 'Black Tubular Side Steps', price: 425 },
    { label: '32-Gallon Fuel Tank', price: 405 },
    { label: 'Uconnect® 8.4 NAV', price: 795 },
    { label: '4-Corner Air Suspension', price: 1715 },
    { label: 'ParkSense® Front / Rear Park Assist', price: 445 },
    { label: 'Ram Box® Cargo Management System', price: 1295 },
    { label: 'Spray-In Bedliner', price: 495 },
    { label: 'Class IV Receiver Hitch', price: 345 },
    { label: 'Trailer Brake Control', price: 295 },
    { label: 'Rear Window Defroster', price: 195 },
    { label: 'Front & Rear Rubber Floor Mats', price: 125 },
    { label: '3.92 Rear Axle / Engine Block Heater', price: 190 },
    { label: 'Destination Charge', price: 1395, emphasized: true },
  ],
};

const RAM_MONRONEY = {
  styleLine: '1500 NIGHT EDITION CREW CAB 4X4',
  factorySpecs: {
    trim: 'Sport',
    series: 'DS',
    bodyClass: 'Pickup',
    bodyCabType: 'Crew/Super Crew/Crew Max',
    drivetrain: '4WD/4-Wheel Drive/4x4',
    plant: 'Warren',
    plantCountry: 'UNITED STATES (USA)',
  },
  baseMsrp: 44095,
  destinationCharge: 1395,
  totalMsrp: 59895,
  options: [
    {
      label: 'Leather-Trimmed Bucket Seats',
      price: 1545,
      category: 'option' as const,
      contents: [
        'Power 10-Way Driver / 6-Way Passenger Seats',
        'Heated and Ventilated Front Seats',
      ],
    },
    {
      label: 'Night Edition Package 26Q',
      price: 395,
      category: 'package' as const,
      contents: [
        'Flat Black "Ram 1500" Badge',
        'RAM 1500 Night Special Edition',
        'Black Painted Honeycomb Grille',
        '20-Inch x 8.0-Inch Painted Black Aluminum Wheels',
      ],
    },
    {
      label: 'Convenience Group',
      price: 545,
      category: 'package' as const,
      contents: [
        'Automatic High Beam Headlamp Control',
        'Keyless Enter \'n Go™',
        'Rain Sensitive Windshield Wipers',
      ],
    },
    {
      label: '9-Speaker Alpine® Premium Audio with Subwoofer',
      price: 345,
      category: 'option' as const,
      contents: ['9-Alpine® Speakers with Subwoofer'],
    },
    {
      label: 'Tri-Fold Tonneau Cover',
      price: 595,
      category: 'option' as const,
    },
    {
      label: '5.7-Liter V8 HEMI® MDS VVT Engine',
      price: 1450,
      category: 'option' as const,
    },
    {
      label: 'Power Sunroof',
      price: 1095,
      category: 'option' as const,
    },
    {
      label: 'Uconnect® 8.4 NAV',
      price: 795,
      category: 'option' as const,
      contents: ['GPS Navigation', 'SiriusXM Traffic / 5-Yr Traffic Subscription'],
    },
    {
      label: '4-Corner Air Suspension',
      price: 1715,
      category: 'option' as const,
    },
    {
      label: 'Ram Box® Cargo Management System',
      price: 1295,
      category: 'package' as const,
      contents: ['4 Adjustable Cargo Tie-Down Hooks', 'Bed Cargo Divider / Extender'],
    },
    {
      label: 'Spray-In Bedliner',
      price: 495,
      category: 'option' as const,
    },
  ],
  standardEquipment: [
    {
      category: 'Functional/Safety Features',
      items: [
        'Advanced Multistage Front Airbags',
        'Supplemental Side-Curtain Front and Rear Airbags',
        '3.21 Rear Axle Ratio',
        'Electric Shift-On-Demand Transfer Case',
        '26-Gallon Fuel Tank',
        'Remote Keyless Entry with All-Secure',
        'Anti-Lock 4-Wheel Disc Brakes',
        'ParkView™ Rear Back-Up Camera',
        'Speed Control',
        'Sentry Key® Theft Deterrent System',
      ],
    },
    {
      category: 'Interior Features',
      items: [
        'A/C Auto Temperature Control with Dual Zone Control',
        'Uconnect® 8.4',
        'Integrated Voice Command with Bluetooth®',
        'SiriusXM® Sat Radio w/ 1-Yr Radio Subscription',
        '6 Speakers',
        'Heated Seats and Wheel Group',
        'Leather-Wrapped Steering Wheel',
        'Steering Wheel Mounted Audio Controls',
      ],
    },
  ],
  fuelEconomy: { city: 15, highway: 21, combined: 17 },
  epa: {
    city: 15,
    highway: 21,
    combined: 17,
    gallonsPer100Mi: 5.9,
    annualFuelCost: 2350,
    fiveYearSavings: -4750,
    ghgRating: 3,
    smogRating: 6,
    co2GramsPerMile: 527,
    fuelType: 'Gasoline Vehicle',
  },
  safetyRatings: {
    overall: 4,
    frontalDriver: 4,
    frontalPassenger: 4,
    sideFrontSeat: 5,
    sideRearSeat: 5,
    rollover: 3,
  },
  partsContent: {
    usCanadianPercent: 56,
    majorForeignSources: [{ country: 'Mexico', percent: 29 }],
    engineOrigin: 'Mexico',
    transmissionOrigin: 'United States',
  },
  warranty: {
    items: [
      '5-year or 60,000-mile Powertrain Limited Warranty.',
      '3-year or 36,000-mile Basic Limited Warranty.',
    ],
    badge: '5 YEAR / 60,000 MILE POWERTRAIN WARRANTY',
  },
  manufacturerInfo: {
    name: 'FCA US LLC',
    website: 'www.ramtrucks.com',
    phone: '1-866-RAMINFO',
  },
  assembly: { plant: 'Warren, Michigan', country: 'U.S.A.' },
};

const FORD_WINDOW_STICKER_BREAKDOWN = {
  totalMsrp: 52100,
  lineItems: [
    { label: 'Base Price', price: 36705, emphasized: true },
    { label: 'XLT SuperCrew 4x4', price: 2895 },
    { label: '3.5L EcoBoost V6', price: 2195 },
    { label: 'Trailer Tow Package', price: 995 },
    { label: 'Sync 3 with Apple CarPlay', price: 325 },
    { label: 'Spray-In Bedliner', price: 595 },
    { label: 'Remote Start System', price: 250 },
    { label: 'Power-Sliding Rear Window', price: 350 },
    { label: 'Bed Divider', price: 275 },
    { label: 'Destination Charge', price: 1695, emphasized: true },
  ],
};

const RAM_SELLERS_NOTE = {
  subtitle:
    '2017 Ram 1500 Crew Cab Night Edition 4x4 – Fully Loaded, Zero Codes, Bulletproofed Suspension',
  intro:
    'If you are looking for a fully-loaded, turn-key truck that has already had all the expensive, common Ram maintenance issues taken care of, this is it.\n\nThis is a rare Flame Red Night Edition with almost $16,000 in factory upgrades. It has been meticulously cared for, mechanically vetted, and is ready for its next owner.',
  originalMsrp: 59895,
  blocks: [
    {
      title: 'The Peace of Mind Guarantee',
      icon: '🛡️',
      body: "Let's talk about the elephant in the room with 4th Gen Rams: the factory air suspension. It's notorious for failing and costing thousands to fix. I have already paid to have the factory air ride professionally deleted and converted to a premium conventional coil/shock suspension. You get the perfect ride height with zero anxiety about winter suspension failures.\n\nAdditionally, this truck was just evaluated by a major commercial truck buying center. It was thoroughly test-driven and throws ZERO diagnostic codes.",
      images: [
        'https://picsum.photos/seed/peace1/400/300',
        'https://picsum.photos/seed/peace2/400/300',
        'https://picsum.photos/seed/peace3/400/300',
      ],
    },
    {
      title: 'Recent Maintenance & Upgrades',
      icon: '🔧',
      body: "I don't believe in passing off worn-out parts to the next guy. In preparation for this sale, I have invested heavily in making sure this truck is perfect:\n\n• Brand New Tires\n• Brand New Hubs and Bearings\n• Bulletproofed Suspension (Air-ride delete mentioned above)\n• Fresh Cosmetic Restoration: Just got out of the body shop to have minor scratches and door dings professionally removed. The exterior looks phenomenal.",
      images: [
        'https://picsum.photos/seed/maint1/400/300',
        'https://picsum.photos/seed/maint2/400/300',
        'https://picsum.photos/seed/maint3/400/300',
      ],
    },
    {
      title: 'The Ultimate Utility & Towing Rig',
      icon: '🧰',
      body: "This truck isn't just a pavement princess; it is optioned for serious work.\n\n• RamBox® Cargo Management System: Lockable, weatherproof, and drainable bedside boxes.\n• Hidden In-Floor Storage: The rear footwells feature insulated, hidden storage bins.\n• Heavy Duty Towing: 5.7L HEMI V8 paired with the highly desirable 3.92 Rear Axle Ratio and Anti-Spin Differential.\n• Bed Setup: Factory Spray-in Bedliner, Tri-Fold Tonneau Cover, and Bed Cargo Divider/Extender.",
      images: [
        'https://picsum.photos/seed/util1/400/300',
        'https://picsum.photos/seed/util2/400/300',
        'https://picsum.photos/seed/util3/400/300',
      ],
    },
    {
      title: 'Luxury Options (Original $60k MSRP)',
      icon: '💎',
      body: "You will be hard-pressed to find a truck with more interior features than this one:\n\n• Interior Comfort: Black Leather-Trimmed Bucket Seats that are both Heated and Ventilated. Heated Leather steering wheel. Power Sunroof.\n• Tech & Audio: Uconnect 8.4 NAV with Apple/Android capability, backed by the 9-Speaker Alpine Premium Audio System with Subwoofer.\n• Exterior Styling: Sport Performance Hood, Flat Black Badging, Black Painted Honeycomb Grille, 20-inch Black Aluminum Wheels.\n• Convenience: Keyless Enter 'n Go, Remote Start, Rain-Sensitive Wipers, and ParkSense Front/Rear Park Assist.",
      images: [
        'https://picsum.photos/seed/lux1/400/300',
        'https://picsum.photos/seed/lux2/400/300',
        'https://picsum.photos/seed/lux3/400/300',
      ],
    },
  ],
  ctaText:
    "This truck represents a massive value. Dealers are selling standard, stripped-down trades for this price. KBB Private Party values this exact spec and condition at over $23,500.\n\nClean title in hand. Serious inquiries only. Come take it for a test drive and see for yourself—you won't find a better-equipped, better-sorted 2017 Ram on the market right now.",
};

const RAM_MECHANICAL_INTEGRITY = {
  intro:
    'Most used Rams in this mileage bracket face expensive repairs. We have proactively addressed the two most common "pain points" for this generation, ensuring this truck is turn-key for the next 100,000 miles.',
  items: [
    {
      title: 'Air Suspension Delete',
      text: 'Converted to heavy-duty regular shocks. Eliminates the risk of the $3,000 factory air-ride failure common in cold climates.',
    },
    {
      title: 'Drivetrain Refresh',
      text: 'Brand new hubs and bearings installed. Smooth, quiet, and vibration-free operation at highway speeds.',
    },
    {
      title: 'New All-Terrain Rubber',
      text: 'Fresh tires provide maximum traction and improved ride quality. Zero immediate maintenance needed.',
    },
  ],
};

const RAM_DOCUMENTS_BANNER = {
  title: 'Aesthetic Restoration',
  description:
    'Currently undergoing full professional paint correction and dent repair to ensure Good-to-Excellent exterior status.',
  badges: ['No Accidents', 'Clean Title'],
};

const FORD_SELLERS_NOTE = {
  subtitle: '2020 Ford F-150 XLT SuperCrew 4x4 – Low Miles, Tow Ready',
  intro:
    'Well-maintained XLT SuperCrew with documented service history and a clean Carfax. Ideal daily driver and weekend hauler.',
  blocks: [
    {
      title: 'Ready to Work',
      icon: '🧰',
      body: 'Factory trailer tow package, spray-in bedliner, and power-sliding rear window make this truck ready for jobsite or campsite duty from day one.',
    },
    {
      title: 'Comfort & Tech',
      icon: '💎',
      body: 'Sync 3 with Apple CarPlay, remote start, and spacious SuperCrew seating for family and crew.',
    },
  ],
  ctaText:
    'Priced for a quick private sale. Contact me to schedule a test drive in Mesa.',
};

const FORD_MECHANICAL_INTEGRITY = {
  intro: 'Recent service keeps this low-mileage F-150 turn-key for its next owner.',
  items: [
    {
      title: 'Fresh Fluids',
      text: 'Recent oil change, tire rotation, and transmission fluid service documented in service history.',
    },
    {
      title: 'Brakes Inspected',
      text: 'Brake inspection completed with front pads at 70% — no immediate brake work required.',
    },
  ],
};

const FORD_DOCUMENTS_BANNER = {
  title: 'Clean History',
  description: 'Non-smoker, no accidents reported. Clean title in hand.',
  badges: ['No Accidents', 'Clean Title'],
};

async function runSeed() {
  const createdAt = new Date().toISOString();
  const DUMMY_PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  const userData = UserSchema.parse({
    displayName: 'Justin F.',
    stats: { averageRating: 4.9, itemsSold: 2 },
  });

  const vehicles = [
      VehicleSchema.parse({
        year: 2017,
        make: 'RAM',
        model: '1500',
        price: 42500,
        mileage: 85000,
        description:
          'Well-maintained 2017 RAM 1500 Night Edition with Hemi V8, 4x4, and clean Carfax. One owner, garage kept.',
        images: [
          'https://picsum.photos/seed/ram1/800/600',
          'https://picsum.photos/seed/ram2/800/600',
          'https://picsum.photos/seed/ram3/800/600',
          'https://picsum.photos/seed/ram4/800/600',
        ],
        status: 'active',
        sellerId: USER_ID,
        sellerName: 'Justin F.',
        location: { geohash: '9tbq3n', city: 'Phoenix, AZ' },
        tags: ['truck', '4x4'],
        vin: '1C6RR7MT3HS761025',
        createdAt,
        specs: {
          exteriorColor: 'Flame Red Clear Coat Exterior Paint',
          interiorColor: 'Black Interior Color',
          transmission: '8-Speed Automatic 8HP70 Transmission',
          engine: '5.7-Liter V8 HEMI® MDS VVT Engine',
          drivetrain: '4WD Fully Loaded',
        },
        features: [
          'Night Edition Package',
          'Ram Box Cargo Management',
          'Leather-Trimmed Bucket Seats',
          'Tow Package',
          'Apple CarPlay / Android Auto',
        ],
        maintenance: [
          { date: '2024-11-15', service: 'Full synthetic oil change and filter' },
          { date: '2024-06-02', service: 'Front brake pads and rotors replaced' },
          { date: '2023-09-20', service: 'Air suspension delete — coilover conversion' },
        ],
        documents: {
          kbbReport: DUMMY_PDF,
          carfaxReport: DUMMY_PDF,
          smogReport: DUMMY_PDF,
        },
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        videoPosterUrl: 'https://picsum.photos/seed/ramVideoPoster/1280/720',
        windowStickerBreakdown: RAM_WINDOW_STICKER_BREAKDOWN,
        monroney: RAM_MONRONEY,
        galleryPhotos: [
          {
            url: 'https://picsum.photos/seed/ramGalleryExterior/800/600',
            category: 'Exterior',
            caption: 'Night Edition Exterior',
            alt: 'The Flame Red paint contrasting with the blacked-out Night Edition grille, 20-inch black wheels, and Sport Performance Hood.',
          },
          {
            url: 'https://picsum.photos/seed/ramGalleryInterior/800/600',
            category: 'Interior',
            caption: 'Luxury Interior',
            alt: 'The pristine black leather bucket seats (heated/ventilated), Uconnect 8.4 NAV screen, and sunroof.',
          },
          {
            url: 'https://picsum.photos/seed/ramGalleryUtility/800/600',
            category: 'Utility & Upgrades',
            caption: 'RamBox & Utility',
            alt: 'The RamBox Cargo Management system open and illuminated, the hidden rear footwell storage boxes, and the Tri-Fold Tonneau cover.',
          },
          {
            url: 'https://picsum.photos/seed/ramGalleryUpgrades/800/600',
            category: 'Utility & Upgrades',
            caption: 'Bulletproofed Suspension & New Tires',
            alt: 'A shot showing the new tires and the upgraded conventional coil/shock suspension (air-ride delete).',
          },
        ],
        marketValuation: {
          contextText:
            'While algorithmic offers from dealers focus on wholesale turnover, a true market analysis illustrates the replacement cost for a vehicle of this specific configuration and condition. Finding an equivalent 2017 Ram 1500 Night Edition in Good to Excellent condition with roughly 85,000 miles is currently incredibly difficult, driving up its intrinsic value.',
          dealerRealityText:
            'Dealerships price these trucks at a premium, then frequently add mandatory documentation fees, prep fees, and taxes that drive the "out-the-door" cost even higher. Typical dealer retail for comparable Night Edition trucks runs $25,500 - $26,500+.',
          kbbText:
            'The specific target value based on mileage and standard options. The recognized fair market range is $22,552 - $24,752 for a private transaction in Good condition.',
          justificationText:
            "A fair, data-backed price that reflects the truck's pristine mechanical state and thousands in recent maintenance.",
          comparables: [
            {
              label: 'Dealer',
              color: 'Gray',
              sourceUrl: 'https://www.carmax.com/',
              year: 2017,
              make: 'RAM',
              model: '1500',
              trim: 'Big Horn',
              drivetrain: '4WD',
              mileage: 118000,
              price: 24495,
            },
            {
              label: 'Dealer',
              color: 'Black',
              sourceUrl: 'https://www.carvana.com/',
              year: 2017,
              make: 'RAM',
              model: '1500',
              trim: 'Night Edition',
              drivetrain: '4WD',
              mileage: 98000,
              price: 24593,
            },
            {
              label: 'Dealer',
              color: 'Flame Red',
              sourceUrl: 'https://www.autotrader.com/',
              year: 2017,
              make: 'RAM',
              model: '1500',
              trim: 'Night Edition',
              drivetrain: '4WD',
              mileage: 94000,
              price: 25999,
            },
            {
              label: 'Dealer',
              color: 'White',
              sourceUrl: 'https://www.cars.com/',
              year: 2017,
              make: 'RAM',
              model: '1500',
              trim: 'Laramie',
              drivetrain: '4WD',
              mileage: 89000,
              price: 29244,
            },
          ],
        },
        sellersNote: RAM_SELLERS_NOTE,
        mechanicalIntegrity: RAM_MECHANICAL_INTEGRITY,
        documentsBanner: RAM_DOCUMENTS_BANNER,
      }),
      VehicleSchema.parse({
        year: 2020,
        make: 'Ford',
        model: 'F-150',
        price: 38900,
        mileage: 42000,
        description:
          '2020 Ford F-150 XLT SuperCrew with tow package and low miles. Non-smoker, no accidents.',
        images: [
          'https://picsum.photos/seed/ford1/800/600',
          'https://picsum.photos/seed/ford2/800/600',
          'https://picsum.photos/seed/ford3/800/600',
        ],
        status: 'active',
        sellerId: USER_ID,
        sellerName: 'Justin F.',
        location: { geohash: '9tbq3p', city: 'Mesa, AZ' },
        tags: ['truck', 'crew-cab'],
        vin: '1FTEW1E50LFA12345',
        createdAt,
        specs: {
          exteriorColor: 'Oxford White',
          interiorColor: 'Medium Earth Gray',
          transmission: '10-Speed Automatic',
          engine: '3.5L EcoBoost V6',
          drivetrain: '4WD SuperCrew',
        },
        features: [
          'XLT SuperCrew',
          'Trailer Tow Package',
          'Sync 3 with Apple CarPlay',
          'Bed Liner',
          'Remote Start',
        ],
        maintenance: [
          { date: '2025-01-10', service: 'Oil change and tire rotation' },
          { date: '2024-08-22', service: 'Transmission fluid service' },
          { date: '2024-03-05', service: 'Brake inspection — pads at 70%' },
        ],
        documents: {
          kbbReport: DUMMY_PDF,
          carfaxReport: DUMMY_PDF,
          smogReport: DUMMY_PDF,
        },
        videoUrl: 'https://www.youtube.com/watch?v=9xwazD5SyVg',
        videoPosterUrl: 'https://picsum.photos/seed/fordVideoPoster/1280/720',
        windowStickerBreakdown: FORD_WINDOW_STICKER_BREAKDOWN,
        galleryPhotos: [
          {
            url: 'https://picsum.photos/seed/fordGalleryExterior/800/600',
            category: 'Exterior',
            caption: 'Oxford White Exterior',
            alt: 'Clean Oxford White F-150 XLT SuperCrew with chrome accents and tow package.',
          },
          {
            url: 'https://picsum.photos/seed/fordGalleryInterior/800/600',
            category: 'Interior',
            caption: 'XLT Interior',
            alt: 'Medium Earth Gray cloth seats with Sync 3 touchscreen and Apple CarPlay.',
          },
          {
            url: 'https://picsum.photos/seed/fordGalleryBed/800/600',
            category: 'Utility & Upgrades',
            caption: 'Bed & Tow Package',
            alt: 'Spray-in bedliner, trailer hitch, and power-sliding rear window.',
          },
        ],
        marketValuation: {
          contextText:
            'Market context for a well-maintained 2020 F-150 XLT SuperCrew with low miles. Private party pricing typically undercuts dealer retail while offering comparable equipment.',
          dealerRealityText:
            'Dealer listings for similar XLT SuperCrew 4x4 trucks commonly list at $40,000 - $42,000 before fees and add-ons.',
          kbbText:
            'KBB private party range for this configuration in Good condition is approximately $36,500 - $39,500.',
          justificationText:
            'Priced competitively for a private sale with documented maintenance and clean history.',
          comparables: [
            {
              label: 'Dealer',
              color: 'Oxford White',
              sourceUrl: 'https://www.carvana.com/',
              year: 2020,
              make: 'Ford',
              model: 'F-150',
              trim: 'XLT SuperCrew',
              drivetrain: '4WD',
              mileage: 52000,
              price: 41500,
            },
            {
              label: 'Dealer',
              color: 'Agate Black',
              sourceUrl: 'https://www.carmax.com/',
              year: 2020,
              make: 'Ford',
              model: 'F-150',
              trim: 'Lariat',
              drivetrain: '4WD',
              mileage: 38000,
              price: 42900,
            },
            {
              label: 'Dealer',
              color: 'Blue Jeans',
              sourceUrl: 'https://www.autotrader.com/',
              year: 2019,
              make: 'Ford',
              model: 'F-150',
              trim: 'XLT',
              drivetrain: '4WD',
              mileage: 45000,
              price: 40200,
            },
          ],
        },
        sellersNote: FORD_SELLERS_NOTE,
        mechanicalIntegrity: FORD_MECHANICAL_INTEGRITY,
        documentsBanner: FORD_DOCUMENTS_BANNER,
      }),
    ];

    await db().collection('users').doc(USER_ID).set(userData);
    await Promise.all(
      vehicles.map((vehicle, i) =>
        db().collection('vehicles').doc(VEHICLE_IDS[i]).set(vehicle)
      )
    );

    return {
      success: true as const,
      userId: USER_ID,
      vehicleIds: [...VEHICLE_IDS],
    };
}

function forbiddenResponse() {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

function seedResponse(result: Awaited<ReturnType<typeof runSeed>>) {
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse() {
  return new Response(JSON.stringify({ error: 'Failed to seed database' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async () => {
  if (!import.meta.env.DEV) return forbiddenResponse();

  try {
    return seedResponse(await runSeed());
  } catch (error) {
    console.error('GET /api/dev/seed failed', error);
    return errorResponse();
  }
};

export const POST: APIRoute = async () => {
  if (!import.meta.env.DEV) return forbiddenResponse();

  try {
    return seedResponse(await runSeed());
  } catch (error) {
    console.error('POST /api/dev/seed failed', error);
    return errorResponse();
  }
};
