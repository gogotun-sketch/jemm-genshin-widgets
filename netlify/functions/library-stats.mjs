import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NOTION_TOKEN =
  process.env.NOTION_TOKEN ||
  process.env.NOTION_API_KEY;

const BOOKS_DATA_SOURCE_ID =
  process.env.NOTION_BOOKS_DATA_SOURCE_ID ||
  "eb455286-2af1-477a-9ae1-dccf91dba852";

const NOTION_VERSION = "2026-03-11";

if (!NOTION_TOKEN) {
  throw new Error(
    "Notion token is missing. Set NOTION_TOKEN in GitHub Secrets."
  );
}

/*
 * По умолчанию считаем текущий год.
 * Если когда-нибудь понадобится принудительно считать другой:
 * READING_YEAR=2026
 */
const year = Number(
  process.env.READING_YEAR ||
  new Date().getUTCFullYear()
);

if (!Number.isInteger(year)) {
  throw new Error(`Invalid READING_YEAR: ${process.env.READING_YEAR}`);
}

const startDate = `${year}-01-01`;
const endDate = `${year + 1}-01-01`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(
  __dirname,
  "..",
  "data",
  "library.json"
);

async function queryBooks(startCursor = null) {
  const body = {
    page_size: 100,

    /*
     * Нам не нужен Status.
     *
     * Если у книги Finished попадает в нужный год,
     * считаем ее прочитанной в этом году.
     */
    filter: {
      and: [
        {
          property: "Finished",
          date: {
            on_or_after: startDate,
          },
        },
        {
          property: "Finished",
          date: {
            before: endDate,
          },
        },
      ],
    },
  };

  if (startCursor) {
    body.start_cursor = startCursor;
  }

  const response = await fetch(
    `https://api.notion.com/v1/data_sources/${BOOKS_DATA_SOURCE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `Notion API error ${response.status}: ${details}`
    );
  }

  return response.json();
}

function getBookTitle(book) {
  const titleProperty = book.properties?.Title?.title;

  if (!Array.isArray(titleProperty)) {
    return "(без названия)";
  }

  const title = titleProperty
    .map((item) => item.plain_text || "")
    .join("")
    .trim();

  return title || "(без названия)";
}

let cursor = null;
let totalPages = 0;
let booksRead = 0;

const booksWithoutPages = [];

do {
  const data = await queryBooks(cursor);

  for (const book of data.results) {
    booksRead += 1;

    const pages = book.properties?.Pages?.number;

    if (typeof pages === "number") {
      totalPages += pages;
    } else {
      booksWithoutPages.push(getBookTitle(book));
    }
  }

  cursor =
    data.has_more && data.next_cursor
      ? data.next_cursor
      : null;
} while (cursor);

/*
 * Формат намеренно оставляем прежним,
 * чтобы сам виджет менять не пришлось.
 */
const result = {
  pages: totalPages,
  year,
  updatedAt: new Date().toISOString(),
};

await fs.mkdir(path.dirname(outputPath), {
  recursive: true,
});

await fs.writeFile(
  outputPath,
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8"
);

console.log(
  `Library updated: ${booksRead} books, ${totalPages} pages (${year})`
);

if (booksWithoutPages.length > 0) {
  console.warn(
    `Finished books without Pages (${booksWithoutPages.length}):`
  );

  for (const title of booksWithoutPages) {
    console.warn(`- ${title}`);
  }
}

console.log(`Written to: ${outputPath}`);
