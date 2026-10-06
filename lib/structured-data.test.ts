import { describe, expect, it } from "vitest";
import { questions } from "@/content/questions";
import { site } from "@/content/site";
import { jsonLdText, plainText, structuredData } from "./structured-data";

const data = structuredData(site, questions.list);
const graph = data["@graph"];
const ofType = (type: string) => graph.find((node) => node["@type"] === type);

describe("structuredData", () => {
  it("describes the website, the source code and its questions in one graph", () => {
    expect(data["@context"]).toBe("https://schema.org");
    expect(graph.map((node) => node["@type"])).toEqual(["WebSite", "SoftwareSourceCode", "FAQPage"]);
  });

  it("points the code at its repository, language, license and authors", () => {
    expect(ofType("SoftwareSourceCode")).toMatchObject({
      name: "Uno Blueprint",
      url: "https://uno-blueprint.netlify.app/",
      codeRepository: "https://github.com/BilLogic/uno-blueprint",
      programmingLanguage: "TypeScript",
      license: "https://opensource.org/licenses/MIT",
      author: [
        { "@type": "Person", name: "Bill Guo" },
        { "@type": "Person", name: "Meryem Marasli" },
      ],
    });
  });

  it("joins the website to the code it is about", () => {
    const code = ofType("SoftwareSourceCode");
    expect(ofType("WebSite")).toMatchObject({ url: "https://uno-blueprint.netlify.app/", about: { "@id": code?.["@id"] } });
  });
});

describe("the FAQ", () => {
  const faq = ofType("FAQPage");

  it("asks every question the Questions section asks, in its order, with its answer", () => {
    expect(faq?.mainEntity).toEqual(
      questions.list.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    );
  });

  it("belongs to the website", () => {
    expect(faq).toMatchObject({ url: "https://uno-blueprint.netlify.app/", isPartOf: { "@id": ofType("WebSite")?.["@id"] } });
  });

  it("carries plain text, whatever markup the copy holds", () => {
    const marked = structuredData(site, [
      { question: "Is it **open** source?", answer: "Yes: <a href=\"https://x.test\">the code</a> is on [GitHub](https://github.com)." },
    ])["@graph"].find((node) => node["@type"] === "FAQPage");
    expect(marked?.mainEntity).toContainEqual({
      "@type": "Question",
      name: "Is it open source?",
      acceptedAnswer: { "@type": "Answer", text: "Yes: the code is on GitHub." },
    });
  });

  it("survives the trip through its script element", () => {
    expect(JSON.parse(jsonLdText(data))).toEqual(data);
  });
});

describe("plainText", () => {
  it("keeps a link's words and drops its address", () => {
    expect(plainText("See [the guide](https://example.test/guide).")).toBe("See the guide.");
  });

  it("drops tags, emphasis and code marks and closes up whitespace", () => {
    expect(plainText("<p>Run `npm run dev`,\n  then *look*.</p>")).toBe("Run npm run dev, then look.");
  });

  it("leaves underscores and plain punctuation alone", () => {
    expect(plainText("Status at_risk, “Uno” & 2 * 3")).toBe("Status at_risk, “Uno” & 2 * 3");
  });
});

describe("jsonLdText", () => {
  it("cannot close its script element early", () => {
    const text = jsonLdText({ name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("</");
    expect(JSON.parse(text)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
