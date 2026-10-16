// A key to its port call. The controller's own copy of the mapping (the test harness keeps another); `cursor` is the page
// cursor of a chain's later pages and of a load-more. `mission-names` is page 1 of `listMissions` and takes no cursor.
import type { MissionStatusClient } from '../client/port';
import type { ResourceKey } from '../core/displayed';
import type { ReadResult } from '../core/scheduler';

export function readKey(client: MissionStatusClient, key: ResourceKey, cursor?: string): Promise<ReadResult> {
  const page = cursor === undefined ? {} : { query: { pageCursor: cursor } };
  switch (key.kind) {
    case 'project':
      return client.getProject({});
    case 'missions':
      return client.listMissions(page);
    case 'mission-names':
      return client.listMissions({});
    case 'mission':
      return client.getMission({ path: { missionId: key.missionId } });
    case 'wp':
      return client.getWorkPackage({ path: { missionId: key.missionId, wpId: key.wpId } });
    case 'wp-detail':
      return client.getWorkPackageDetail({ path: { missionId: key.missionId, wpId: key.wpId } });
    case 'artifacts':
      return client.listArtifacts({ path: { missionId: key.missionId } });
    case 'artifact':
      return client.getArtifactContent({ path: { missionId: key.missionId }, query: { path: key.path } });
    case 'drift':
      return client.getDriftReport(key.missionId === undefined ? {} : { query: { missionId: key.missionId } });
    case 'ops':
      return client.listOpsInvocations(page);
  }
}
