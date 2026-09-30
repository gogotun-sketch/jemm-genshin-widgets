const NOTION_TOKEN =
    process.env.NOTION_TOKEN;


const DAYBOOK_ID =
    "feb6da29-c712-4022-a48c-88f6620d0ae6";


if (!NOTION_TOKEN) {

    throw new Error(
        "NOTION_TOKEN is missing"
    );

}


/* =========================
   ЗАГРУЗКА ВСЕХ СТРАНИЦ
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
                `https://api.notion.com/v1/data_sources/${DAYBOOK_ID}/query`,
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
   ТЕКУЩИЙ ГОД И МЕСЯЦ
   ПО МОСКВЕ
   ========================= */

function getCurrentMoscowMonth() {

    const formatter =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "Europe/Moscow",

                year:
                    "numeric",

                month:
                    "2-digit"
            }
        );


    const parts =
        formatter.formatToParts(
            new Date()
        );


    const values =
        Object.fromEntries(
            parts.map(
                part => [
                    part.type,
                    part.value
                ]
            )
        );


    return {

        year:
            Number(
                values.year
            ),

        month:
            Number(
                values.month
            )

    };

}


/* =========================
   РАЗБОР ДАТЫ NOTION
   ========================= */

/*
Notion может вернуть:

2026-09-30

или:

2026-09-30T12:00:00.000+03:00

Нам нужны только первые
год и месяц.
*/

function parseNotionDate(
    dateString
) {

    if (
        typeof dateString !==
        "string"
    ) {

        return null;

    }


    const match =
        dateString.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );


    if (!match) {

        return null;

    }


    return {

        year:
            Number(
                match[1]
            ),

        month:
            Number(
                match[2]
            ),

        day:
            Number(
                match[3]
            )

    };

}


/* =========================
   ПОДСЧЕТ
   ========================= */

const current =
    getCurrentMoscowMonth();


const pages =
    await queryAll();


let monthDone = 0;
let yearDone = 0;


for (
    const page of pages
) {

    const done =
        page.properties?.["Done"]
            ?.checkbox;


    const doneDate =
        page.properties?.["Done Date"]
            ?.date
            ?.start;


    if (
        done !== true ||
        !doneDate
    ) {

        continue;

    }


    const parsed =
        parseNotionDate(
            doneDate
        );


    if (!parsed) {

        console.warn(
            "Could not parse Done Date:",
            doneDate
        );

        continue;

    }


    if (
        parsed.year ===
        current.year
    ) {

        yearDone++;


        if (
            parsed.month ===
            current.month
        ) {

            monthDone++;

        }

    }

}


/* =========================
   JSON
   ========================= */

const output = {

    monthDone:
        monthDone,

    yearDone:
        yearDone,

    month:
        current.month,

    year:
        current.year,

    updatedAt:
        new Date()
            .toISOString()

};


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

    "data/daybook.json",

    JSON.stringify(
        output,
        null,
        2
    ) + "\n",

    "utf8"

);


console.log(
    "Daybook statistics updated:",
    output
);
