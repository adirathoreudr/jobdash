import { Client } from "@notionhq/client";

/*
  Optional Notion sync. The app never depends on it — if the env vars are
  missing we simply skip. Property mapping is defensive: we read the target
  database's schema and match by property *type* + name, so it works with
  reasonable column naming without the user hand-configuring field IDs.
*/

export function isNotionConfigured() {
  return Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID);
}

export type NotionSyncInput = {
  company: string;
  role: string;
  url?: string | null;
  status?: string;
};

export type NotionSyncResult = {
  synced: boolean;
  pageId?: string;
  reason?: string;
};

let client: Client | null = null;
function getClient() {
  if (!client) {
    client = new Client({
      auth: process.env.NOTION_TOKEN,
      notionVersion: "2022-06-28",
    });
  }
  return client;
}

export async function createApplicationPage(
  input: NotionSyncInput
): Promise<NotionSyncResult> {
  if (!isNotionConfigured()) {
    return { synced: false, reason: "not-configured" };
  }
  const databaseId = process.env.NOTION_DATABASE_ID!;
  try {
    const notion = getClient();
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const props = (db as { properties: Record<string, { type: string }> })
      .properties;

    const byType = (type: string) =>
      Object.entries(props)
        .filter(([, v]) => v.type === type)
        .map(([name]) => name);
    const named = (re: RegExp, type: string) =>
      byType(type).find((n) => re.test(n));

    const properties: Record<string, unknown> = {};

    // Title (usually "Company" / "Name").
    const titleProp = byType("title")[0];
    if (titleProp) {
      properties[titleProp] = { title: [{ text: { content: input.company } }] };
    }
    // Role → a rich_text column (prefer one named role/position/title).
    const roleProp =
      named(/role|position|job|title/i, "rich_text") || byType("rich_text")[0];
    if (roleProp) {
      properties[roleProp] = {
        rich_text: [{ text: { content: input.role } }],
      };
    }
    // URL.
    const urlProp = named(/url|link/i, "url") || byType("url")[0];
    if (urlProp && input.url) {
      properties[urlProp] = { url: input.url };
    }
    // Status (native "status" type or a "select").
    const statusVal = input.status || "Applied";
    const statusStatus = named(/status|stage/i, "status") || byType("status")[0];
    const statusSelect = named(/status|stage/i, "select") || byType("select")[0];
    if (statusStatus) {
      properties[statusStatus] = { status: { name: statusVal } };
    } else if (statusSelect) {
      properties[statusSelect] = { select: { name: statusVal } };
    }
    // Date Applied.
    const dateProp = named(/appl|date/i, "date") || byType("date")[0];
    if (dateProp) {
      properties[dateProp] = {
        date: { start: new Date().toISOString().slice(0, 10) },
      };
    }

    const page = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: properties as never,
    });
    return { synced: true, pageId: page.id };
  } catch (e) {
    return { synced: false, reason: (e as Error).message };
  }
}
