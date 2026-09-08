#!/usr/bin/env bash
# One-time Azure resource provisioning for this app (docs/decisions/0009-azure-over-aws.md).
# Not run by CI — CI only *updates* these resources to new images
# (.github/workflows/ci.yml's `deploy` job). Run this yourself, once, before
# the first deploy. Requires the Azure CLI installed and `az login` already done.
#
# Usage: fill in the variables below, then: bash scripts/provision-azure.sh
set -euo pipefail

# --- Fill these in ---
RESOURCE_GROUP="advportfolio-rg"
LOCATION="eastus"                       # pick a region close to your visitors
ACR_NAME="advportfolioacr"               # must be globally unique, lowercase, alphanumeric only
DB_SERVER_NAME="advportfolio-db"         # must be globally unique
DB_ADMIN_USER="advportfolio"
DB_ADMIN_PASSWORD="CHANGE_ME_TO_A_REAL_SECRET"   # 8+ chars, upper/lower/digit/symbol
REDIS_NAME="advportfolio-redis"          # must be globally unique
ENVIRONMENT_NAME="advportfolio-env"
# ---------------------

echo "==> Resource group"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

echo "==> Azure Container Registry"
az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --admin-enabled true

echo "==> PostgreSQL Flexible Server (with pgvector)"
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER_NAME" \
  --location "$LOCATION" \
  --admin-user "$DB_ADMIN_USER" \
  --admin-password "$DB_ADMIN_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0-255.255.255.255   # tighten to Container Apps' outbound IPs once known
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$DB_SERVER_NAME" \
  --database-name advportfolio
# Allow-list the vector extension (ADR-0003), then CREATE EXTENSION happens
# via your normal Drizzle migrations, not here.
az postgres flexible-server parameter set \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$DB_SERVER_NAME" \
  --name azure.extensions --value vector

echo "==> Azure Cache for Redis"
az redis create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$REDIS_NAME" \
  --location "$LOCATION" \
  --sku Basic --vm-size c0

echo "==> Container Apps environment"
az containerapp env create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ENVIRONMENT_NAME" \
  --location "$LOCATION"

echo "==> Placeholder Container Apps (app + worker) — CI will push real images and update these on first deploy"
ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)

az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --name advportfolio-app \
  --environment "$ENVIRONMENT_NAME" \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 3000 --ingress external \
  --min-replicas 1 --max-replicas 2

az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --name advportfolio-worker \
  --environment "$ENVIRONMENT_NAME" \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --min-replicas 1 --max-replicas 1

echo "==> Container Apps Job for migrations (triggered manually by CI, not scheduled)"
az containerapp job create \
  --resource-group "$RESOURCE_GROUP" \
  --name advportfolio-migrate \
  --environment "$ENVIRONMENT_NAME" \
  --trigger-type Manual \
  --replica-timeout 300 \
  --image mcr.microsoft.com/k8se/quickstart:latest

echo
echo "Done. Now:"
echo "1. Set DATABASE_URL / REDIS_URL as secrets on advportfolio-app, advportfolio-worker, and advportfolio-migrate"
echo "   (az containerapp secret set / --set-env-vars — see docs/deployment.md)."
echo "2. Grab the ACR admin credentials (az acr credential show --name $ACR_NAME) and the app's FQDN"
echo "   (az containerapp show --name advportfolio-app -g $RESOURCE_GROUP --query properties.configuration.ingress.fqdn)"
echo "   for the GitHub secrets/variables below."
