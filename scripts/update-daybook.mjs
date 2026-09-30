const NOTION_TOKEN =
    process.env.NOTION_TOKEN;


const DAYBOOK_ID =
    "feb6da29-c712-4022-a48c-88f6620d0ae6";


if (!NOTION_TOKEN) {
    throw new Error(
        "NOTION_TOKEN is missing"
    );
}


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


function getMoscowDateParts() {

    const formatter =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "Europe/Moscow",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        );


    const parts =
        formatter.formatToParts(
            new Date()
        );


    const map =
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
            Number(map.year),

        month:
            Number(map.month),

        day:
            Number(map.day)
    };

}


const now =
    getMoscowDateParts();


const pages =
    await queryAll();


let monthDone = 0;
let yearDone = 0;


for (const page of pages) {

    const done =
        page.properties?.["Done"]
            ?.checkbox;


    const doneDate =
        page.properties?.["Done Date"]
            ?.date
            ?.start;


    if (
        !done ||
        !doneDate
    ) {
        continue;
    }


    const date =
        new Date(
            `${doneDate}T12:00:00+03:00`
        );


    const parts =
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
        ).formatToParts(date);


    const map =
        Object.fromEntries(
            parts.map(
                part => [
                    part.type,
                    part.value
                ]
            )
        );


    const year =
        Number(map.year);


    const month =
        Number(map.month);


    if (
        year === now.year
    ) {

        yearDone++;


        if (
            month === now.month
        ) {

            monthDone++;

        }

    }

}


const output = {

    monthDone,

    yearDone,

    month:
        now.month,

    year:
        now.year,

    updatedAt:
        new Date().toISOString()
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
