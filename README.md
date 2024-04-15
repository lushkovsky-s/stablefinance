# StableFinance API

## About

### Tech stack

Logic:
- Nest.JS - Backend framework
- Redis - Cache storage
- Postgres-compatible db (AWS Aurora) - Primary DB

Infrastructure:
- Docker - Contrainerization
- Kubernetes - Orchestration 
- ArgoCD - CI/CD for k8s, rollouts (canary with auto metrics)
- Istio - Service mesh
- Unleash - feature flags

3rd parties:
- Auth0 - auth provider
- QuickNode API - web3 webhooks (live updates)
- Covalent API - static web3 data

### Key requirements

- 99.95% Availability
- 200ms for request (e2e)

## Infrastucture/Deployment

### Pre-requirements

- Fill up .env (based on `.env.example`)
- Setup QuickNode destinations to receive webhooks (check `./quicknode-destinations.json`), pass it's ids

### ArgoCD

Install Argo CD to K8s cluster:
```
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Expose:
```
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Get `admin` password:
```
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}" | base64 -d; echo
```

Modify `k8s/argocd.yml` (set your URLs) and apply:
```
kubectl apply -f ./k8s/argocd.yaml -n argocd
```

### Argo Rollouts

Install:
```
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

## Development

### Maintenance

Audit dependencies:
```
pnpn run do-audit
```

SonarJS is included to eslint

Generate Prisma code:
```
npx prisma migrate dev
```

Do the migration:
```
npx prisma migrate dev
```

### TODO

* Exception filters
* Fater data with not Promise.all
* Improve /health and /ready 
* Gzip as pipe/intersector
* Conting quota for Covalent API (as exceeding is not blocking)
* Persistent external API rate limiter
* (Maybe) persistent cache between deployments
* i18n for wallet confirmation phrase
* k8s linter: dtree
