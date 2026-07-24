#!/usr/bin/env bash
set -euo pipefail

DB=sellbyowner-prod
PROJECT=ai-workout-generator-hub

create_idx() {
  local col="$1"
  shift
  echo "Creating $col ..."
  gcloud firestore indexes composite create \
    --database="$DB" \
    --project="$PROJECT" \
    --collection-group="$col" \
    --query-scope=COLLECTION \
    --async \
    "$@" 2>&1 || true
}

create_idx messages \
  --field-config=field-path=sessionId,order=ascending \
  --field-config=field-path=timestamp,order=ascending

create_idx messages \
  --field-config=field-path=sessionId,order=ascending \
  --field-config=field-path=vehicleId,order=ascending \
  --field-config=field-path=timestamp,order=ascending

create_idx messages \
  --field-config=field-path=vehicleId,order=ascending \
  --field-config=field-path=timestamp,order=descending

create_idx messages \
  --field-config=field-path=buyerUid,order=ascending \
  --field-config=field-path=timestamp,order=descending

create_idx inquiries \
  --field-config=field-path=sellerId,order=ascending \
  --field-config=field-path=timestamp,order=descending

create_idx inquiries \
  --field-config=field-path=sellerId,order=ascending \
  --field-config=field-path=vehicleId,order=ascending \
  --field-config=field-path=timestamp,order=descending

create_idx inquiries \
  --field-config=field-path=vehicleId,order=ascending \
  --field-config=field-path=timestamp,order=ascending

create_idx listing_events \
  --field-config=field-path=vehicleId,order=ascending \
  --field-config=field-path=eventType,order=ascending \
  --field-config=field-path=timestamp,order=descending

create_idx listing_events \
  --field-config=field-path=vehicleId,order=ascending \
  --field-config=field-path=timestamp,order=ascending

create_idx saved_vehicles \
  --field-config=field-path=vehicleId,order=ascending \
  --field-config=field-path=savedAt,order=descending

create_idx clothing_listings \
  --field-config=field-path=sellerId,order=ascending \
  --field-config=field-path=createdAt,order=descending

create_idx clothing_listings \
  --field-config=field-path=sellerId,order=ascending \
  --field-config=field-path=status,order=ascending \
  --field-config=field-path=createdAt,order=descending

echo "==== LIST ===="
gcloud firestore indexes composite list --database="$DB" --project="$PROJECT"
