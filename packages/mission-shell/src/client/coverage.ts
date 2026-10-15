/**
 * Port coverage (FR-009): compares the operationIds the port maps (the values of CLIENT_OPERATIONS) with the operationIds
 * of the contract (routes.json). Each mismatch is one message, `coverage: missing operation <id>` for a contract
 * operation the port lacks and `coverage: extra operation <id>` for a port entry the contract lacks, sorted by id.
 */
export function operationCoverage(portOperationIds: readonly string[], contractOperationIds: readonly string[]): string[] {
  const port = new Set(portOperationIds);
  const contract = new Set(contractOperationIds);
  const missing = [...contract].filter((id) => !port.has(id)).map((id) => `coverage: missing operation ${id}`);
  const extra = [...port].filter((id) => !contract.has(id)).map((id) => `coverage: extra operation ${id}`);
  return [...missing.sort(), ...extra.sort()];
}
