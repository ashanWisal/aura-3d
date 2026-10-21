/**
 * Copy for the privacy policy the cookie banner and its preferences modal link
 * to.
 *
 * ⚠️ This is generic boilerplate, not legal advice. It exists so the link
 * resolves — a linked page that 404s is a broken promise to the reader, a
 * console error, and a crawl error. Have counsel review and replace it before
 * launch, and keep `updated` honest.
 */
import type { LegalSection } from "@/views/legal/legal-document";

export const LEGAL_UPDATED = "Last updated 2 October 2026";

export const privacyPolicy: {
  title: string;
  intro: string;
  sections: readonly LegalSection[];
} = {
  title: "Privacy Policy",
  intro: "This policy explains what Aura collects when you use this website, why we collect it, and the choices you have.",
  sections: [
    {
      heading: "What we collect",
      body: [
        "This site has no forms and no accounts. If you write to us by email, we receive your address and whatever you choose to put in the message. The site itself stores one thing in your browser: your cookie choice, so we do not ask again.",
        "Like most websites, our hosting provider records standard technical information with each request — IP address, browser and device type, and the pages requested. This is used to keep the site running and secure.",
      ],
    },
    {
      heading: "Cookies and analytics",
      body: [
        "The site sets only the cookies needed to remember your cookie choices. Any analytics or marketing cookies are off until you accept them, and you can change your decision at any time through the cookie preferences on this site.",
      ],
    },
    {
      heading: "How we use it",
      body: [
        "We use what you send us to answer you, and your cookie choice to respect it on your next visit. We do not sell your information, and we do not use it for unrelated marketing without asking first.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "We keep what you send us for as long as we need it to answer you and to meet our legal obligations, then delete it.",
      ],
    },
    {
      heading: "Your rights",
      body: ["You can ask us for a copy of what we hold about you, ask us to correct it, or ask us to delete it. Write to the address below and we will respond."],
    },
    {
      heading: "Contact",
      body: ["Aura Audio — hello@aura.audio."],
    },
  ],
};
