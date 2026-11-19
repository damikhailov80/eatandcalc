import { buildMeResponse } from '@/lib/household';
import { withUser } from '@/lib/session';

export const GET = withUser(async (_request, me) => Response.json(await buildMeResponse(me.user.id)));
