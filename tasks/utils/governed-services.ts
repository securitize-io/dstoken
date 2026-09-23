import { DSConstants } from '../../utils/globals';

export interface GovernedService {
  name: string;
  serviceId: number;
  /**
   * false = report the owner but never transfer it. Used for contracts that are shared across
   * tokens and administered outside this token's governance (see notes below).
   */
  transferable: boolean;
  note?: string;
}

/**
 * Every service id that can resolve to an Ownable `BaseDSContract`, i.e. one whose `owner()` is an
 * independent principal to `ROLE_MASTER` under `ServiceConsumer::onlyMaster` and therefore an
 * independent path to `_authorizeUpgrade`. Both `setup-governance` and `verify-governance` read
 * this single list so the verifier cannot drift from what the setup task actually moved.
 *
 * Deprecated ids are included deliberately: the `DEPRECATED_` prefix is a source-code label with no
 * on-chain effect, and live tokens still register several of them with contracts that hold
 * `ROLE_ISSUER` / `ROLE_TRANSFER_AGENT`. Ids that resolve to the zero address are skipped at
 * runtime, so listing one that a given token does not use costs nothing.
 *
 * IMPORTANT — this list is not a completeness guarantee. It can only find contracts reachable via
 * `getDSService`. A contract can hold a TrustService role with no service id registered at all
 * (`BulkOperator` on tokens deployed from this repo is exactly that case — `set-roles` grants it
 * `ROLE_ISSUER` but `set-services` never registers it). The only complete enumeration is a replay
 * of `DSTrustServiceRoleAdded` / `DSTrustServiceRoleRemoved`. See tasks/README.md.
 */
export const GOVERNED_SERVICES: GovernedService[] = [
  { name: 'REGISTRY_SERVICE', serviceId: DSConstants.services.REGISTRY_SERVICE, transferable: true,
    note: 'May be a shared Global Registry Service with its own admin — see tasks/README.md' },
  { name: 'COMPLIANCE_SERVICE', serviceId: DSConstants.services.COMPLIANCE_SERVICE, transferable: true },
  { name: 'WALLET_MANAGER', serviceId: DSConstants.services.WALLET_MANAGER, transferable: true },
  { name: 'LOCK_MANAGER', serviceId: DSConstants.services.LOCK_MANAGER, transferable: true },
  { name: 'DEPRECATED_PARTITIONS_MANAGER', serviceId: DSConstants.services.DEPRECATED_PARTITIONS_MANAGER, transferable: true },
  { name: 'COMPLIANCE_CONFIGURATION_SERVICE', serviceId: DSConstants.services.COMPLIANCE_CONFIGURATION_SERVICE, transferable: true },
  { name: 'TOKEN_ISSUER', serviceId: DSConstants.services.TOKEN_ISSUER, transferable: true },
  { name: 'WALLET_REGISTRAR', serviceId: DSConstants.services.WALLET_REGISTRAR, transferable: true,
    note: 'Owned by the wallet syncer on tokens deployed via bc-deployment-task-svc' },
  { name: 'DEPRECATED_OMNIBUS_TBE_CONTROLLER', serviceId: DSConstants.services.DEPRECATED_OMNIBUS_TBE_CONTROLLER, transferable: true },
  { name: 'TRANSACTION_RELAYER', serviceId: DSConstants.services.TRANSACTION_RELAYER, transferable: true },
  { name: 'DEPRECATED_TOKEN_REALLOCATOR', serviceId: DSConstants.services.DEPRECATED_TOKEN_REALLOCATOR, transferable: true },
  { name: 'BULK_OPERATOR', serviceId: DSConstants.services.BULK_OPERATOR, transferable: true },
  { name: 'DEPRECATED_ISSUER_MULTICALL', serviceId: DSConstants.services.DEPRECATED_ISSUER_MULTICALL, transferable: true },
  { name: 'DEPRECATED_TA_MULTICALL', serviceId: DSConstants.services.DEPRECATED_TA_MULTICALL, transferable: true },
  { name: 'REBASING_PROVIDER', serviceId: DSConstants.services.REBASING_PROVIDER, transferable: true },
  { name: 'BLACKLIST_MANAGER', serviceId: DSConstants.services.BLACKLIST_MANAGER, transferable: true },
  { name: 'DEPRECATED_SECURITIZE_SWAP', serviceId: DSConstants.services.DEPRECATED_SECURITIZE_SWAP, transferable: true,
    note: 'Gates _authorizeUpgrade on owner() alone — moving ROLE_MASTER grants the timelock nothing' },
  { name: 'GLOBAL_DENYLIST_MANAGER', serviceId: DSConstants.services.GLOBAL_DENYLIST_MANAGER, transferable: false,
    note: 'Shared across tokens, RBAC-administered outside this token — must never be transferred here' },
];
