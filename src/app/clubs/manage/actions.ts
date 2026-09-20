'use server';
import { revalidatePath } from 'next/cache';
import { ClubError, type ClubCommand, type ClubResult } from '@/lib/clubs/model';
import { clubIdentity } from '@/lib/clubs/identity';
import { clubRepository } from '@/lib/clubs/store';
import { clubService } from '@/lib/clubs/service';
import { stripeClubBilling } from '@/lib/clubs/billing';

export async function manageClub(command: ClubCommand): Promise<ClubResult> {
  try {
    const actor = await clubIdentity();
    const result = await clubService(clubRepository(), stripeClubBilling).run(actor, command);
    revalidatePath('/clubs', 'layout'); revalidatePath('/activities');
    return result;
  } catch (error) {
    return { ok: false, message: error instanceof ClubError ? error.message : 'Club action could not be verified. Refresh and retry; no success has been assumed.' };
  }
}
export async function requestClubJoin(slug: string, input: unknown) {
  try {
    const actor = await clubIdentity('join');
    const message = await clubService(clubRepository(), stripeClubBilling).join(actor, slug, input);
    revalidatePath('/clubs/manage');
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof ClubError ? error.message : 'The request could not be saved. Please retry.' };
  }
}
export async function reviewClub(input: { clubId: string; target: 'owner' | 'page' | 'event' | 'hide'; version: number; eventId?: string; confirmed: boolean }) {
  try {
    const actor = await clubIdentity('review');
    if (input.confirmed !== true) throw new ClubError('Confirm that you checked the club affiliation or event details.');
    await clubService(clubRepository(), stripeClubBilling).review(actor, input.clubId, input.target, input.version, input.eventId);
    revalidatePath('/clubs', 'layout'); revalidatePath('/activities');
    return { ok: true, message: 'Review saved. Payment alone never verifies content.' };
  } catch (error) {
    return { ok: false, message: error instanceof ClubError ? error.message : 'Review failed. Refresh before retrying.' };
  }
}
