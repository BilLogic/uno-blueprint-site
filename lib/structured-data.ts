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

/** One question the page answers, as the Questions section shows it. */
export type FaqEntry = { question: string; answer: string };

/**
 * Text as an answer engine should quote it: markup goes, a link keeps its
 * words, and runs of whitespace close up. Copy may carry an HTML tag, a
 * markdown link, emphasis or code; the structured data never does. Underscores
 * stay, since names such as at_risk use them.
 */
export function plainText(text: string) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/(\*\*|\*|`)(\S(?:.*?\S)?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The page's JSON-LD: one graph holding the website, the source code it
 * presents and the questions it answers, joined by ids so a reader can tell
 * they are about the same thing.
 */
export function structuredData(facts: SiteFacts, faq: readonly FaqEntry[]) {
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
      {
        "@type": "FAQPage",
        "@id": `${home}#questions`,
        url: home,
        inLanguage: "en",
        isPartOf: { "@id": websiteId },
        about: { "@id": codeId },
        mainEntity: faq.map(({ question, answer }) => ({
          "@type": "Question",
          name: plainText(question),
          acceptedAnswer: { "@type": "Answer", text: plainText(answer) },
        })),
      },
    ],
  };
}

/**
 * JSON for a `<script type="application/ld+json">`. A `<` is escaped so no
 * value can close the script element early; JSON reads `<` back as `<`.
 */
export const jsonLdText = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
