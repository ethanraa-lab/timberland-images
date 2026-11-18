import { regionalLookup } from '../../lib/regions.mjs';
export default async request => Response.json(await regionalLookup(new URL(request.url).searchParams));
export const config = { path: '/api/region' };
