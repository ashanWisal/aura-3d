/**
 * Home view — a Server Component.
 *
 * The preloader draws the headphones in text; then the story (one pinned
 * WebGL stage, captioned in five chapters) turns them, closes in on the
 * materials, takes them apart and puts them back. After it, the shop:
 * finishes, sound, every day (the moments ring), specs, reviews, pre-order
 * and the footer. Sections are
 * client leaves where they need to be, so this view stays a Server Component;
 * everything after the story hydrates in an idle period.
 */
import {
  buyContent,
  chapters,
  colourways,
  coloursContent,
  footerContent,
  headerContent,
  momentsContent,
  preloaderContent,
  reviewsContent,
  soundContent,
  specsContent,
  storyLabel,
} from "@/data/home";
import { siteConfig } from "@/lib/site";
import { getProductStructuredData } from "@/utils/seo/structured-data";
import { HydrateWhenIdle } from "@/components/common/hydrate-when-idle";
import { RobotProvider, RobotView } from "@/components/common/robot-view";
import { BuySection } from "@/views/home/buy-section";
import { FinishesSection } from "@/views/home/finishes-section";
import { MomentsSection } from "@/views/home/moments-section";
import { Preloader } from "@/views/home/preloader";
import { ProductStory } from "@/views/home/product-story";
import { ReviewsSection } from "@/views/home/reviews-section";
import { SiteFooter } from "@/views/home/site-footer";
import { SiteHeader } from "@/views/home/site-header";
import { SoundSection } from "@/views/home/sound-section";
import { SpecsSection } from "@/views/home/specs-section";

export interface HomeViewProps {
  /**
   * The robot form (D-016, `app/robot-view`): no preloader, every entrance at
   * rest in the served HTML, and a static gradient in place of the WebGL.
   */
  robot?: boolean;
}

const productData = getProductStructuredData({
  name: buyContent.product,
  description: siteConfig.description,
  price: buyContent.priceValue,
  currency: buyContent.currency,
  colours: colourways.map((item) => item.name),
});

export const HomeView = ({ robot = false }: HomeViewProps) => (
  <RobotProvider robot={robot}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productData) }} />
    {robot ? <RobotView /> : <Preloader content={preloaderContent} />}
    <SiteHeader content={headerContent} />
    <main id="top" className="isolate">
      <ProductStory chapters={chapters} label={storyLabel} />
      <HydrateWhenIdle>
        <FinishesSection content={coloursContent} colourways={colourways} />
        <SoundSection content={soundContent} />
        <MomentsSection content={momentsContent} />
        <SpecsSection content={specsContent} />
        <ReviewsSection content={reviewsContent} />
        <BuySection content={buyContent} colourways={colourways} />
      </HydrateWhenIdle>
    </main>
    <HydrateWhenIdle>
      <SiteFooter content={footerContent} />
    </HydrateWhenIdle>
  </RobotProvider>
);
