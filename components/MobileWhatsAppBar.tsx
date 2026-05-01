import { MobileWhatsAppBarClient } from "@/components/MobileWhatsAppBarClient";
import { siteConfig } from "@/config/site";
import { getSetting, getSiteSettings } from "@/lib/siteData";
import { whatsappUrl } from "@/lib/whatsapp";

export async function MobileWhatsAppBar() {
  const settings = await getSiteSettings();
  const whatsappRetail =
    getSetting(settings, "whatsapp_retail") ||
    getSetting(settings, "whatsapp_wholesale") ||
    siteConfig.whatsappRetail ||
    siteConfig.whatsappWholesale;

  return (
    <MobileWhatsAppBarClient
      href={whatsappUrl(whatsappRetail, "Hi, I want to ask about LM Dkbrand products.")}
    />
  );
}
