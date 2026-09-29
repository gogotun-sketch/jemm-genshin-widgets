const NOTION_VERSION = "2026-03-11";

const DAYBOOK_DATA_SOURCE_ID =
    "feb6da29-c712-4022-a48c-88f6620d0ae6";

const TIME_ZONE =
    "Europe/Moscow";


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/* -------------------------------- */
/* ТЕКУЩИЙ ГОД И МЕСЯЦ */
/* -------------------------------- */

function getCurrentPeriod() {

    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone: TIME_ZONE,
                year: "numeric",
                month: "2-digit"
            }
        ).formatToParts(new Date());


    const year =
        Number(
            parts.find(
                part => part.type === "year"
            ).value
        );


    const month =
        Number(
            parts.find(
                part => part.type === "month"
            ).value
        );


    return {
        year,
        month
    };
}


/* -------------------------------- */
/* ЗАПРОС К NOTION */
/* -------------------------------- */

async function queryNotion(
    startCursor = null
) {

    const body = {
        page_size: 100
    };


    if (startCursor) {

        body.start_cursor =
            startCursor;

    }


    const response =
        await fetch(
            `https://api.notion.com/v1/data_sources/${DAYBOOK_DATA_SOURCE_ID}/query`,
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${process.env.NOTION_TOKEN}`,

                    "Notion-Version":
                        NOTION_VERSION,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(body)
            }
        );


    if (response.status === 429) {

        const retryAfter =
            Number(
                response.headers.get(
                    "retry-after"
                )
            ) || 1;


        await sleep(
            retryAfter * 1000
        );


        return queryNotion(
            startCursor
        );

    }


    if (!response.ok) {

        const errorText =
            await response.text();


        throw new Error(
            `Notion API ${response.status}: ${errorText}`
        );

    }


    return response.json();
}


/* -------------------------------- */
/* СЧИТАЕМ ВЫПОЛНЕННОЕ */
/* -------------------------------- */

async function calculateStats() {

    const {
        year,
        month
    } = getCurrentPeriod();


    const monthKey =
        `${year}-${String(month).padStart(2, "0")}`;


    const yearKey =
        `${year}-`;


    let monthDone = 0;
    let yearDone = 0;

    let cursor = null;
    let hasMore = true;


    while (hasMore) {

        const data =
            await queryNotion(
                cursor
            );


        for (const page of data.results) {

            const done =
                page.properties?.Done;


            const doneDate =
                page.properties?.["Done Date"];


            /*
            Считаем только реально
            отмеченные выполненными дела.
            */

            if (
                done?.type !== "checkbox" ||
                done.checkbox !== true
            ) {
                continue;
            }


            const date =
                doneDate?.date?.start;


            /*
            Без Done Date невозможно
            определить месяц и год.
            */

            if (!date) {
                continue;
            }


            if (
                date.startsWith(
                    yearKey
                )
            ) {

                yearDone++;

            }


            if (
                date.startsWith(
                    monthKey
                )
            ) {

                monthDone++;

            }

        }


        hasMore =
            data.has_more;


        cursor =
            data.next_cursor;


        if (hasMore) {

            await sleep(300);

        }

    }


    return {
        monthDone,
        yearDone,
        month,
        year
    };
}


/* -------------------------------- */
/* NETLIFY FUNCTION */
/* -------------------------------- */

export default async () => {

    try {

        if (!process.env.NOTION_TOKEN) {

            throw new Error(
                "NOTION_TOKEN is not configured"
            );

        }


        const stats =
            await calculateStats();


        return new Response(

            JSON.stringify({
                ...stats,

                updatedAt:
                    new Date().toISOString()
            }),

            {
                status: 200,

                headers: {

                    "Content-Type":
                        "application/json; charset=utf-8",

                    /*
                    Браузер проверяет снова,
                    а CDN может держать данные
                    максимум несколько минут.
                    */

                    "Cache-Control":
                        "no-cache",

                    "Netlify-CDN-Cache-Control":
                        "public, s-maxage=300"
                }
            }

        );

    }

    catch (error) {

        console.error(error);


        return new Response(

            JSON.stringify({
                error:
                    error.message
            }),

            {
                status: 500,

                headers: {
                    "Content-Type":
                        "application/json; charset=utf-8"
                }
            }

        );

    }

};
