<img src="https://s3.us-east-2.amazonaws.com/securitize-public-files/securitize_logo+medium.png" alt="Securitize" width="200px"/>
# Digital Securities (DS) Protocol Token

The DS Token is a reference implementation of Securitize's Digital Securities Protocol.

The Digital Securities (DS) Protocol aims to enable and simplify regulation compliant lifecycle for securities on the blockchain, from issuance to trading.

> More information on Securitize and its Digital Securities protocol can be found at [https://www.securitize.io](https://www.securitize.io).

The DS protocol is based on a set of components, or **services**, each implementing a different aspect required for the security environment.
The services are accesible from web3 enabled applications. This allows their access by relevant actors, like exchanges, as well as Blockchain based applications, **DSApps**, that provide additional services such as dividend distribution or voting.

> More in-depth information about the structure of the DS Protocol can be found in its [Whitepaper](https://securitize.io/uploads/whitepapers/DS-Protocolv1.0.pdf).

This repository contains a reference implementation of an ERC-20 compatible security token (a DSToken) and associated contracts, together providing a full installation of a Digital Securities Blockchain environment with all its required services.

## Getting started

### Overview

An overview of the DS Token components and reference implementation can be found in the following articles

- part 1
- part 2
- part 3
- part 4

### Installation

To install a full DSToken environment, clone this repository, then run:

```sh
npm install

# or if using yarn: yarn install

npm run migrate -- --name <token name> --symbol <token symbol> --decimals <token decimals>
--reset - re-deploys the contracts
--no_registry - skip registry service
--compliance TYPE - compliance service type (NOT_REGULATED,WHITELIST,NORMAL) - if omitted, NORMAL is selected
--lock_manager TYPE - lock manager type (WALLET,INVESTOR) - if omitted, INVESTOR is selected
--owners - a space seperated string of owner addresses that own the multisig wallet
--required_confirmations - the number of required confirmations to execute a multisig wallet transaction
--chain_id - Used to create and sign EIP-712 messages. Used to deploy TransactionRelayer and MultiSig contracts. 1 (Ethereum Mainnet) by default.
--no_omnibus_wallet - skip omnibus wallet
--omnibus_wallet - the address of the omnibus wallet in the registry
--partitioned - add partitions support
```

For example, to install a standard DSToken (with default compliance manager and lock manager), run:

```
npm run migrate --network ganache --name ExampleToken --symbol EXM --decimals 18 --owners "0x648fC6c064d96ca6671a627D7a62C11C6CEff594 0xB640F84605Fa887653b0752FF937AB2E64FB2715" --required_confirmations 2 --omnibus_wallet '648fC6c064d96ca6671a627D7a62C11C6CEff594'

```

This will install a full DSToken environment ready to be tested (or traded)

To run tests, run:

```
npm test
```

to run integration tests, run:

```
npm run integration
```

Tests run on a local Ganache server. A Ganache instance is launched if no instance is running when starting the test.

The migration process requires a lot of gas, so we currently recommend running tests on local RPC instances.
The full token can of course be deployed to mainnet or testnet.

## The Digitial Securities Token contracts

### Overview

The contracts in this repository are meant to be used either as they are, to provide a Compliance Service-controlled trading environment for a Securities Token Offering (STO), or as a base for creating of more specific tokens, implementing additional functionality.

The design and code of the DStoken implementation is based on the following principles:

- **Full Implementation** - An installation of the reference repository contains all the services required for issuance and trading - all of the essential DS Protocol services are implemented.
- **Fully Contained** - The reference implementation can be installed as a simple migration, or from a factory (to be provided in future code releases). in any case it is a fully contained environment in the blockchain and does not require external contracts or the usage of a utility token.
- **Standard Compliant** - The resulting token is a strict superset of ERC20, enabling easy integration into exchanges and Ethereum wallets. More ERC standards will be implemented as they evolve.
- **Simple** - Trading securities on the Blockchain is a complicated subject. we have tried to keep our implementation as simple as possible to allow adopters to fully understand it, allowing for peace of mind and easy extendability.

### Main Components

### The Registry Service (/contracts/registry)

The Registry Service contracts implement a database of investors, along with their regulatory related data (accreditation, qualification, KYC/AML, etc) and their list of confirmed wallets. The personal data of the investors is stored hashed on the blockchain, to maintain privacy.

More detailed information about the types of data stored in the registry can be found in the posts linked above.

### The Compliance Service (/contracts/compliance)

The compliance service contracts enforce the actual compliance rules, and can be used by the token (and others) to make sure trades are done in a regulatory-compliant manner.
The following compliance service types are implemented:

- **Full/Normal** (ESComplianceServiceRegulated) - A full Compliance Service implementing transfer rules common to regulations wordwide, such as: restricting or limiting the number of retail investors, restricting investors from certain countries, requiring accredited investor status or preventing flowback of off-shore tokens.
- **WhiteList** (ESComplianceServiceWhitelisted.sol) - A simple Compliance Service restricting transfers only based on basic white-listing of investors.
- **NotRegulated** (ESComplianceServiceNotRegulated.sol) - A simple Compliance Service for tokens allowing all trading by default, with a manual locking option.

More detailed information about the Compliance Service can be found in the tutorials above and in the posts linked above.

### The Trust Service (/contracts/trust)

The Trust Service is used to control which actors (or DS Apps) have access to the different functionalities of the contracts.

Each method in the DS-Protocol has an assigned permission level, and requires a specific role to be authorized.<br/>
Each role can have one or more Ethereum accounts (or DSApps) assigned to it, and execution of the contract methods is limited only to wallets of their assigned role (or above).

The following roles are implemented:

- **Master** - Usually the owner of the token, used to perform token-wide changes and to designate other roles to Ethereum addresses.
- **Issuer** - An entity allowed to mint more tokens, burn tokens, etc.
- **Exchange** - An external exchange interfacing with the token. The exchange is allowed to register investors after having them pass proper KYC/AML and accreditation testing.

### The DSToken (/contracts/token)

The DSToken is an ERC20 compliant token implementing the DS protocol. It uses the _Registry Service_ and the _Compliance Service_ to make sure its tokens can only reside in ethereum wallets owned by authorized investors (taking into consideration the preper restrictions around KYC/AML validity, accredited investor status, etc.)

In addition to implementing the DS Protocol, the token also offers the following functionality (all limited to the _Issuer_ Role):

- **Issuance** - New tokens can be created (minted) and distributed to wallets.
- **Burning** - Tokens can be burned (destroyed).
- **Seizing** - Tokens can be seized from their owner's wallet, and moved to a specially designated Issuer wallet.
- **Locking** - The issuer is able to restrict the transfer (lock) tokens - either on issuance or on a later time.
  Tokens can be time-locked (for vesting scenarios, call scenarios, and others), or indefinitely locked (if required by the authorities) - in which case they can only be released by the issuer.
  A locked token may not be transferred by the wallet's owner to any other wallet.
- **Enumeration** - The token supports the enumeration of all wallets containing it currently (and using the investor registry, all the investors holding it at a specific point in time).
- **Trade pausing** - Trading of the token can be paused and resumed by the _Master_ role.

### OmnibusTBE
The OmnibusTBE allows issuing tokens to investors without a wallet registered in the system to a shared wallet while keeping track of ownership in the platform, and proper investor count in the blockchain.

### Deployment and migration
We created factory contracts to reduce significantly gas cost. This allows us to reuse the implementations of contracts.

### Off-chain Integration (RFE Protocol)
We provide a reference implementation of some aspects of the protocol dealing with off-chain transactions (for example, allow issuers to receive new investor data).

### Token Issuance** 
We have developed a process for auto-deployment contracts.

### DSClient - Command-line utilities
We provide a command-line tools and libraries to facilitate the interaction with the DS Protocol, like tools to add investors to investor registry or to simplify the off-chain generation of investor IDs from investor information.

### Other components

- **Proxy** - The main token contract is deployed behind a proxy, using the proxy-delegate pattern. This allows for seamless upgrade of a deployed token in case a new protocol version is required or a problem is found.
- **MultiSig Wallet** - We have developed a MultiSig Wallet following this [implementation](https://github.com/christianlundkvist/simple-multisig). This allows us to offer higher level of security. 

## Roadmap and open issues

There are many components of the whitepaper which are not fully implemented and several aspects (mainly around deployment) which are not fully optimized.
That said, We consider the reference implementation ready for production usage and are actively integrating it with security exchanges.

The following items are currently being worked on as part of the reference implementation road-map:

- **Registry Service Federation** - We aim to provide a Registry Service implementation that supports federation, so that certain entities can keep global investor registries that can be shared accross token issuances.
- **Self Service Factories** - We aim to add fully managed factory contracts on the blockchain, allowing web-based creation of a full DSProtocol environment.
- **Dividend issuance and voting** - We plan to write standard DSApps for reference implementation of dividend distribution and voting capabilities.

### Security audit

An audit of the reference implementation was performed by [CoinFabrik](https://www.coinfabrik.com) and can be found [here]().

An audit of the reference MultiSig Wallet implementation can be found [here](https://github.com/christianlundkvist/simple-multisig/blob/master/audit.pdf).

### Issue Reporting

We would be grateful if reports on any security or other issues can be opened on this repository's issue tracker, or reported directly to us at <protocol@securitize.io>.

## Special Thanks

We would like to extend our thanks to all the wonderful people and projects whose work on the blockchain makes this project and others a reality.

The token code is heavily based on the wonderful base contracts done by the [Open Zeppelin](https://openzeppelin.org/) team (Thank you for that!).

The final leg of our development process has been supported by the [Open Finance Network](https://www.openfinance.io) team, to ensure the validity of the DS Protocol in the context of trading operations via an exchange environment.

Code and tests were done using the [Truffle](http://truffleframework.com/) framework.

## License

The DS Protocol and all of its contracts can be used under the MIT license terms.
