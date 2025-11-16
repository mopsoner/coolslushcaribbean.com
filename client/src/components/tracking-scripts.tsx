import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Setting } from "@shared/schema";

// Validation functions to prevent XSS
const validateGoogleAnalytics = (id: string): boolean => {
  return /^G-[A-Z0-9]{10}$/.test(id);
};

const validateFacebookPixel = (id: string): boolean => {
  return /^\d{15,16}$/.test(id);
};

const validateGoogleTagManager = (id: string): boolean => {
  return /^GTM-[A-Z0-9]{7,}$/.test(id);
};

const validateMicrosoftClarity = (id: string): boolean => {
  return /^[a-z0-9]{10}$/.test(id);
};

const validateTikTokPixel = (id: string): boolean => {
  return /^[A-Z0-9]{20}$/.test(id);
};

// Helper to inject Google Analytics
const injectGoogleAnalytics = (measurementId: string) => {
  if (!validateGoogleAnalytics(measurementId)) {
    console.error("Invalid Google Analytics ID format");
    return;
  }
  // Remove existing script if any
  const existingScript = document.querySelector('script[src*="googletagmanager.com/gtag"]');
  if (existingScript) return;

  // Add gtag script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Add gtag initialization
  const inlineScript = document.createElement("script");
  inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(inlineScript);
};

// Helper to inject Facebook Pixel
const injectFacebookPixel = (pixelId: string) => {
  if (!validateFacebookPixel(pixelId)) {
    console.error("Invalid Facebook Pixel ID format");
    return;
  }
  const existingScript = document.querySelector('script[src*="connect.facebook.net"]');
  if (existingScript) return;

  const script = document.createElement("script");
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(script);
};

// Helper to inject Google Tag Manager
const injectGoogleTagManager = (gtmId: string) => {
  if (!validateGoogleTagManager(gtmId)) {
    console.error("Invalid Google Tag Manager ID format");
    return;
  }
  const existingScript = document.querySelector('script[src*="googletagmanager.com/gtm.js"]');
  if (existingScript) return;

  const script = document.createElement("script");
  script.innerHTML = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${gtmId}');
  `;
  document.head.appendChild(script);
};

// Helper to inject Microsoft Clarity
const injectMicrosoftClarity = (projectId: string) => {
  if (!validateMicrosoftClarity(projectId)) {
    console.error("Invalid Microsoft Clarity ID format");
    return;
  }
  const existingScript = document.querySelector('script[src*="clarity.ms"]');
  if (existingScript) return;

  const script = document.createElement("script");
  script.innerHTML = `
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${projectId}");
  `;
  document.head.appendChild(script);
};

// Helper to inject TikTok Pixel
const injectTikTokPixel = (pixelId: string) => {
  if (!validateTikTokPixel(pixelId)) {
    console.error("Invalid TikTok Pixel ID format");
    return;
  }
  const existingScript = document.querySelector('script[src*="analytics.tiktok.com"]');
  if (existingScript) return;

  const script = document.createElement("script");
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
      ttq.page();
    }(window, document, 'ttq');
  `;
  document.head.appendChild(script);
};

export default function TrackingScripts() {
  const { data: settings } = useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (!settings) return;

    settings.forEach((setting) => {
      if (!setting.active || !setting.value) return;

      switch (setting.key) {
        case "google_analytics":
          injectGoogleAnalytics(setting.value);
          break;
        case "facebook_pixel":
          injectFacebookPixel(setting.value);
          break;
        case "google_tag_manager":
          injectGoogleTagManager(setting.value);
          break;
        case "microsoft_clarity":
          injectMicrosoftClarity(setting.value);
          break;
        case "tiktok_pixel":
          injectTikTokPixel(setting.value);
          break;
      }
    });
  }, [settings]);

  return null;
}
