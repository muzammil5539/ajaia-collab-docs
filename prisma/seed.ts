import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

const USERS = [
  { id: "user_maya", email: "maya@ajaia.test", name: "Maya Fletcher" },
  { id: "user_dev", email: "dev@ajaia.test", name: "Dev Shah" },
  { id: "user_priya", email: "priya@ajaia.test", name: "Priya Raman" },
];

const DOCUMENTS = [
  {
    id: "doc_q4",
    ownerId: "user_maya",
    title: "Q4 planning notes",
    content: `<h1>Q4 planning notes</h1><p>We are keeping the quarter to <strong>three commitments</strong>, each with a named owner and a date. Anything else is <em>explicitly</em> next quarter.</p><h2>Commitments</h2><ol><li>Ship the shared workspace to the pilot team — Maya, 14 Nov</li><li>Cut import failures to under one percent — Dev, 28 Nov</li><li>Publish the access model and have it reviewed — Priya, 5 Dec</li></ol><h2>Open questions</h2><ul><li>Do viewers need <u>comment</u> access before the pilot?</li><li>Who owns the import fixtures once the team grows?</li></ul>`,
    shares: [
      { userId: "user_dev", role: "EDITOR" },
      { userId: "user_priya", role: "VIEWER" },
    ],
  },
  {
    id: "doc_onboarding",
    ownerId: "user_maya",
    title: "Onboarding checklist",
    content: `<h2>First week</h2><ul><li>Laptop, accounts, calendar</li><li>Read the access model</li><li>Ship one small change</li></ul>`,
    shares: [],
  },
  {
    id: "doc_pricing",
    ownerId: "user_dev",
    title: "Pricing experiment brief",
    content: `<h1>Pricing experiment brief</h1><p>Testing a single annual tier against the current monthly plan for eight weeks.</p><ol><li>Define the control</li><li>Agree the stopping rule before launch</li></ol>`,
    shares: [{ userId: "user_maya", role: "EDITOR" }],
  },
  {
    id: "doc_support",
    ownerId: "user_priya",
    title: "Support handbook",
    content: `<h2>Support handbook</h2><p>Every reply quotes the customer’s own words back to them before answering. <strong>No canned openers.</strong></p><ul><li>Acknowledge in one line</li><li>Answer, then say what happens next</li></ul>`,
    shares: [{ userId: "user_maya", role: "VIEWER" }],
  },
];

async function main() {
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: user,
      update: { email: user.email, name: user.name },
    });
  }

  for (const doc of DOCUMENTS) {
    const { shares, ...fields } = doc;

    await prisma.document.upsert({
      where: { id: fields.id },
      create: fields,
      update: { title: fields.title, content: fields.content },
    });

    for (const share of shares) {
      await prisma.share.upsert({
        where: { documentId_userId: { documentId: fields.id, userId: share.userId } },
        create: { documentId: fields.id, ...share },
        update: { role: share.role },
      });
    }
  }

  console.log(`Seeded ${USERS.length} accounts and ${DOCUMENTS.length} documents.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
