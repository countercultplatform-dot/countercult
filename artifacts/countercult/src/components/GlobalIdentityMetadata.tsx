import { useEffect } from "react";
import {
  COUNTERCULT_B2B_JSON_LD,
  COUNTERCULT_IDENTITY_JSON_LD,
  COUNTERCULT_MODEL_JSON_LD,
  COUNTERCULT_SUPPLY_JSON_LD,
  RESIDENCY_EXCHANGE_JSON_LD,
  SHONA_PERSON_JSON_LD,
  SITE_IDENTITY,
} from "@/config/siteIdentity";

function setMeta(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

export function GlobalIdentityMetadata({ routePath }: { routePath: string }) {
  useEffect(() => {
    setMeta("author", SITE_IDENTITY.shona.name);
    setMeta("designer", `${SITE_IDENTITY.shona.name} / ${SITE_IDENTITY.shona.alternateName}`);

    let identityScript = document.head.querySelector<HTMLScriptElement>("#countercult-identity-jsonld");
    if (!identityScript) {
      identityScript = document.createElement("script");
      identityScript.id = "countercult-identity-jsonld";
      identityScript.type = "application/ld+json";
      document.head.appendChild(identityScript);
    }
    identityScript.text = JSON.stringify(COUNTERCULT_IDENTITY_JSON_LD);

    const modelScriptId = "countercult-model-jsonld";
    const existingModelScript = document.head.querySelector<HTMLScriptElement>(`#${modelScriptId}`);
    if (routePath === "/model") {
      const modelScript = existingModelScript ?? document.createElement("script");
      modelScript.id = modelScriptId;
      modelScript.type = "application/ld+json";
      modelScript.text = JSON.stringify(COUNTERCULT_MODEL_JSON_LD);
      if (!existingModelScript) document.head.appendChild(modelScript);
    } else {
      existingModelScript?.remove();
    }

    const isB2BRoute = routePath === "/fund"
      || routePath.startsWith("/fund/")
      || routePath === "/studios"
      || routePath.startsWith("/studios/")
      || routePath === "/creator-economy"
      || routePath === "/web3-culture"
      || routePath === "/culture-tech-startup"
      || routePath === "/cultural-strategy"
      || routePath === "/rural-culture"
      || routePath === "/rural-economic-development"
      || routePath === "/berlin-culture"
      || routePath === "/new-york-culture"
      || routePath === "/philadelphia-culture"
      || routePath === "/eu-us-cultural-production";
    const isSupplyRoute = routePath === "/explore"
      || routePath.startsWith("/browse/")
      || routePath.startsWith("/city/")
      || routePath.startsWith("/place/")
      || routePath.startsWith("/tag/")
      || routePath.startsWith("/entries")
      || routePath === "/discover"
      || routePath.startsWith("/residency")
      || routePath === "/art-houses"
      || routePath === "/art-houses/";

    const supplyScriptId = "countercult-supply-jsonld";
    const existingSupplyScript = document.head.querySelector<HTMLScriptElement>(`#${supplyScriptId}`);
    if (isSupplyRoute) {
      const supplyScript = existingSupplyScript ?? document.createElement("script");
      supplyScript.id = supplyScriptId;
      supplyScript.type = "application/ld+json";
      supplyScript.text = JSON.stringify(COUNTERCULT_SUPPLY_JSON_LD);
      if (!existingSupplyScript) document.head.appendChild(supplyScript);
    } else {
      existingSupplyScript?.remove();
    }

    const b2bScriptId = "countercult-b2b-jsonld";
    const existingB2bScript = document.head.querySelector<HTMLScriptElement>(`#${b2bScriptId}`);
    if (isB2BRoute) {
      const b2bScript = existingB2bScript ?? document.createElement("script");
      b2bScript.id = b2bScriptId;
      b2bScript.type = "application/ld+json";
      b2bScript.text = JSON.stringify(COUNTERCULT_B2B_JSON_LD);
      if (!existingB2bScript) document.head.appendChild(b2bScript);
    } else {
      existingB2bScript?.remove();
    }

    let script = document.head.querySelector<HTMLScriptElement>("#shona-neary-jsonld");
    if (!script) {
      script = document.createElement("script");
      script.id = "shona-neary-jsonld";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.text = JSON.stringify(SHONA_PERSON_JSON_LD);

    const residencyScriptId = "countercult-residency-jsonld";
    const existingResidencyScript = document.head.querySelector<HTMLScriptElement>(`#${residencyScriptId}`);
    if (routePath === "/residency" || routePath.startsWith("/residency/") || routePath === "/art-houses" || routePath === "/art-houses/") {
      const residencyScript = existingResidencyScript ?? document.createElement("script");
      residencyScript.id = residencyScriptId;
      residencyScript.type = "application/ld+json";
      residencyScript.text = JSON.stringify(RESIDENCY_EXCHANGE_JSON_LD);
      if (!existingResidencyScript) document.head.appendChild(residencyScript);
    } else {
      existingResidencyScript?.remove();
    }
  }, [routePath]);

  return null;
}