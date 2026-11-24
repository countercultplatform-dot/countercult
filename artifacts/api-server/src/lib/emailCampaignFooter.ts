const COLLECTIVE_FUND_URL = "https://countercult.network/collective-fund";

const collectiveFundHtml = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:28px;background:#000;color:#f3efe7;">
    <tr>
      <td style="padding:20px 16px;border-top:3px solid #c6ff3d;">
        <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#c6ff3d;">Countercult’s community fundraiser</p>
        <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#f3efe7;">Patron Post is our monthly art mailing with a Countercult insert. Memberships help cover Network costs; profit after costs goes to paying artists or buying cultural spaces.</p>
        <a href="${COLLECTIVE_FUND_URL}" style="display:inline-block;padding:11px 16px;border:2px solid #c6ff3d;background:#c6ff3d;color:#000;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;text-decoration:none;text-transform:uppercase;">See the fundraiser →</a>
      </td>
    </tr>
  </table>`;

const collectiveFundText = [
  "Countercult’s community fundraiser",
  "Patron Post is our monthly art mailing with a Countercult insert. Memberships help cover Network costs; profit after costs goes to paying artists or buying cultural spaces.",
  `See the fundraiser: ${COLLECTIVE_FUND_URL}`,
].join("\n\n");

export function addCollectiveFundFooterToHtml(html: string): string {
  const closingDivIndex = html.toLowerCase().lastIndexOf("</div>");
  if (closingDivIndex < 0) return `${html}${collectiveFundHtml}`;
  return `${html.slice(0, closingDivIndex)}${collectiveFundHtml}${html.slice(closingDivIndex)}`;
}

export function addCollectiveFundFooterToText(text: string): string {
  return `${text.trimEnd()}\n\n${collectiveFundText}`;
}

type MailPayload = {
  html?: string | null;
  text?: string | null;
};

export function sendWithCollectiveFundFooter<Payload extends MailPayload, Result>(
  send: (payload: Payload) => Promise<Result>,
  payload: Payload,
): Promise<Result> {
  const decorated = {
    ...payload,
    ...(payload.html ? { html: addCollectiveFundFooterToHtml(payload.html) } : {}),
    ...(payload.text ? { text: addCollectiveFundFooterToText(payload.text) } : {}),
  } as Payload;
  return send(decorated);
}
