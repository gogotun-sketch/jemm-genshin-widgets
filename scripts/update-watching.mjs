const NOTION_TOKEN =
    process.env.NOTION_TOKEN;


const WATCHLIST_ID =
    "8f2c0d14-e253-4937-a9b6-d74c136e8ee8";


const YEAR =
    2026;


if (!NOTION_TOKEN) {

    throw new Error(
        "NOTION_TOKEN is missing"
    );

}


/* =========================
   ЗАГРУЗКА WATCHLIST
   ========================= */

async function queryAll() {

    let results = [];

    let cursor =
        undefined;


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

                `https://api.notion.com/v1/data_sources/${WATCHLIST_ID}/query`,

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


let totalHours =
    0;


let countedItems =
    0;


for (const page of pages) {

    const status =
        page.properties?.["Status"]
            ?.select
            ?.name;


    const finished =
        page.properties?.["Finished"]
            ?.date
            ?.start;


    const duration =
        page.properties?.["Duration, h"]
            ?.number;


    if (
        status !== "Finished"
    ) {

        continue;

    }


    if (
        typeof finished !== "string" ||
        !finished.startsWith(`${YEAR}-`)
    ) {

        continue;

    }


    if (
        typeof duration !== "number" ||
        !Number.isFinite(duration)
    ) {

        continue;

    }


    totalHours +=
        duration;


    countedItems++;

}


/* защита от 26.419999999 */

totalHours =
    Number(
        totalHours.toFixed(2)
    );


const output = {

    totalHours:
        totalHours,

    year:
        YEAR,

    countedItems:
        countedItems,

    updatedAt:
        new Date()
            .toISOString()

};


/* =========================
   СОХРАНЕНИЕ
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

    "data/watching.json",

    JSON.stringify(
        output,
        null,
        2
    ) + "\n",

    "utf8"

);


console.log(
    "Watching statistics updated:",
    output
);
