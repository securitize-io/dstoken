<img src="https://s3.us-east-2.amazonaws.com/securitize-public-files/securitize_logo+medium.png" alt="Securitize" width="200"/>
# Digital Securities (DS) Protocol Token

The DS Token is a reference implementation of Securitize's Digital Securities Protocol.

The digital securities (DS) protocol aims to enable and simplify regulation compliant securities trading on the block chain. It is based on 

> More information on Securitize and its Digital Securities protocol can be found at [https://www.securitize.io](https://www.securitize.io).

The DS protocol is based on a set of componenets, or **services**, each implementing a different aspect required for creating the trading environment.
The services are both from web3 enabled applications, providing for example exchanges capabilities and by Blockchain based applications, called **DSApps**, providing additional services such as dividend distribution and voting.

> More in-depth information about the structure of the DS protocol can be found in the [Whitepaper](https://securitize.io/uploads/whitepapers/DS-Protocolv1.0.pdf).

This repository contains a reference implementation of an ERC-20 compatible security token (a DSToken) and associated contracts, together providing a full installation of a Digital Securities Blockchain environment with all its required services.
    
## Getting started

### Tutorial

Tutorial info for using the DSToken reference implementation can be found here

- part 1
- part 2
- part 3
- part 4

### Installation

To install a full DSToken environment, clone this repository, then run: 

```sh
npm install

# or if using yarn: yarn install

truffle migrate [OPTIONS] --name <token name> --symbol <token symbol> --decimals <token decimals>

Options:
--reset - re-deploys the contracts
--no_registry - skip registry service
--compliance - compliance type (NOT_REGULATED,WHITELIST,NORMAL) - if omitted, NORMAL is selected

```


This will install a full DSToken environment ready to be tested (or traded)

To run tests, simply run:

```
npm test
```

Tests run on a local Ganache server. A Ganache instance is launched if no instance is running when starting the test. 

As the migration currently requires a lot of gas heavy we currently recommend running tests on local RPC instances.
The full token can of course be deployed to main or testnet.
## The Digitial Securities Token contracts

### Overview
The contracts in this repository are meant to be used either as they are, to provide a regulation compliant trading environment for a Securities Token Offering (STO), or as a base for creating of more specific tokens, implementing additional functionality. 

The design and code of the DStoken implementation is based on the following principles: 

- **Full Implementation** - An installation of the reference repository contains all the services required for regulatory compliant trading - all of the essential DS Protocol services are implemented. 
- **Fully contained** - The reference implementation can be installed as a simple migration, or from a factory (soon). in any case it is a fully contained environment in the blockchain and does not require external contracts or the usage of a utility token.   
- **Standard compliant** - The resulting token is a strict superset of ERC20, enabling easy integration into exchanges and Ethereum wallets. More ERC standards will be implemented as they evolve.
- **Simple** - Trading securities on the Blockchain is a complicated subject. we have tried to keep our implementation as simple as possible to allow adopters to fully understand it, allowing for piece of mind and easy extendability. 
### Main Components

### The Investor Registry (/contracts/registry)
The investors registry service contracts implement a database of investors, along with their regulatory related data (accreditation, qualification, KYC/AML, etc) and their list of confirmed wallets. The personal data of the investors is stored hashed on the blockchain, to maintain privacy.

More detailed information about the types of data stored in the registry can be found in the tutorials above.

### The Compliance Service (/contracts/compliance)
The compliance service contracts enforce the actual compliance rules, and can be used by the token (and others) to make sure trades are done in a regulatory-compliant manner.
The following compliance service types are implemented:

- **Full/Normal** (ESComplianceServiceRegulated) - A full compliance service implementing the REG-D and REG-S regulation, for US and other investors.
- **WhiteList** (ESComplianceServiceWhitelisted.sol) - A simple compliance service allowing white listing of investors. 
- **NotRegulated** (ESComplianceServiceNotRegulated.sol) - a simple compliance service for tokens allowing all trading by default, with a manual locking option.   

More detailed information about the compliance service can be found in the tutorials above and in the whitepaper.


### The Trust Service (/contracts/trust)
The Trust service is used to control who has access to the different functionalities of the contracts.

Each method in the DS-Protocol is indicated by a permission level, and assigned to a specific role.<br/>
Each role can have one or more Ethereum accounts (or DSApps) assigned to it, and execution of the contract methods is limited only to wallets of their assigned role (or above).

The following roles are implemented:

- **Master** - Usually the owner of the token, used to perform token-wide changes and to designate other roles to Ethereum addresses.
- **Issuer** - An entity allowed to mint more tokens, burn tokens, etc.
- **Exchange** - An external exchange interfacing with the token. The exchange is allowed to register investors after having them pass proper KYC/AML and accreditation testing.

### The DSToken (/contracts/token)
The DSToken is an ERC20 compliant token implementing the DS protocol. It uses the *Investor Registry* and the *Compliance Service* to make sure it always tokens can only reside in ethereum wallets owned by certified people (Taking into account KYC/AML, Accredited investor)

In addition to implementing the DS Protocol, the token also offers the following functionality (all limited to the *Issuer* Role):

- **Issuance** - New tokens can be created (minted) and distributed to wallets.
- **Burning** - Tokens can be burned (destroyed).
- **Seizing** - Tokens can be seized from their owner's wallet, and moved to a specially designated Issuer wallet.
- **Locking**  - The issuer is able to restrict the transfer (lock) tokens - either on issuance or on a later time. 
Tokens can be time-locked (for vesting scenarios, call scenarios, and others), or indefinitely locked (if required by the authorities) - in which case they can only be released by the issuer.
 A locked token may not be transferred by the wallet's owner to any other wallet.
- **Enumeration** - The token supports the enumeration of all wallets containing it currently (and using the investor registry, all the investors holding it at a specific point in time). 
- **Trade pausing** - Trading of the token can be paused and resumed by the *master* role.

### Other components

- **Proxy** - The main token contract is deployed behind a proxy, using the proxy-delegate pattern. This allows for seamless upgrade of a deployed token in case a new version comes out or a problem is found.
- **Eternal Storage** - All the operational data used by the contracts is stored using the "Eternal Storage" pattern ([ERC930](https://github.com/ethereum/EIPs/issues/930)).
Used correctly, this means that a any component in the system can be upgraded or replaced in a production environment, and its runtime-data will remain correct without the need of a complex migration.


## Roadmap and open issues

This is the first release of the DS token protocol implementation. 
There are many components of the whitepaper which are not fully implemented and several aspects(mainly around deployment) which are not fully optimized.
that said, We consider the reference implementation ready for production usage and are actively integrating it with security exchanges.

The following items currently have high priority in the reference implementation road-map:

- **Deployment and migration** - Current deployment gas cost and time is high. it is planned to create factory contracts to reduce those significantly.
- **Off-chain Integration (RFE Protocol)** - We aim to provide a reference implementation of some aspects of the protocol dealing with off-chain transactions (for example, hold non-hashed investor data).
- **Token Issuance** - We aim to add a DSApp for easy token issuance based on CSV files.
- **Self Service Factories** - we aim to add fully managed factory contracts on the blockchain, allowing web-based creation of a full DSProtocol environment.
- **Dividend issuance and voting** - we plan to write standard DSApps implementing dividend distribution and voting capabilities.  
### Security  audit

An audit of the reference implementation was performed by [CoinFabrik](https://www.coinfabrik.com) and can be found [here]().

### Issue Reporting 
We would be grateful if reports on any security or other issues can be opened on this repository's issue tracker, or reported directly to us at <protocol@securitize.io>.

## Special Thanks

We would like to extend our thanks to all the wonderful people and projects whose work on the blockchain makes this project and others a reality.

The token code is heavily based on the wonderful base contracts done by the [Open Zeppelin](https://openzeppelin.org/) team (Thank you for that!).
 
Code and tests were done using the [Truffle](http://truffleframework.com/) framework. 

## License

The DS Protocol and all of its contracts can be used under the MIT license terms. 