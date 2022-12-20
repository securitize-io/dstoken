#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

if [ "$SOLIDITY_COVERAGE" = true ]; then
  ganache_port=7555
else
  ganache_port=7545
fi

ganache_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  # We define 15 accounts with balance 1M ether, needed for high-value tests.
  local accounts=(
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501201,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501202,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501203,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501204,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501205,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501206,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501207,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501208,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501209,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750120A,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750120B,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750120C,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750120D,1000000000000000000000000"
    --account="0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b750120E,1000000000000000000000000"
    --account="0xaa8205b4f9f44d079cf134cf711e414c6884900436f3a59d107d581327a131a8,1000000000000000000000000"
    --account="0x5e7fbdccbb54bdc6e9e29d6aec217450c419e36375ae2f413784148417873431,1000000000000000000000000"
    --account="0x03244fc96ed109bd4da3cd649e6de76c541887e56167fd064b5bb4e1a6e42b8d,1000000000000000000000000"
    --account="0x0242e06c02732ca3a1fa84ab1b54cd7c07c0dfc2d5cf97fa12f35a71ccd8b890,1000000000000000000000000"
    --account="0x031d88de2b2ea65de89a903672db3cc55ebe3d1f1a286fd5bfca5f817d89ddef,1000000000000000000000000"
    --account="0x2b29c59557492822acec82a52762040d83e73de5f61070268f96bcaf482bc993,1000000000000000000000000"
    --account="0x79ce4f8266bc3f706dd5589064c43535a72f0babe193eeb4eaeccbb477a72ce2,1000000000000000000000000"
    --account="0x740d5cfa467d5a457a18a08cb3e7a76c6b28c138b3a65304d29ae3d7c991a88b,1000000000000000000000000"
    --account="0x2a7db695dcfcf134dca537239c48875fa2e6a8055557d28cf93e345faafc4955,1000000000000000000000000"
    --account="0xd595193a6417d6cea5aa28b19a11d15b29344ed9f4a62d17b96d508a266ba634,1000000000000000000000000"
  )

  if [ "$SOLIDITY_COVERAGE" = true ]; then
    node_modules/.bin/testrpc-sc --gasLimit 0xfffffffffff --port "$ganache_port" "${accounts[@]}"> /dev/null &
  else
    node_modules/.bin/ganache --gasLimit 0xfffffffffff --port "$ganache_port" "${accounts[@]}"> /dev/null &
  fi

  ganache_pid=$!
}

if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
fi

if [ "$SOLC_NIGHTLY" = true ]; then
  echo "Downloading solc nightly"
  wget -q https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/soljson-nightly.js -O /tmp/soljson.js && find . -name soljson.js -exec cp /tmp/soljson.js {} \;
fi

if [ "$SOLIDITY_COVERAGE" = true ]; then
  node_modules/.bin/solidity-coverage

  if [ "$CONTINUOUS_INTEGRATION" = true ]; then
    cat coverage/lcov.info | node_modules/.bin/coveralls
  fi
else
  node_modules/truffle/build/cli.bundled.js test "$@"
fi
