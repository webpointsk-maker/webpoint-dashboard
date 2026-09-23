import "server-only";

export function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}
