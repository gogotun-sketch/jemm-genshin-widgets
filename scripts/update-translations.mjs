const NOTION_TOKEN =
    process.env.NOTION_TOKEN;


const TRANSLATIONS_ID =
    "74fe7bc2-56d6-4619-af10-4f777bdeb120";


if (!NOTION_TOKEN) {

    throw new Error(
        "NOTION_TOKEN is missing"
    );

}


/* =========================
   ЗАГРУЗКА ВСЕХ ЗАПИСЕЙ
   ========================= */

async function queryAll() {

    let results = [];
    let cursor = undefined;


    do {

        const body = {
            page_size: 100
        };


        if (cursor) {

            body.start_cursor =
                cursor;

        }


        const response =
            await fetch(
                `https://api.notion.com/v1/data_sources/${TRANSLATIONS_ID}/query`,
                {
                    method: "POST",

                    headers: {

                        Authorization:
                            `Bearer ${NOTION_TOKEN}`,

                        "Notion-Version":
                            "2026-03-11",

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            body
                        )

                }
            );


        if (!response.ok) {

            const text =
                await response.text();


            throw new Error(
                `Notion API error ${response.status}: ${text}`
            );

        }


        const data =
            await response.json();


        results.push(
            ...data.results
        );


        cursor =
            data.has_more
                ? data.next_cursor
                : undefined;


    } while (cursor);


    return results;

}


/* =========================
   ПОДСЧЕТ
   ========================= */

const pages =
    await queryAll();


let totalLines = 0;


for (const page of pages) {

    const value =
        page.properties?.["Количество строк"]
            ?.number;


    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {

        totalLines += value;

    }

}


const output = {

    totalLines:
        totalLines,

    modsCount:
        pages.length,

    updatedAt:
        new Date()
            .toISOString()

};


/* =========================
   СОХРАНЕНИЕ JSON
   ========================= */

const fs =
    await import(
        "node:fs/promises"
    );


await fs.mkdir(
    "data",
    {
        recursive: true
    }
);


await fs.writeFile(

    "data/translations.json",

    JSON.stringify(
        output,
        null,
        2
    ) + "\n",

    "utf8"

);


console.log(
    "Translation statistics updated:",
    output
);
