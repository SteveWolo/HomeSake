import { sendDueVisitEmails } from "../../src/lib/visit-email.server";

export default async () => {
  await sendDueVisitEmails();
};

export const config = { schedule: "*/5 * * * *" };
