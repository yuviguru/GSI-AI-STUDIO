/**
 * Parent channel preferences API (COMMS-001).
 *
 * - GET — current parent's prefs + channel health
 * - PUT — upsert a channel pref (handle + locale), marks consent granted
 * - DELETE /api/comms/prefs?channel=... — revoke
 */

import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, AppException } from '@/lib/api-utils';
import { verifyAuth } from '@/lib/auth-utils';
import {
  channelHealthReport,
  listChannelPrefs,
  revokeChannelPref,
  setChannelPref,
} from '@/lib/comms/messagingService';
import type { CommsChannel } from '@/lib/comms/types';

const VALID_CHANNELS: CommsChannel[] = ['telegram', 'whatsapp', 'sms', 'email'];

function isChannel(v: unknown): v is CommsChannel {
  return typeof v === 'string' && VALID_CHANNELS.includes(v as CommsChannel);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.role !== 'parent') {
      throw new AppException('FORBIDDEN', 'Parents only.', 403);
    }
    const [prefs, health] = await Promise.all([
      listChannelPrefs(auth.userId),
      channelHealthReport(),
    ]);
    return apiSuccess({ prefs, health });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.role !== 'parent') {
      throw new AppException('FORBIDDEN', 'Parents only.', 403);
    }
    const body = (await request.json()) as Record<string, unknown>;
    if (!isChannel(body.channel)) {
      throw new AppException('INVALID_INPUT', 'channel is required.', 400);
    }
    const handle = typeof body.handle === 'string' ? body.handle.trim() : '';
    if (!handle || handle.length > 120) {
      throw new AppException('INVALID_INPUT', 'handle must be 1-120 chars.', 400);
    }
    const locale = body.locale === 'hi' ? ('hi' as const) : ('en' as const);

    const pref = await setChannelPref({
      parentUid: auth.userId,
      channel: body.channel,
      handle,
      locale,
    });
    return apiSuccess({ pref });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.role !== 'parent') {
      throw new AppException('FORBIDDEN', 'Parents only.', 403);
    }
    const channel = new URL(request.url).searchParams.get('channel');
    if (!isChannel(channel)) {
      throw new AppException('INVALID_INPUT', 'channel is required.', 400);
    }
    await revokeChannelPref(auth.userId, channel);
    return apiSuccess({ channel, revoked: true });
  } catch (error) {
    return handleApiError(error);
  }
}
