import { describe, expect, it } from "vitest";
import { site } from "@/content/site";
import { jsonLdText, structuredData } from "./structured-data";

const graph = structuredData(site)["@graph"];
const ofType = (type: string) => graph.find((node) => node["@type"] === type);

describe("structuredData", () => {
  it("describes the website and the source code in one graph", () => {
    expect(structuredData(site)["@context"]).toBe("https://schema.org");
    expect(graph.map((node) => node["@type"])).toEqual(["WebSite", "SoftwareSourceCode"]);
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
        { "@type": "Person", name: "Meryem Maraşlı" },
      ],
    });
  });

  it("joins the website to the code it is about", () => {
    const code = ofType("SoftwareSourceCode");
    expect(ofType("WebSite")).toMatchObject({ url: "https://uno-blueprint.netlify.app/", about: { "@id": code?.["@id"] } });
  });
});

describe("jsonLdText", () => {
  it("cannot close its script element early", () => {
    const text = jsonLdText({ name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("</");
    expect(JSON.parse(text)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
