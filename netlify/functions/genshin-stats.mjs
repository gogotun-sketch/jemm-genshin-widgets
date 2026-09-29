const NOTION_VERSION = "2026-03-11";

const DATA_SOURCES = {
    achievements: {
        id: "32aaba36-5d45-4ecb-ae4f-1c62ca691e7d",
        checkbox: "Выполнено"
    },

    characters: {
        id: "b97e8817-d594-4849-a4a9-5174e40d8c20",
        checkbox: "Есть"
    }
};


/* Небольшая пауза между запросами к Notion */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/* Один запрос к Notion */

async function queryNotion(dataSourceId, startCursor = null) {

    const body = {
        page_size: 100
    };

    if (startCursor) {
        body.start_cursor = startCursor;
    }


    const response = await fetch(
        `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
        {
            method: "POST",

            headers: {
                "Authorization": `Bearer ${process.env.NOTION_TOKEN}`,
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json"
            },

            body: JSON.stringify(body)
        }
    );


    /* Если Notion попросил притормозить */

    if (response.status === 429) {

        const retryAfter =
            Number(response.headers.get("retry-after")) || 1;

        await sleep(retryAfter * 1000);

        return queryNotion(
            dataSourceId,
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


/* Считаем все строки базы и отмеченные чекбоксы */

async function countDatabase(
    dataSourceId,
    checkboxProperty
) {

    let total = 0;
    let current = 0;

    let cursor = null;
    let hasMore = true;


    while (hasMore) {

        const data =
            await queryNotion(
                dataSourceId,
                cursor
            );


        for (const page of data.results) {

            total++;


            const property =
                page.properties?.[
                    checkboxProperty
                ];


            if (
                property &&
                property.type === "checkbox" &&
                property.checkbox === true
            ) {

                current++;

            }

        }


        hasMore = data.has_more;

        cursor =
            data.next_cursor;


        /*
        Не долбим Notion слишком быстро.
        */

        if (hasMore) {
            await sleep(350);
        }

    }


    return {
        current,
        total
    };
}


/* Сама Netlify Function */

export default async () => {

    try {

        if (!process.env.NOTION_TOKEN) {

            throw new Error(
                "NOTION_TOKEN is not configured"
            );

        }


        const achievements =
            await countDatabase(
                DATA_SOURCES.achievements.id,
                DATA_SOURCES.achievements.checkbox
            );


        const characters =
            await countDatabase(
                DATA_SOURCES.characters.id,
                DATA_SOURCES.characters.checkbox
            );


        return new Response(

            JSON.stringify({
                achievements,
                characters,
                updatedAt:
                    new Date().toISOString()
            }),

            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/json; charset=utf-8",

                    /*
                    Netlify может держать результат
                    несколько минут, чтобы не опрашивать
                    1844 ачивки при каждом открытии Notion.
                    */

                    "Cache-Control":
                        "public, max-age=60",

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
