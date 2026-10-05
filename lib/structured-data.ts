/** What the structured data says about the site and the code behind it. */
export type SiteFacts = {
  name: string;
  /** The site's origin, with no trailing slash. */
  url: string;
  description: string;
  source: {
    repository: string;
    language: string;
    license: string;
    authors: readonly string[];
  };
};

/**
 * The page's JSON-LD: one graph holding the website and the source code it
 * presents, joined by ids so a reader can tell they are about the same thing.
 */
export function structuredData(facts: SiteFacts) {
  const home = `${facts.url}/`;
  const websiteId = `${home}#website`;
  const codeId = `${home}#software`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: facts.name,
        url: home,
        description: facts.description,
        inLanguage: "en",
        about: { "@id": codeId },
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": codeId,
        name: facts.name,
        description: facts.description,
        url: home,
        codeRepository: facts.source.repository,
        programmingLanguage: facts.source.language,
        license: facts.source.license,
        author: facts.source.authors.map((name) => ({ "@type": "Person", name })),
      },
    ],
  };
}

/**
 * JSON for a `<script type="application/ld+json">`. A `<` is escaped so no
 * value can close the script element early; JSON reads `<` back as `<`.
 */
export const jsonLdText = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
