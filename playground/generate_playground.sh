#!/bin/bash

# FrontEnd - EMI composition
nebulae compose-ui development --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/nebulae-pyxis/emi --frontend-id=emi --output-dir=/Users/sebastianmolano/NebulaE/Projects/pyxis/ms-civica-card/playground/emi  --setup-file=/Users/sebastianmolano/NebulaE/Projects/pyxis/ms-civica-card/etc/mfe-setup.json

# API - GateWay composition
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=https://github.com/nebulae-pyxis/sales-gateway --api-id=sales-gateway --output-dir=/Users/sebastianmolano/NebulaE/Projects/pyxis/ms-civica-card/playground/sales-gateway  --setup-file=/Users/sebastianmolano/NebulaE/Projects/pyxis/ms-civica-card/etc/mapi-setup.json
