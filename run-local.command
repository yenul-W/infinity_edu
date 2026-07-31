#!/bin/bash
cd "$(dirname "$0")"
open "http://localhost:8080/index.html"
python3 -m http.server 8080
