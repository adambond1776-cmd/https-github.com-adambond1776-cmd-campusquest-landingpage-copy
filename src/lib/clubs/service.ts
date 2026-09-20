import { campusDirectoryLive } from '@/lib/campuses';
import { EMPTY_SUBSCRIPTION, type SubscriptionView } from '@/lib/billing/catalog';
import { ClubError, clubPaid, validateCampus, validateClub, validateEvent, validateJoin, validateSlug, validateVersion, type Club, type ClubCommand, type ClubView } from './model';
import type { ClubActor } from './identity';
import type { ClubRepository } from './store';

export type ClubBilling = {
  read(user: string): Promise<SubscriptionView>;
  checkout(user: string, email: string): Promise<string>;
  cancel(user: string, cancel: boolean): Promise<SubscriptionView>;
};
export function clubService(repo: ClubRepository, billing: ClubBilling) {
  const owned = async (actor: ClubActor) => {
    const club = await repo.byOwner(actor.id);
    if (!club || club.owner_id !== actor.id) throw new ClubError('Create your club page first.');
    return club;
  };
  const paid = async (club: Club) => {
    if (!club.owner_approved) throw new ClubError('A reviewer must confirm club ownership first.');
    if (!clubPaid(await billing.read(club.owner_id))) throw new ClubError('An active $49 club test subscription is required.');
  };
  const view = async (actor: ClubActor): Promise<ClubView> => {
    const club = await repo.byOwner(actor.id);
    if (club && club.owner_id !== actor.id) throw new ClubError('Club ownership could not be verified.');
    let subscription = { ...EMPTY_SUBSCRIPTION }, billingAvailable = false;
    try { subscription = await billing.read(actor.id); billingAvailable = true; } catch {}
    return { club, events: club ? await repo.events(club.id) : [], requests: club ? await repo.requests(club.id) : [], subscription, billingAvailable };
  };
  return {
    view,
    async run(actor: ClubActor, command: ClubCommand) {
      let url: string | undefined, message = 'Saved. Nothing was emailed or charged.';
      switch (command.type) {
        case 'profile': {
          const content = validateClub(command.content);
          const club = await repo.byOwner(actor.id);
          if (!club) {
            if (!actor.organization) throw new ClubError('Use an organization account to create a club page.');
            await repo.create({ owner_id: actor.id, contact_email: actor.email, slug: validateSlug(command.slug), campus_id: validateCampus(command.campus), content });
          } else {
            if (club.owner_id !== actor.id) throw new ClubError('Club ownership could not be verified.');
            if (club.status === 'hidden') throw new ClubError('This page was withheld by a reviewer. Contact CampusQuest before editing.');
            if (club.owner_approved) await paid(club);
            await repo.updateClub(club.id, validateVersion(command.version), { content, status: 'pending', reviewed_by: null });
          }
          message = 'Page saved for review. New pages and edits are not public until approved.';
          break;
        }
        case 'event': {
          const club = await owned(actor); await paid(club);
          if (club.status !== 'approved') throw new ClubError('Your club page must be approved before adding events.');
          const content = validateEvent(command.content);
          if (command.id) await repo.updateEvent(command.id, club.id, validateVersion(command.version), { content, status: 'pending' });
          else {
            if ((await repo.events(club.id)).length >= 100) throw new ClubError('The first test version supports 100 event records per club.');
            await repo.createEvent(club.id, content);
          }
          message = 'Event saved for review. It enters discovery only after a reviewer checks it.';
          break;
        }
        case 'cancelEvent': {
          // Owners may correct/cancel stale events even after subscription expiry.
          const club = await owned(actor);
          await repo.updateEvent(command.id, club.id, validateVersion(command.version), { status: 'canceled' });
          message = 'Event canceled and removed from discovery.';
          break;
        }
        case 'notification': {
          const club = await owned(actor);
          if (!['simulated_sent','simulated_failed'].includes(command.outcome)) throw new ClubError('Invalid notification test.');
          await repo.notification(command.id, club.id, command.outcome);
          message = 'Notification result simulated. No outgoing email was sent.';
          break;
        }
        case 'billing': {
          if (command.action === 'checkout') {
            const club = await owned(actor);
            if (!club.owner_approved || club.status === 'hidden') throw new ClubError('A reviewer must confirm club ownership first.');
            if (!campusDirectoryLive(club.campus_id)) throw new ClubError('This campus is not open yet. No subscription is needed while waiting.');
            url = await billing.checkout(actor.id, actor.email);
          } else if (command.action === 'cancel' || command.action === 'resume') {
            await billing.cancel(actor.id, command.action === 'cancel');
          } else if (command.action !== 'refresh') throw new ClubError('Invalid billing action.');
          message = 'Test billing refreshed. Cancellation keeps access until the paid period ends.';
          break;
        }
        default: throw new ClubError('Unknown club action.');
      }
      return { ok: true as const, view: await view(actor), message, ...(url ? { url } : {}) };
    },
    async join(actor: ClubActor, slug: string, input: unknown) {
      const form = validateJoin(input);
      const club = await repo.bySlug(validateSlug(slug));
      if (!club || !club.owner_approved || club.status !== 'approved' || !campusDirectoryLive(club.campus_id)) throw new ClubError('This club is not accepting requests yet.');
      if (club.owner_id === actor.id) throw new ClubError('Use a separate student test account for membership requests.');
      await paid(club);
      await repo.join(club.id, actor.id, actor.email, form.name, form.message);
      return 'Request saved privately for the club. Email is preview-only in this test build. Repeating a request does not create a duplicate.';
    },
    async review(actor: ClubActor, clubId: string, target: 'owner' | 'page' | 'event' | 'hide', version: number, eventId?: string) {
      if (!actor.reviewer) throw new ClubError('Reviewer access is required.');
      const club = await repo.byId(clubId);
      if (!club || club.owner_id === actor.id) throw new ClubError('A separate reviewer must check this club.');
      validateVersion(version);
      if (target === 'owner') {
        await repo.updateClub(club.id, version, { owner_approved: true, reviewed_by: actor.id });
      } else if (target === 'hide') {
        await repo.updateClub(club.id, version, { status: 'hidden', reviewed_by: actor.id });
      } else if (target === 'page' || target === 'event') {
        if (!campusDirectoryLive(club.campus_id)) throw new ClubError('This campus is not open yet.');
        await paid(club);
        if (target === 'page') await repo.updateClub(club.id, version, { status: 'approved', reviewed_by: actor.id });
        else {
          if (club.status !== 'approved') throw new ClubError('Approve the page before its events.');
          const event = (await repo.events(club.id)).find(x => x.id === eventId);
          if (!event || event.status !== 'pending') throw new ClubError('Only pending events can be approved.');
          validateEvent(event.content);
          await repo.updateEvent(event.id, club.id, version, { status: 'approved', reviewed_by: actor.id });
        }
      } else throw new ClubError('Invalid review action.');
    },
  };
}
