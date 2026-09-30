const NOTION_TOKEN = process.env.NOTION_TOKEN;

const STATS_PAGE_ID =
  "3d0cd983-9533-819b-bdfd-d106119ca7a8";

if (!NOTION_TOKEN) {
  throw new Error("NOTION_TOKEN is missing");
}

const response = await fetch(
  `https://api.notion.com/v1/pages/${STATS_PAGE_ID}`,
  {
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Notion-Version": "2026-03-11",
      "Content-Type": "application/json"
    }
  }
);

if (!response.ok) {
  const text = await response.text();

  throw new Error(
    `Notion API error ${response.status}: ${text}`
  );
}

const page = await response.json();

const pagesProperty =
  page.properties?.["Pages read"];

if (!pagesProperty) {
  throw new Error(
    'Property "Pages read" was not found'
  );
}

const pages =
  pagesProperty.formula?.number;

if (
  typeof pages !== "number"
) {
  throw new Error(
    '"Pages read" formula did not return a number'
  );
}

const data = {
  pages: pages,
  year: 2026,
  updatedAt: new Date().toISOString()
};

const fs =
  await import("node:fs/promises");

await fs.mkdir(
  "data",
  {
    recursive: true
  }
);

await fs.writeFile(
  "data/library.json",
  JSON.stringify(
    data,
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(
  `Library statistics updated: ${pages} pages`
);
