/**
 * Recruitsage is the college placement portal used by this project owner.
 * Its sending address can differ by college, so detection intentionally uses
 * both the sender and the message itself. Extra known sender domains can be
 * supplied without redeploying through RECRUITSAGE_SENDER_DOMAINS.
 */
export function isRecruitsageEmail(input: {
  sender?: string | null;
  senderEmail?: string | null;
  subject?: string | null;
  body?: string | null;
}) {
  const configuredDomains = (process.env.RECRUITSAGE_SENDER_DOMAINS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const sender = `${input.sender || ""} ${input.senderEmail || ""}`.toLowerCase();
  const content = `${input.subject || ""}\n${input.body || ""}`.toLowerCase();

  return (
    /recruit\s*sage|recruitsage/.test(sender) ||
    configuredDomains.some((domain) => sender.includes(domain)) ||
    /recruit\s*sage|recruitsage/.test(content)
  );
}
