// A client that answers each operation from its own queue of results, in order. The port never rejects, so an exhausted
// queue throws synchronously rather than returning a rejected promise.
import type { MissionStatusClient, ReadOp, Result } from '../../src/client/port';

export type Queues = { [Op in ReadOp]?: Result<Op>[] };

export function createSequencedClient(queues: Queues): MissionStatusClient {
  const answer = (op: ReadOp) => (): Promise<never> => {
    const queue = queues[op] as Result<ReadOp>[] | undefined;
    const next = queue?.shift();
    if (!next) throw new Error(`sequenced client: ${op} queue exhausted`);
    return Promise.resolve(next) as Promise<never>;
  };
  return {
    getProject: answer('getProject'),
    listMissions: answer('listMissions'),
    getMission: answer('getMission'),
    getWorkPackage: answer('getWorkPackage'),
    getWorkPackageDetail: answer('getWorkPackageDetail'),
    listArtifacts: answer('listArtifacts'),
    getArtifactContent: answer('getArtifactContent'),
    getDriftReport: answer('getDriftReport'),
    listOpsInvocations: answer('listOpsInvocations'),
    subscribe: () => () => undefined,
    connection: { state: 'connected', onChange: () => () => undefined },
  } satisfies MissionStatusClient;
}
