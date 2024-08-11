#!/bin/bash
set -e

UUID="qubes-window-borders@a.pebl.cc"
SOURCES=(
  ../COPYING
  $(cd "$UUID"; ls *.js *.css 2>/dev/null)
)

gnome-extensions pack --force "${SOURCES[@]/#/--extra-source=}" "$UUID"

