#!/bin/bash

target="wasm32-unknown-unknown"
profile="wasm-release"

set -e
cd wasm

for pkg in *
do
  echo "build-wasm.sh: $pkg"
  wasm_name="${pkg//-/_}" # Replace - with _
  # Compile to wasm
  cargo build -p $pkg --target $target --profile $profile
  # Convert to component + move to assets dir
  wasm-tools component new ../target/$target/$profile/$wasm_name.wasm -o ../assets/scripts/$wasm_name.wasm
done