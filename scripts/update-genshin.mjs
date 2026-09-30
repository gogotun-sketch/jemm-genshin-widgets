const NOTION_TOKEN = process.env.NOTION_TOKEN;

const ACHIEVEMENTS_ID =
    "32aaba36-5d45-4ecb-ae4f-1c62ca691e7d";

const CHARACTERS_ID =
    "b97e8817-d594-4849-a4a9-5174e40d8c20";


if (!NOTION_TOKEN) {
    throw new Error("NOTION_TOKEN is missing");
}


async function queryAll(dataSourceId) {

    let results = [];
    let cursor = undefined;

    do {

        const body = {
            page_size: 100
        };

        if (cursor) {
            body.start_cursor = cursor;
        }


        const response = await fetch(
            `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
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
                    JSON.stringify(body)
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


const achievements =
    await queryAll(
        ACHIEVEMENTS_ID
    );


const characters =
    await queryAll(
        CHARACTERS_ID
    );


const achievementsDone =
    achievements.filter(
        page =>
            page.properties?.["Выполнено"]
                ?.checkbox === true
    ).length;


const charactersOwned =
    characters.filter(
        page =>
            page.properties?.["Есть"]
                ?.checkbox === true
    ).length;


const output = {

    achievements: {
        current:
            achievementsDone,

        total:
            achievements.length
    },

    characters: {
        current:
            charactersOwned,

        total:
            characters.length
    },

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
    "data/genshin.json",

    JSON.stringify(
        output,
        null,
        2
    ) + "\n",

    "utf8"
);


console.log(
    "Genshin statistics updated:",
    output
);
