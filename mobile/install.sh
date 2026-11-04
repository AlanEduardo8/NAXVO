#!/usr/bin/env sh
set -e
npm install
npm run typecheck
printf '\nListo. Ejecuta: npx expo start --clear --lan\n'
