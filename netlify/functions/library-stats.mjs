const NOTION_VERSION = "2026-03-11";

/*
Строка:
2026 · pages read

из базы Library statistics
*/
const STATS_PAGE_ID =
    "3d0cd983-9533-819b-bdfd-d106119ca7a8";


function getFormulaValue(property) {

    if (!property) {
        throw new Error(
            'Property "Pages read" not found'
        );
    }


    if (property.type !== "formula") {
        throw new Error(
            '"Pages read" is not a formula property'
        );
    }


    const formula = property.formula;


    if (!formula) {
        throw new Error(
            '"Pages read" formula has no result'
        );
    }


    /*
    Нормальный вариант:
    формула возвращает число.
    */

    if (formula.type === "number") {

        return formula.number ?? 0;

    }


    /*
    Запасной вариант на случай,
    если Notion когда-нибудь вернет
    значение строкой.
    */

    if (formula.type === "string") {

        const cleaned =
            String(formula.string ?? "")
                .replace(/\s/g, "")
                .replace(",", ".");


        const number =
            Number(cleaned);


        if (!Number.isNaN(number)) {
            return number;
        }

    }


    throw new Error(
        `Unsupported formula result type: ${formula.type}`
    );

}


export default async () => {

    try {

        if (!process.env.NOTION_TOKEN) {

            throw new Error(
                "NOTION_TOKEN is not configured"
            );

        }


        const response =
            await fetch(
                `https://api.notion.com/v1/pages/${STATS_PAGE_ID}`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${process.env.NOTION_TOKEN}`,

                        "Notion-Version":
                            NOTION_VERSION
                    }
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `Notion API ${response.status}: ${errorText}`
            );

        }


        const page =
            await response.json();


        const pages =
            getFormulaValue(
                page.properties?.["Pages read"]
            );


        return new Response(

            JSON.stringify({
                pages,
                year: 2026,
                updatedAt:
                    new Date().toISOString()
            }),

            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/json; charset=utf-8",

                    /*
                    Браузер может проверять часто,
                    но Netlify не будет дергать
                    Notion каждую секунду.
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
                error: error.message
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
