/**
 * Home page content — the product story, the shop sections and the footer.
 * The story is rendered live in WebGL (src/views/home/headphones/); this
 * module holds its copy, the colourways the model is painted in, and
 * everything the shop sections print.
 */

/** Accessible name of the story section. */
export const storyLabel =
  "Aura One: the headphones turn under a spotlight, show their frame and materials up close, come apart into their inner parts and click back together";

export interface ChapterContent {
  id: string;
  /** "01" … shown in the chapter mark. */
  index: string;
  zone: string;
  headlineLines: string[];
  body: string;
  /** Details in the bottom ticker. */
  readouts: string[];
  /**
   * Where the headline sits — each chapter takes the corner the headphones
   * leave free at that point of the story; the body takes the opposite
   * bottom corner.
   */
  layout: "bottom-left" | "top-right" | "bottom-right" | "top-left";
  /** Oversized faded words behind the headphones, if the chapter has them. */
  ghostLines?: string[];
}

export const chapters: ChapterContent[] = [
  {
    id: "aura-one",
    layout: "bottom-left",
    index: "01",
    zone: "Aura One · Over-ear",
    headlineLines: ["Silence,", "made by hand."],
    body: "Wireless over-ear headphones machined from one block of aluminium, wrapped in lambskin and tuned by ear in our studio. Scroll to take them apart.",
    readouts: ["Aura One", "Over-ear · Wireless", "Hand-finished", "Adaptive noise cancelling", "60-hour battery", "From $549"],
  },
  {
    id: "frame",
    layout: "top-right",
    index: "02",
    zone: "The frame",
    headlineLines: ["Every angle", "considered."],
    body: "A single sweep of aluminium from ear to ear. The yokes pivot on steel pins, the headband slides on silent detents, and nothing creaks.",
    readouts: ["6061 aluminium", "Steel pivot pins", "12 detent positions", "Weight 268 g", "No visible screws"],
  },
  {
    id: "materials",
    layout: "top-left",
    index: "03",
    zone: "Materials",
    headlineLines: ["Close enough", "to touch."],
    body: "Bead-blasted, then hand-brushed, then anodised. Memory-foam cushions in lambskin so soft you forget they're on.",
    readouts: ["Bead-blasted finish", "Hand-brushed", "Lambskin cushions", "Memory foam", "Replaceable pads"],
    ghostLines: ["Feel", "the quiet"],
  },
  {
    id: "inside",
    layout: "bottom-left",
    index: "04",
    zone: "Inside",
    headlineLines: ["Forty parts.", "No compromises."],
    body: "Cushion, acoustic grille, a 40 mm beryllium driver, eight microphones, the board that runs them, and a battery that lasts a week of commuting.",
    readouts: ["40 mm beryllium driver", "8 microphones", "Custom DSP board", "1 200 mAh cell", "Acoustic mesh grille"],
  },
  {
    id: "together",
    layout: "top-right",
    index: "05",
    zone: "One quiet",
    headlineLines: ["Back together.", "Built to last."],
    body: "Every part clicks back into place, and every part can be replaced. Built to be repaired, not thrown away.",
    readouts: ["Repairable by design", "2-year warranty", "Free pad replacement", "Recycled packaging"],
  },
];

/** A label pinned to one part of the right ear cup while the headphones are apart. */
export interface CalloutContent {
  part: "cushion" | "driver" | "board" | "battery" | "cap";
  label: string;
  detail: string;
}

/** The exploded view's callouts, from the head outwards. */
export const insideCallouts: CalloutContent[] = [
  { part: "cushion", label: "Lambskin cushion", detail: "Memory foam" },
  { part: "driver", label: "40 mm driver", detail: "Beryllium dome" },
  { part: "board", label: "DSP board", detail: "8 microphones" },
  { part: "battery", label: "1 200 mAh cell", detail: "60-hour battery" },
  { part: "cap", label: "Aluminium cap", detail: "Bead-blasted" },
];

/** One finish the model can be painted in. Colours are sRGB hex. */
export interface Colourway {
  id: string;
  name: string;
  description: string;
  /** Swatch shown on the picker. */
  swatch: string;
  shell: string;
  leather: string;
  metal: string;
}

export const colourways: Colourway[] = [
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Gunmetal frame, black anodised cups, black lambskin.",
    swatch: "#1b1a1e",
    shell: "#18171b",
    leather: "#1f1d21",
    metal: "#8d8a84",
  },
  {
    id: "sand",
    name: "Sand",
    description: "Champagne frame, warm stone cups, natural lambskin.",
    swatch: "#d6cbb8",
    shell: "#d4c9b6",
    leather: "#a8957a",
    metal: "#d8c39b",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Silver frame, deep blue cups, navy lambskin.",
    swatch: "#1f2d42",
    shell: "#1d2b40",
    leather: "#243246",
    metal: "#b9bec6",
  },
];

export const coloursContent = {
  eyebrow: "06 — Finishes",
  heading: "Pick your finish",
  hint: "Drag to turn",
  legend: "Finish",
};

export interface SoundFeature {
  index: string;
  name: string;
  description: string;
}

export const soundContent = {
  eyebrow: "07 — Sound",
  headingLines: ["What you hear,", "and what you don't."],
  features: [
    { index: "01", name: "Adaptive noise cancelling", description: "Eight microphones listen to the room 50 000 times a second and cancel up to 42 dB of it." },
    { index: "02", name: "Beryllium drivers", description: "A 40 mm dome stiff enough to stay perfectly still at the edges — clean bass, no smear." },
    { index: "03", name: "Spatial audio", description: "Head-tracked sound that stays put when you turn, so a film still sounds like a room." },
    { index: "04", name: "Lossless over the air", description: "24-bit / 96 kHz over Bluetooth 5.4 with LDAC and aptX Lossless." },
    { index: "05", name: "Sixty hours", description: "Two and a half days of playback with noise cancelling on. Ten minutes on the cable gives five hours." },
  ] satisfies SoundFeature[],
  marquee: ["Noise cancelling −42 dB", "Beryllium 40 mm", "Spatial audio", "LDAC · aptX Lossless", "60 hours", "USB-C fast charge"],
};

/** One moment on the arc around the headphones. `icon` keys the icon in <MomentsOrbit>. */
export interface Moment {
  icon: "commute" | "flight" | "focus" | "calls" | "films" | "studio" | "gaming" | "devices" | "travel" | "charge";
  name: string;
  description: string;
}

export const momentsContent = {
  eyebrow: "08 — Every day",
  headingLines: ["One pair,", "every moment."],
  /** The first `perSide` moments sit on the left arc, the rest on the right. */
  perSide: 5,
  moments: [
    { icon: "commute", name: "Commute", description: "Adaptive noise cancelling takes out the train and lets the announcements through." },
    { icon: "flight", name: "Long flights", description: "Sixty hours with noise cancelling on — there and back, twice." },
    { icon: "focus", name: "Deep focus", description: "Up to 42 dB of the room, gone. The office goes quiet, you don't." },
    { icon: "calls", name: "Calls", description: "Eight microphones keep your voice and lose the café behind you." },
    { icon: "films", name: "Films", description: "Head-tracked spatial audio turns a laptop into a small cinema." },
    { icon: "studio", name: "Studio", description: "24-bit / 96 kHz lossless over the air, or bit-perfect over USB-C." },
    { icon: "gaming", name: "Gaming", description: "Low-latency mode keeps footsteps in time with the screen." },
    { icon: "devices", name: "Two devices", description: "Laptop and phone at once — a call on one takes over from music on the other." },
    { icon: "travel", name: "Travel", description: "Folds into its travel case, with both cables, for the bag." },
    { icon: "charge", name: "Quick charge", description: "Ten minutes on USB-C gives five hours of play." },
  ] satisfies Moment[],
  cta: "Pre-order — $549",
  ctaHref: "#buy",
};

export interface Stat {
  value: string;
  label: string;
}

export interface Spec {
  name: string;
  value: string;
}

export const specsContent = {
  eyebrow: "09 — Specifications",
  heading: "The numbers",
  stats: [
    { value: "268 g", label: "Lighter than it looks" },
    { value: "60 h", label: "Battery with noise cancelling on" },
    { value: "−42 dB", label: "Of the room, gone" },
    { value: "5 Hz", label: "Lowest note the driver reaches" },
  ] satisfies Stat[],
  specs: [
    { name: "Driver", value: "40 mm beryllium dome, neodymium magnet" },
    { name: "Frequency response", value: "5 Hz – 40 kHz" },
    { name: "Noise cancelling", value: "Adaptive, 8 microphones, up to 42 dB" },
    { name: "Connectivity", value: "Bluetooth 5.4 · LDAC · aptX Lossless · USB-C audio" },
    { name: "Battery", value: "60 h (ANC on), 80 h (ANC off) · 10 min = 5 h" },
    { name: "Weight", value: "268 g" },
    { name: "Materials", value: "6061 aluminium, steel, lambskin, memory foam" },
    { name: "In the box", value: "Aura One, travel case, USB-C cable, 3.5 mm cable" },
  ] satisfies Spec[],
};

export interface Review {
  quote: string;
  name: string;
  role: string;
}

export const reviewsContent = {
  eyebrow: "10 — Reviews",
  heading: "What people say",
  reviews: [
    { quote: "I wore them on a twelve-hour flight and forgot they were on. The cabin just disappeared.", name: "Maya R.", role: "Sound designer" },
    { quote: "The first wireless pair I've heard that doesn't sound wireless. The bass is tight and the mids are honest.", name: "Daniel K.", role: "Mastering engineer" },
    { quote: "They feel like a watch, not a gadget. Every hinge moves like it was meant to.", name: "Sana A.", role: "Product designer" },
  ] satisfies Review[],
  press: ["“The quietest headphones we've tested” — Sound Weekly", "“A design object you can actually use” — Studio Journal", "“Ten out of ten for comfort” — Commute Review", "“Repairable and beautiful” — Long Life Tech"],
};

export const buyContent = {
  eyebrow: "11 — Pre-order",
  heading: "Make it yours",
  product: "Aura One",
  price: "$549",
  /** The same price for structured data. */
  priceValue: "549",
  currency: "USD",
  shipping: "Ships in November. Free delivery and returns.",
  inTheBox: ["Aura One headphones", "Hard-shell travel case", "USB-C cable", "3.5 mm audio cable"],
  inTheBoxHeading: "In the box",
  legend: "Finish",
  form: {
    name: "Name",
    email: "Email",
    submit: "Pre-order",
    sending: "Sending…",
    success: "You're on the list. We'll email you before your pair ships.",
    error: "Something went wrong. Please try again.",
    note: "No payment now — we'll email you to confirm before anything is charged.",
  },
};

export const footerContent = {
  runningLine: "Hear less. Feel more.",
  cta: "Talk to us",
  email: "hello@aura.audio",
  blurb: "Aura One — a scroll-driven WebGL product page. A frontend portfolio project; the product and brand are fictional.",
  backToTop: "Back to the top ↑",
  /** The headphones' outer model is CC BY 4.0 — the licence requires this credit. */
  modelCredit: {
    label: "3D model “Headphones” by SofiaWolfie",
    href: "https://sketchfab.com/3d-models/headphones-a3b8d6252b01483194870138d48f040b",
    license: "CC BY 4.0",
    licenseHref: "https://creativecommons.org/licenses/by/4.0/",
  },
};

export const headerContent = {
  name: "Aura",
  nav: [
    { label: "Finishes", href: "#finishes" },
    { label: "Sound", href: "#sound" },
    { label: "Specs", href: "#specs" },
    { label: "Reviews", href: "#reviews" },
  ],
  cta: { label: "Pre-order — $549", href: "#buy" },
  clockLabel: "Studio",
  clockInitial: "00:00:00",
};

export const preloaderContent = {
  brand: "Aura One",
  status: "Tuning",
  /** The headphones drawn in text, revealed line by line while loading. */
  asciiArt: [
    "        .-~~~~~~~~~-.        ",
    "      .'             '.      ",
    "     /                 \\     ",
    "    |                   |    ",
    "    |                   |    ",
    "  .-+-.               .-+-.  ",
    " / ### \\             / ### \\ ",
    "| ##### |           | ##### |",
    "| ##### |           | ##### |",
    " \\ ### /             \\ ### / ",
    "  '---'               '---'  ",
  ],
};
