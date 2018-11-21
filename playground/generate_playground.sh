#!/bin/bash

# FrontEnd - EMI composition
nebulae compose-ui development --shell-type=FUSE2_ANGULAR --shell-repo=https://github.com/nebulae-pyxis/emi --frontend-id=emi --output-dir=/home/nesas-02/Projects/PYXIS/ms-civica-card/playground/emi  --setup-file=/home/nesas-02/Projects/PYXIS/ms-civica-card/etc/mfe-setup.json,/home/nesas-02/Projects/PYXIS/ms-business-management/etc/mfe-setup.json

# API - GateWay composition
nebulae compose-api development --api-type=NEBULAE_GATEWAY --api-repo=https://github.com/nebulae-pyxis/sales-gateway --api-id=sales-gateway --output-dir=/home/nesas-02/Projects/PYXIS/ms-civica-card/playground/sales-gateway  --setup-file=/home/nesas-02/Projects/PYXIS/ms-civica-card/etc/mapi-setup.json
