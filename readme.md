
<img src="https://s3.us-east-2.amazonaws.com/securitize-public-files/securitize_logo+medium.png" alt="Securitize" width="200px"/>

# Digital Securities (DS) Protocol Token - DSToken v4

The DS Token is a reference implementation of Securitize's Digital Securities Protocol. This repository contains the latest version of the protocol (DSToken v4). 

The Digital Securities (DS) Protocol aims to enable and simplify regulation compliant lifecycle for securities on the blockchain, from issuance to trading. This v4 includes major improvements in compliance management, rebasing, and self-service functionality.

> More information on Securitize and its Digital Securities protocol can be found at [https://www.securitize.io](https://www.securitize.io).

The DS protocol is based on a set of components, or **services**, each implementing a different aspect required for the security environment.
The services are accessible from Web3-enabled applications. This allows their access by relevant actors, like exchanges, blockchain Web3-based applications, and platforms that 
provide additional services such as instant minting, swap and redemption flows.  

> More in-depth information about the structure of the DS Protocol can be found in its [Whitepaper](https://securitize.io/whitepapers).

This repository contains a reference implementation of an ERC-20 compatible security token (a DSToken) and associated contracts, together providing a full installation of a Digital Securities Blockchain environment with all its required services.

## Getting started

### Online articles

An overview of the DS Token components and reference implementation can be found in the following articles

- [DS Protocol — The Basic Elements](https://medium.com/securitize/ds-protocol-the-basic-elements-23fabcb5c85f)
- [DS Protocol — The Trust and Registry Services](https://medium.com/securitize/ds-protocol-the-trust-and-registry-services-91d1c4630f78)
- [DS Protocol — The Compliance Service](https://medium.com/securitize/ds-protocol-the-compliance-service-b6fe472d625d)

## The Digital Securities Token contracts

### Overview

The contracts in this repository are meant to be used either as they are, to provide a Compliance Service-controlled trading environment for a Securities Token Offering (STO), or as a base for creating of more specific tokens, implementing additional functionality.

The design and code of the DSToken implementation is based on the following principles:

- **Full Implementation** - An installation of the reference repository contains all the services required for issuance and trading - all of the essential DS Protocol services are implemented.
- **Fully Contained** - The reference implementation can be installed as a simple migration, or from a factory (to be provided in future code releases). In any case, it is a fully contained environment on the blockchain and does not require external contracts or the usage of a utility token.
- **Standard Compliant** - The resulting token is a strict superset of ERC20, enabling easy integration into exchanges and Ethereum wallets. More ERC standards will be implemented as they evolve.
- **Simple** - Trading securities on the Blockchain is a complicated subject. we have tried to keep our implementation as simple as possible to allow adopters to fully understand it, allowing for peace of mind and easy extendability.

### Main Components

### The Registry Service (/contracts/registry)

The Registry Service contracts implement a database of investors, along with their regulatory related data (accreditation, qualification, KYC/AML, etc) and their list of confirmed wallets. The personal data of the investors is stored hashed on the blockchain, to maintain privacy.

More detailed information about the types of data stored in the registry can be found in the posts linked above.

### The Compliance Service (/contracts/compliance)

The compliance service contracts enforce the actual compliance rules, and can be used by the token (and others) to make sure trades are done in a regulatory-compliant manner.
The following compliance service types are implemented:

- **Full/Normal** (ESComplianceServiceRegulated) - A full Compliance Service implementing transfer rules common to regulations worldwide, such as: restricting or limiting the number of retail investors, restricting investors from certain countries, requiring accredited investor status or preventing flowback of off-shore tokens.
- **Whitelist** (ESComplianceServiceWhitelisted.sol) - A simple Compliance Service restricting transfers only based on basic white-listing of investors.

More detailed information about the Compliance Service can be found in the tutorials above and in the posts linked above.

### The Trust Service (/contracts/trust)

The Trust Service is used to control which actors (or DS Apps) have access to the different functionalities of the contracts.

Each method in the DS Protocol has an assigned permission level, and requires a specific role to be authorized.<br/>
Each role can have one or more Ethereum accounts (or DSApps) assigned to it, and execution of the contract methods is limited only to wallets of their assigned role (or above).

The following roles are implemented:

- **Master** - Usually the owner of the token, used to perform token-wide changes and to designate other roles to Ethereum addresses.
- **Issuer** - An entity allowed to mint more tokens, burn tokens, etc.
- **Exchange** - An external exchange interfacing with the token. The exchange is allowed to register investors after having them pass proper KYC/AML and accreditation testing.
- **Transfer Agent (new in v4)** — Manages compliance rules and token-level configuration, including the ability to freeze/unfreeze the token. This separation ensures that issuance and compliance remain distinct, mirroring traditional securities operations.

### The DSToken (/contracts/token)

The DSToken is an ERC20 compliant token implementing the DS protocol. It uses the _Registry Service_ and the _Compliance Service_ to make sure its tokens can only reside in EVM wallets owned by authorized investors (taking into consideration the proper restrictions around KYC/AML validity, accredited investor status, etc.)

In addition to implementing the DS Protocol, the token also offers the following functionality (all limited to the _Issuer_ Role):

- **Issuance** - New tokens can be created (minted) and distributed to wallets.
- **Burning** - Tokens can be burned (destroyed).
- **Seizing** - Tokens can be seized from their owner's wallet, and moved to a specially designated Issuer wallet.
- **Locking** - The issuer is able to restrict the transfer (lock) tokens - either on issuance or on a later time.
  Tokens can be time-locked (for vesting scenarios, call scenarios, and others), or indefinitely locked (if required by the authorities) - in which case they can only be released by the issuer.
  A locked token may not be transferred by the wallet's owner to any other wallet.
- **Trade pausing** - Trading of the token can be paused and resumed by the _Master_ role.
## Other components

- **Proxy** - The main token contract is deployed behind a proxy, OpenZeppelin's ERC1967 implementation. This allows for seamless upgrade of a deployed token in case a new protocol version is required or a problem is found.
- **BulkOperator** - Operations can be sent in bulk (tokens issuances and wallet registrations) using the BulkOperator contract
- **Rebasing provider** - The protocol now includes a Rebasing feature, allowing token balances to adjust via a multiplier or formula to support use cases like dividend accrual, splits, and reverse splits efficiently.

### Installation

To install a full DSToken environment, clone this repository, then run:

```sh
npm install

# or if using yarn: yarn install

npx hardhat deploy-all --name <token name> --symbol <token symbol> --decimals <token decimals>
--compliance TYPE - compliance service type (REGULATED, PARTITIONED, WHITELISTED) - if omitted, REGULATED is selected

```

For example, to install a standard DSToken (with default compliance manager and lock manager), run:

```
npx hardhat deploy-all --network localhost --name ExampleToken --symbol EXM --decimals 18

```

This will install a full DSToken environment ready to be tested (or traded)

To run tests, run:

```
npm test
```

To verify DSToken, run:

```
npx hardhat verify-all --network {network} --token {dsTokenAddress}
```

Tests run on a local Hardhat node. A Hardhat node instance is launched if none is running when starting the test.

The migration process requires a lot of gas, which is potentially expensive depending on the network in use. We recommend running tests on local node instances.
The full token can of course be deployed to mainnet or testnet on any compatible EVM chain. 

### Deployment and migration

We created factory contracts to reduce gas costs significantly. Also, implementation contracts are reused across deployments to further reduce gas costs, 
and deployments are resilient to transaction failures. They can be resumed and retried after the last successful transaction.

#### DeploymentUtils

There are 3 types of functions:

- settings: It is possible to update the addresses of the implementation contracts.
- deployment: There are a set of methods to deploy proxy contracts, set implementation targets, and call initialize functions.
- Token deployment settings: Sets a token calling functions like setRoles, setDSServices and setCountriesCompliance in bulk mode.

The owner of the DeploymentUtils contract must be the **deployment wallet**.

There are deployments on different public networks.

- Avalanche Fuji Testnet: **0x63705379db29D008d1EBdB0F8e60aD89216927AF** Deployment Account DEV **0xd40D720b1cdC8AeD2a75489F219cA02faF45587C**
- Polygon Mumbai Testnet: **0x78da8F43717E0fb583028D8F5E2D7D67274Cf65C** Deployment Account DEV **0xD8559dfEd9300775a2DeF456c7BDa65310Ad21E6**
- Sepolia Testnet: **0xC68DFf4D8557727778143a68C66d11430bd9474C** Deployment Account DEV **0xD8559dfEd9300775a2DeF456c7BDa65310Ad21E6**

- First, set the addresses of the implementation contracts.

- **Settings functions**

```solidity
function setImplementationAddress(
  uint8 service,
  address implementationAddress
) public restricted;
function setImplementationAddresses(
  uint8[] memory services,
  address[] memory addresses
) public restricted;
```

## Roadmap

The **DSToken v4** release marks a major milestone in the evolution of the DS Protocol, introducing new roles, rebasing capabilities, and self-service features that improve operational efficiency and compliance management.
While the current implementation is live in production and integrated with issuers and partners, ongoing development continues to expand the protocol’s flexibility and automation.

The following initiatives are part of the current roadmap:
-	**Expanded Compliance Models** — Extend the compliance framework to support additional asset classes and adapt to jurisdiction-specific regulations.
-	**Advanced Rebasing Strategies** — Implement formula-based and performance-linked multipliers, enabling dynamic yield reflection and more sophisticated corporate-action handling.
-	**Managed DSApp Factories** — Provide fully managed factory contracts for streamlined deployment of DSApps and complete DS Protocol environments.
-	**Enhanced Reporting and Analytics** — Offer better visibility into rebased balances, capital flows, and compliance-related events.
-	**New DSApps** — Publish additional reference DSApps, alongside the already available: On-/Off-Ramp modules for instant subscriptions and redemptions, and the Bridge DSApp for seamless cross-chain asset transfers.

### Security audits

Independent audits of the current implementation were performed by [Cyfrin](audits/2025-10-10-cyfrin-securitize-dstoken-v4-2.1.pdf) and [Halborn](audits/2025-10-09-Halborn-DSToken_v4_SSC.pdf), and can be found in the /audits folder.  

### Issue Reporting

We would be grateful if reports on any security or other issues can be opened on this repository's issue tracker, or reported directly to us at <protocol@securitize.io>.

## Special Thanks

We would like to extend our thanks to all the wonderful people and projects whose work on the blockchain makes this project and others a reality.

The token code is heavily based on the wonderful base contracts done by the [OpenZeppelin](https://openzeppelin.org/) team (Thank you for that!).

Code and tests were built using the [Hardhat](https://hardhat.org/) framework.

## License

The DS Protocol and all of its contracts can be used under the [Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0) license terms.
